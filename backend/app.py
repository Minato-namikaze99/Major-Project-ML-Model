import re
import os
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client
from pymongo import MongoClient
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

# Supabase setup
env_url = os.getenv("SUPABASE_URL")
env_key = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(env_url, env_key)
try:
    supabase.table("user_table").select("user_id").limit(1).execute()
    print("✅ Connected to Supabase")
except Exception as e:
    print("❌ Supabase connection failed:", e)

# MongoDB setup
mongo_url = os.getenv("MONGODB_URL")
mongo_client = MongoClient(mongo_url)
try:
    mongo_client.server_info()
    print("✅ Connected to MongoDB")
except Exception as e:
    print("❌ MongoDB connection failed:", e)

memdb = mongo_client.major_project
ip_memory = memdb.memory

app = FastAPI()

class RegisterUser(BaseModel):
    username: str
    email: EmailStr
    contact_no: str

# Helper functions

def extract_datetime(line):
    m = re.search(r"^(\w{3} \d{1,2} \d{2}:\d{2}:\d{2})", line)
    return m.group(1) if m else None

def extract_ip(line):
    m = re.search(r"rhost=([\w\.-]+)", line)
    return m.group(1) if m else None

def within_10_seconds(t1, t2):
    if not t1 or not t2: return False
    return abs((t1 - t2).total_seconds()) <= 10

# Core classifier

def classify_line(line):
    dt = extract_datetime(line)
    log_dt = datetime.strptime(dt, "%b %d %H:%M:%S") if dt else None
    ip = extract_ip(line)
    anomaly = "No"
    log_type = "Normal"

    if "sshd" in line and "authentication failure" in line:
        log_type = "Auth Failure"
        if ip and log_dt:
            rec = ip_memory.find_one({"ip": ip})
            if rec:
                if within_10_seconds(log_dt, rec["last_seen"]):
                    count = rec["count"] + 1
                    ip_memory.update_one({"ip": ip}, {"$set": {"last_seen": log_dt, "count": count}})
                    if count > 3:
                        anomaly = "Yes"
                else:
                    ip_memory.update_one({"ip": ip}, {"$set": {"last_seen": log_dt, "count": 1}})
            else:
                ip_memory.insert_one({"ip": ip, "last_seen": log_dt, "count": 1})

        if ip and log_dt:
            history = memdb.failed_attempts.find_one({"ip": ip})
            times = history["times"] if history else []
            times = [t for t in times if (log_dt - datetime.strptime(t, "%Y-%m-%d %H:%M:%S")).total_seconds() <= 86400]
            times.append(log_dt.strftime("%Y-%m-%d %H:%M:%S"))
            memdb.failed_attempts.update_one({"ip": ip}, {"$set": {"times": times}}, upsert=True)
            if len(times) > 20:
                anomaly = "Yes"

    if "sshd" in line and "Accepted password" in line:
        log_type = "Successful Login"
        if ip:
            rec = memdb.failed_attempts.find_one({"ip": ip})
            if rec and len(rec.get("times", [])) > 3:
                anomaly = "Yes"
                memdb.failed_attempts.delete_one({"ip": ip})

    if ip and log_dt:
        now = datetime.utcnow()
        memdb.access_attempts.insert_one({"ip": ip, "timestamp": now})
        recent = list(memdb.access_attempts.find({"timestamp": {"$gte": now - timedelta(seconds=5)}}))
        unique_ips = len(set(r["ip"] for r in recent))
        if unique_ips > 5:
            anomaly = "Yes"

    if any(k in line for k in ["ALERT", "exited abnormally"]):
        log_type = "Service Issue"
        anomaly = "Yes"

    return anomaly, log_type

# Endpoints

@app.get("/")
def root():
    return {"message": "Hello, this is the backend of our major project SIEM. Made by Indrajit."}

@app.post("/register_user")
def register_user(p: RegisterUser):
    exists = supabase.table("user_table").select("user_id").eq("user_name", p.username).execute()
    if exists.data:
        raise HTTPException(400, "Username taken")
    u = supabase.table("user_table").insert({
        "user_name": p.username, "email": p.email, "contact_no": p.contact_no, "devices": 0
    }).execute()
    user_id = u.data[0]["user_id"]
    d = supabase.table("device_table").insert({"user_id": user_id}).execute()
    device_id = d.data[0]["device_id"]
    supabase.table("user_table").update({"devices":1}).eq("user_id", user_id).execute()
    return {"device_id": device_id}

@app.get("/device/{device_id}/last_log_time")
def last_log_time(device_id: str):
    r = supabase.table("log_table").select("log_time").eq("device_id", device_id)
    r = r.order("created_at", desc=True).limit(1).execute()
    return r.data[0]["log_time"] if r.data else "1970-01-01 00:00:00"

@app.post("/ingest_logs")
def ingest_logs(logs: str, x_device_id: str = Header(...)):
    lines = logs.splitlines()
    rows = []
    for L in lines:
        status, ltype = classify_line(L)
        dt = extract_datetime(L) or ""
        date, time = dt.split()[0], dt.split()[1] if dt else (None, None)
        rows.append({
            "logs": L, "ip_address": extract_ip(L), "log_date": date,
            "log_time": time, "log_type": ltype,
            "anomaly_detected": status, "device_id": x_device_id
        })
        if status == "Yes":
            send_warning_email(x_device_id, L)
    supabase.table("log_table").insert(rows).execute()
    return {"inserted": len(rows)}

@app.get("/device/{device_id}/logs")
def get_device_logs(device_id: str):
    return supabase.table("log_table").select("*").eq("device_id", device_id).execute().data

@app.get("/user/{user_id}/devices")
def get_user_devices(user_id: str):
    return supabase.table("device_table").select("*").eq("user_id", user_id).execute().data

@app.post("/send_warning")
def send_warning_email(device_id: str, log_line: str):
    dev = supabase.table("device_table").select("user_id").eq("device_id", device_id).execute().data[0]
    usr = supabase.table("user_table").select("email").eq("user_id", dev["user_id"]).execute().data[0]
    msg = EmailMessage()
    msg["Subject"] = "Security Alert"
    msg["From"] = "secops@example.com"
    msg["To"] = usr["email"]
    msg.set_content(f"Anomaly detected:\n{log_line}")
    with smtplib.SMTP("localhost") as s:
        s.send_message(msg)
    return {"status":"sent"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)