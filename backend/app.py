import re
import os
from typing import List
from fastapi import FastAPI, Header, HTTPException, Body, Request
from typing import Optional
from pydantic import BaseModel, EmailStr
from supabase import create_client
from pymongo import MongoClient
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.message import EmailMessage
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from collections import defaultdict

from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from fastapi import HTTPException
import uuid


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

service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase_svc = create_client(env_url, service_key)

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

# bcrypt context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: The plain text password to hash

    Returns:
        The hashed password as a string

    Raises:
        Exception: If hashing fails
    """
    try:
        # Use a simpler hash configuration for bcrypt to avoid compatibility issues
        return pwd_context.hash(password)
    except Exception as e:
        print(f"Error in hash_password: {str(e)}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        # Try a more basic hash method if the default fails
        try:
            # Force bcrypt scheme explicitly
            return CryptContext(schemes=["bcrypt"], bcrypt__rounds=12).hash(password)
        except Exception as e2:
            print(f"Fallback hashing also failed: {str(e2)}")
            raise


class RegisterUser(BaseModel):
    username: str
    email: EmailStr
    contact_no: str


class RegisterAdmin(BaseModel):
    admin_name: Optional[str]
    email: EmailStr
    contact_no: Optional[str]
    password: str


# Helper functions


def extract_datetime(line):
    m = re.search(r"^(\w{3} \d{1,2} \d{2}:\d{2}:\d{2})", line)
    return m.group(1) if m else None


def extract_ip(line):
    m = re.search(r"rhost=([\w\.-]+)", line)
    return m.group(1) if m else None


def within_10_seconds(t1, t2):
    if not t1 or not t2:
        return False
    return abs((t1 - t2).total_seconds()) <= 10


# Core classifier


def classify_line(line, device_id=None):
    dt = extract_datetime(line)
    log_dt = datetime.strptime(dt, "%b %d %H:%M:%S") if dt else None
    ip = extract_ip(line)
    anomaly = "No"
    log_type = "Normal"

    if ip and device_id:
        suspicious_check = (
            supabase.table("suspicious_ip")
            .select("ip_addresses")
            .eq("ip_addresses", ip)
            .eq("device_id", device_id)
            .execute()
        )
        if suspicious_check.data:
            return "Yes", "Auth Failure"

    if "sshd" in line and "authentication failure" in line:
        log_type = "Auth Failure"
        if ip and log_dt:
            rec = ip_memory.find_one({"ip": ip})
            if rec:
                if within_10_seconds(log_dt, rec["last_seen"]):
                    count = rec["count"] + 1
                    ip_memory.update_one(
                        {"ip": ip}, {"$set": {"last_seen": log_dt, "count": count}}
                    )
                    if count > 3:
                        anomaly = "Yes"
                else:
                    ip_memory.update_one(
                        {"ip": ip}, {"$set": {"last_seen": log_dt, "count": 1}}
                    )
            else:
                ip_memory.insert_one({"ip": ip, "last_seen": log_dt, "count": 1})

        if ip and log_dt:
            history = memdb.failed_attempts.find_one({"ip": ip})
            times = history["times"] if history else []
            times = [
                t
                for t in times
                if (log_dt - datetime.strptime(t, "%Y-%m-%d %H:%M:%S")).total_seconds()
                <= 86400
            ]
            times.append(log_dt.strftime("%Y-%m-%d %H:%M:%S"))
            memdb.failed_attempts.update_one(
                {"ip": ip}, {"$set": {"times": times}}, upsert=True
            )
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
        recent = list(
            memdb.access_attempts.find(
                {"timestamp": {"$gte": now - timedelta(seconds=5)}}
            )
        )
        unique_ips = len(set(r["ip"] for r in recent))
        if unique_ips > 5:
            anomaly = "Yes"

    if any(k in line for k in ["ALERT", "exited abnormally"]):
        log_type = "Service Issue"
        anomaly = "Yes"

    return anomaly, log_type


# ShortTermMemory


class ShortTermMemory:
    def __init__(self, threshold=0.01, ttl_limit=2):
        self.memory = {}  # { ip: (score, ttl) }
        self.threshold = threshold
        self.ttl_limit = ttl_limit

    def update(self, ip_scores):
        for ip, score in ip_scores.items():
            if score >= self.threshold:
                self.memory[ip] = (score, self.ttl_limit)

    def decay(self):
        to_remove = []
        for ip, (score, ttl) in self.memory.items():
            ttl -= 1
            if ttl <= 0:
                to_remove.append(ip)
            else:
                self.memory[ip] = (score, ttl)
        for ip in to_remove:
            del self.memory[ip]

    def get_suspicious_ips(self):
        return self.memory


# Global memory instance
memory = ShortTermMemory()


def process_logs(logs_batch):
    total_logs = len(logs_batch)
    if total_logs == 0:
        return []

    ip_anomaly_counts = defaultdict(int)
    total_anomalies = 0

    for log in logs_batch:
        ip = log.get("ip")
        if log.get("anomaly_detected", "No").lower() == "yes":
            ip_anomaly_counts[ip] += 1
            total_anomalies += 1

    ip_scores = {ip: count / total_logs for ip, count in ip_anomaly_counts.items()}

    memory.update(ip_scores)
    memory.decay()

    result = []
    for ip, (score, ttl) in memory.get_suspicious_ips().items():
        # Get device_ids where this IP exists
        r = (
            supabase.table("log_table")
            .select("device_id")
            .eq("ip_address", ip)
            .execute()
        )
        device_ids = set(row["device_id"] for row in r.data)
        for device_id in device_ids:
            supabase.table("suspicious_ip").insert(
                {
                    "ip_addresses": ip,
                    "score": round(score, 4),
                    "ttl": ttl,
                    "device_id": device_id,
                }
            ).execute()
        result.append({"ip": ip, "score": round(score, 4), "ttl": ttl})

    return result


# Endpoints


@app.get("/")
def root():
    return {
        "message": "Hello, this is the backend of our major project SIEM. Made by Indrajit."
    }


@app.post("/register_user")
def register_user(p: RegisterUser):
    exists = (
        supabase.table("user_table")
        .select("user_id")
        .eq("user_name", p.username)
        .execute()
    )
    if exists.data:
        raise HTTPException(400, "Username taken")
    u = (
        supabase.table("user_table")
        .insert(
            {
                "user_name": p.username,
                "email": p.email,
                "contact_no": p.contact_no,
                "devices": 0,
            }
        )
        .execute()
    )
    user_id = u.data[0]["user_id"]
    d = supabase.table("device_table").insert({"user_id": user_id}).execute()
    device_id = d.data[0]["device_id"]
    supabase.table("user_table").update({"devices": 1}).eq("user_id", user_id).execute()
    return {"device_id": device_id}


@app.get("/device/{device_id}/last_log_time")
def last_log_time(device_id: str):
    r = supabase.table("log_table").select("log_time").eq("device_id", device_id)
    r = r.order("created_at", desc=True).limit(1).execute()
    return r.data[0]["log_time"] if r.data else "1970-01-01 00:00:00"


@app.post("/ingest_logs")
def ingest_logs(
    logs: str = Body(..., media_type="text/plain"), x_device_id: str = Header(...)
):
    lines = logs.splitlines()
    print(lines)
    rows = []
    current_year = datetime.now().year

    # Get latest timestamp from Supabase for this device
    latest = (
        supabase.table("log_table")
        .select("log_date", "log_time")
        .eq("device_id", x_device_id)
        .order("log_date", desc=True)
        .order("log_time", desc=True)
        .limit(1)
        .execute()
        .data
    )

    last_ts = None
    print("latest:", latest)
    if latest:
        last_ts = datetime.strptime(
            f"{latest[0]['log_date']} {latest[0]['log_time']}", "%Y-%m-%d %H:%M:%S"
        )
        print("last_ts:", last_ts)

    for L in lines:
        status, ltype = classify_line(L, x_device_id)
        dt_str = extract_datetime(L)
        if dt_str:
            try:
                log_dt = datetime.strptime(
                    f"{current_year} {dt_str}", "%Y %b %d %H:%M:%S"
                )
                print("log_dt:", log_dt)
                if last_ts and log_dt <= last_ts:
                    continue  # Skip older logs

                date_str = log_dt.strftime("%Y-%m-%d")
                time_str = log_dt.strftime("%H:%M:%S")
            except ValueError:
                continue  # Skip logs with bad datetime
        else:
            continue  # Skip logs with no datetime

        rows.append(
            {
                "logs": L,
                "ip_address": extract_ip(L),
                "log_date": date_str,
                "log_time": time_str,
                "log_type": ltype,
                "anomaly_detected": status,
                "device_id": x_device_id,
                "suspicious_check": False,
            }
        )

    if rows:
        supabase.table("log_table").insert(rows).execute()

    # Trigger process_logs only if 1000+ logs are unprocessed
    res_count = (
        supabase.table("log_table")
        .select("log_id")
        .eq("suspicious_check", False)
        .execute()
    )
    if res_count.data and len(res_count.data) > 1000:
        unprocessed = (
            supabase.table("log_table")
            .select("*")
            .eq("suspicious_check", False)
            .limit(2000)
            .execute()
            .data
        )
        suspicious_ips = process_logs(unprocessed)
        for log in unprocessed:
            supabase.table("log_table").update({"suspicious_check": True}).eq(
                "log_id", log.get("log_id")
            ).execute()
        supabase.table("suspicious_ip").delete().neq("sus_id", 0).execute()
        for entry in suspicious_ips:
            ip = entry["ip"]
            r = (
                supabase.table("log_table")
                .select("device_id")
                .eq("ip_address", ip)
                .execute()
            )
            device_ids = set(item["device_id"] for item in r.data)
            for dev_id in device_ids:
                supabase.table("suspicious_ip").insert(
                    {
                        "ip_addresses": ip,
                        "score": entry["score"],
                        "ttl": entry["ttl"],
                        "device_id": dev_id,
                    }
                ).execute()

    return {"inserted": len(rows)}


@app.get("/device/{device_id}/logs")
def get_device_logs(device_id: str):
    return (
        supabase.table("log_table")
        .select("*")
        .eq("device_id", device_id)
        .execute()
        .data
    )


@app.get("/user/{user_id}/devices")
def get_user_devices(user_id: str):
    return (
        supabase.table("device_table").select("*").eq("user_id", user_id).execute().data
    )


@app.post("/send_warning")
def send_warning_email(device_id: str, log_line: str):
    dev = (
        supabase.table("device_table")
        .select("user_id")
        .eq("device_id", device_id)
        .execute()
        .data[0]
    )
    usr = (
        supabase.table("user_table")
        .select("email")
        .eq("user_id", dev["user_id"])
        .execute()
        .data[0]
    )
    msg = MIMEMultipart("alternative")
    sender_email = os.getenv("EMAIL_FROM")
    sender_app_password = os.getenv("EMAIL_APP_PASSWORD")
    msg["Subject"] = "🚨 Security Alert: Suspicious Activity Detected On Your Device!"
    msg["From"] = sender_email
    msg["To"] = usr["email"]
    msg["Reply-To"] = sender_email
    msg["Date"] = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S +0000")

    # Plain-text version
    text = f"""\
Hello,

We detected a suspicious authentication failure on your device ({device_id}):

{log_line}

If this was not you, please review your server's security immediately.

Regards,
Your Security Team
"""

    # HTML version (inline CSS for compatibility)
    html = f"""\
<html>
  <body style="font-family:Arial,sans-serif;line-height:1.4;color:#333;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:20px;">
        <img src="https://media.istockphoto.com/id/1266892400/vector/shield-and-sword-icon-vector-logo-design-template.jpg?s=612x612&w=0&k=20&c=864Re4Wdc8F6ww7UyWgEcDuKycVEIHub6_OBaRbogog=" alt="Logo" width="120"/>
      </td></tr>
      <tr>
        <td style="background:#f9f9f9;padding:20px;border-radius:8px;">
          <h2 style="color:#c00;">Security Alert</h2>
          <p>We’ve detected a suspicious authentication failure on your device <strong>{device_id}</strong>:</p>
          <blockquote style="background:#fff;padding:10px;border-left:4px solid #c00;">
            <pre style="margin:0;">{log_line}</pre>
          </blockquote>
          <p>If you did not initiate this, please log in to your control panel or contact our support team immediately.</p>
          <p>—<br>Your Security Team</p>
        </td>
      </tr>
    </table>
  </body>
</html>
"""

    # Attach both parts
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    msg.attach(part1)
    msg.attach(part2)
    # msg.set_content(f"Anomaly detected:\n{log_line}")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, sender_app_password)
        server.send_message(msg)
    return {"status": "sent"}


@app.get("/admin/logs_summary")
def get_admin_logs_summary(admin_id: str, device_id: Optional[str] = None):
    if not admin_id:
        raise HTTPException(400, "Missing admin_id in query parameters")

    # Step 1: Get device_ids for this admin
    devices = (
        supabase.table("device_table")
        .select("device_id")
        .eq("admin_id", admin_id)
        .execute()
        .data
    )
    all_device_ids = [d["device_id"] for d in devices]

    if not all_device_ids:
        return {"logs": [], "suspicious_ip": []}

    # Step 2: Determine which device_ids to query
    if device_id:
        if device_id not in all_device_ids:
            raise HTTPException(
                403, "This device_id does not belong to the given admin_id"
            )
        device_ids_to_use = [device_id]
    else:
        device_ids_to_use = all_device_ids

    # Step 3: Fetch logs
    logs_query = (
        supabase.table("log_table")
        .select(
            "logs, ip_address, log_date, log_time, log_type, anomaly_detected, device_id"
        )
        .in_("device_id", device_ids_to_use)
        .execute()
    )
    logs_data = logs_query.data if logs_query.data else []

    # Step 4: Fetch suspicious IPs
    sus_query = (
        supabase.table("suspicious_ip")
        .select("ip_addresses, device_id")
        .in_("device_id", device_ids_to_use)
        .execute()
    )
    suspicious_data = sus_query.data if sus_query.data else []

    return {"logs": logs_data, "suspicious_ip": suspicious_data}


@app.post("/process-logs")
async def receive_logs(logs: List[dict]):
    suspicious_ips = process_logs(logs)
    return {"suspicious_ips": suspicious_ips}


@app.post("/create_admin")
async def create_admin(admin: RegisterAdmin):
    try:
        # Debug output for diagnosing issues
        print(f"Starting admin creation process for email: {admin.email}")

        # Check if we have the service role key
        if not service_key:
            print("ERROR: Missing SUPABASE_SERVICE_ROLE_KEY in environment")
            raise HTTPException(
                status_code=500,
                detail="Server configuration error: Missing service role key",
            )

        # 1️⃣ Check for existing email
        try:
            exists = (
                supabase_svc.table("admin_table")
                .select("admin_id")
                .eq("email", admin.email)
                .execute()
            )
            print(f"Existing check result: {exists.data}")
        except Exception as e:
            print(f"Error checking for existing admin: {str(e)}")
            import traceback

            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500, detail=f"Failed to check if admin exists: {str(e)}"
            )

        if exists.data:
            raise HTTPException(
                status_code=400, detail="Admin with this email already exists"
            )

        # 2️⃣ Hash the password
        try:
            print(f"Hashing password for admin: {admin.email}")
            hashed_pwd = hash_password(admin.password)
            print("Password hashing successful")
        except Exception as e:
            print(f"Error hashing password: {str(e)}")
            import traceback

            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=500, detail=f"Error hashing password: {str(e)}"
            )

        # 3️⃣ Insert using the service-role client with transaction
        try:
            # Generate UUID first
            admin_id = str(uuid.uuid4())
            print(f"Generated admin_id: {admin_id}")

            # Prepare the data
            admin_data = {
                "admin_id": admin_id,
                "admin_name": admin.admin_name,
                "email": admin.email,
                "contact_no": admin.contact_no,
                "password": hashed_pwd,
            }

            print(f"Attempting to insert admin with data: {admin_data}")

            # Verify the data before insertion
            if not all(
                [admin_data["admin_id"], admin_data["email"], admin_data["password"]]
            ):
                raise ValueError("Missing required fields")

            # Perform the insertion
            print("Executing insert operation...")
            result = supabase_svc.table("admin_table").insert(admin_data).execute()

            print(f"Insert operation result: {result}")

            # Verify the insertion was successful
            if not result.data:
                print("WARNING: No data returned from insertion")
                raise Exception("No data returned from insertion")

        except Exception as e:
            print(f"Error inserting admin: {str(e)}")
            import traceback

            print(f"Traceback: {traceback.format_exc()}")

            # Attempt to clean up if insertion partially succeeded
            try:
                if "admin_id" in locals():
                    print(f"Attempting to clean up admin_id: {admin_id}")
                    supabase_svc.table("admin_table").delete().eq(
                        "admin_id", admin_id
                    ).execute()
            except Exception as cleanup_error:
                print(f"Error during cleanup: {str(cleanup_error)}")

            raise HTTPException(
                status_code=500, detail=f"Error creating admin: {str(e)}"
            )

        print(f"Admin created successfully with ID: {admin_id}")
        return {
            "admin_id": admin_id,
            "message": "Admin created successfully",
        }
    except HTTPException as he:
        # Re-raise HTTP exceptions as they are already properly formatted
        raise he
    except Exception as e:
        # Log unexpected errors
        print(f"Unexpected error in create_admin: {str(e)}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, detail=f"Unexpected error creating admin: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
