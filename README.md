# Major Project - SIEM

A full-stack SIEM-style solution for real-time SSH intrusion detection using system logs and alerting system.  
- **Backend**: Python + FastAPI + Supabase + MongoDB  
- **Client**: Bash script that tails `/var/log/auth.log` and POSTs new entries  
- **Frontend**: React (Vite), Supabase-backed dashboard  

---

## 📁 Repository Layout

```text
.
├── backend
│ ├── app.py # FastAPI application
│ ├── client.sh # Bash client for production servers
│ └── localpc.sh # Bash client for local testing
├── frontend
│ └── project # Vite + React source code
├── figures
│ └── Supabase ER.png # Supabase schema ER diagram
├── misc files
│ ├── batches # CSVs of log batches for ML experiments
│ └── notebook files # Jupyter notebooks & CSV exports
└── requirements.txt # Python dependencies for backend
```

---

## 🗄️ Database Schema

![Supabase ER Diagram](figures/Supabase%20ER.png)

- **user_table** / **admin_table**: users & administrators  
- **device_table**: links each device (server) to a user & admin  
- **log_table**: stores every ingested log line, parsed `log_date`, `log_time`, `log_type`, `anomaly_detected`, and `suspicious_check` flag  
- **suspicious_ip**: currently tracked suspicious IPs per device  
- **MongoDB (`ip_memory`, `failed_attempts`, `access_attempts`)**: short-term in-memory state for rate/window checks  

---

## ⚙️ Prerequisites

- **Python 3.10+**  
- **Node 16+ & npm** (for frontend)  
- **Supabase** project & CLI (optional)  
- **MongoDB** (local or Atlas)  
- **SMTP** credentials (Gmail App Password or transactional email service)  
- **jq** (for Bash client JSON parsing)

---

## 🔧 Backend Setup

1. **Create & activate virtual environment**
```
python3 -m venv .venv
source .venv/bin/activate
cd Major Project - SIEM
```

> In case of any issues with Virtual environment, you can refer to these links here - [link1](https://www.w3schools.com/python/python_virtualenv.asp) and [link2](https://docs.python.org/3/library/venv.html)

2. **Install dependencies**
```
pip install -r ../requirements.txt
```

2. **Enter `backend/`**  
```
cd backend
```
 
3. **Copy env template**
```
cp .env.example .env
```
Now, edit .env to your credentials

4. **Run the FastAPI server**
```
python3 app.py
```

> For a Health-check, GET the IP Address and Port of the backend

## 🚀 Client Setup
1. **Make scripts executable**
```
chmod +x client.sh localpc.sh
```

2. **Edit client.sh**
Set your backend URL at the top of the `client.sh` file:
```
BASE_URL="http://<your-backend-host>:8000"
```

3. **Run on your server**
Using the command: 
```
./client.sh
```
On first run you’ll be prompted for username, email, contact → registers in Supabase → stores DEVICE_ID in ~/.log_protect.conf.

> For Local testing, use localpc.sh (which points to a local log file):

## 🌐 Frontend Setup

1. **Enter frontend/project/**
```
cd frontend/project
```

2. **Install dependencies** & run
```
npm install
```

3. **Copy env template**
```
cp .env.example .env
```
Now, edit .env to your credentials and the backend URL.

4. **Run the frontend**
```
npm run dev
```

Dashboard available at http://localhost:5173 (or shown in console).

## 📝 Usage Summary
1. Onboard a user/device: POST /register_user

2. Ingest logs: client.sh → POST /ingest_logs

3. List logs: GET /device/{device_id}/logs

4. Admin view: GET /admin/logs_summary?admin_id=...

5. Automatic alerting: /send_warning sends styled HTML+text emails