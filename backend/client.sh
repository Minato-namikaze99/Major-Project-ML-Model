#!/usr/bin/env bash
# Usage: ./client.sh

BASE_URL="https://your-backend.example.com"
CONFIG="$HOME/.log_protect.conf"

ensure_config() {
  if [ ! -f "$CONFIG" ]; then
    echo "No config found. Registering new user..."
    read -p "Enter desired username: " USERNAME
    read -p "Enter your email: " EMAIL
    read -p "Enter your contact number: " CONTACT

    RESPONSE=$(curl -s -X POST "$BASE_URL/register_user" \
      -H "Content-Type: application/json" \
      -d '{"username":"'$USERNAME'","email":"'$EMAIL'","contact_no":"'$CONTACT'"}')

    DEVICE_ID=$(echo "$RESPONSE" | jq -r .device_id)
    echo "DEVICE_ID=$DEVICE_ID" > "$CONFIG"
    echo "Registered as $USERNAME, device ID: $DEVICE_ID"
  else
    source "$CONFIG"
  fi
}

send_new_logs() {
  DEVICE_ID=$1
  LAST_TS=$(curl -s "$BASE_URL/device/$DEVICE_ID/last_log_time")
  NEW_LOGS=$(awk -v last="$LAST_TS" '$0 > last' /var/log/auth.log)
  if [ -z "$NEW_LOGS" ]; then
    return
  fi

  curl -s -X POST "$BASE_URL/ingest_logs" \
    -H "Content-Type: text/plain" \
    -H "X-Device-ID: $DEVICE_ID" \
    --data-binary "$NEW_LOGS"
}

ensure_config
while true; do
  send_new_logs "$DEVICE_ID"
  sleep 10
done