#!/usr/bin/env bash
# client.sh: send only new lines after last_log_time

BASE_URL="http://<backend-url>:8000"
CONFIG="$HOME/.log_protect.conf"
CURRENT_YEAR=$(date +"%Y")

# month map for awk
declare -A MONTH_MAP=(
  [Jan]=01 [Feb]=02 [Mar]=03 [Apr]=04 [May]=05 [Jun]=06
  [Jul]=07 [Aug]=08 [Sep]=09 [Oct]=10 [Nov]=11 [Dec]=12
)

ensure_config() {
  if [ ! -f "$CONFIG" ]; then
    echo "No config found. Registering new user..."
    read -p "Enter desired username: " USERNAME
    read -p "Enter your email: " EMAIL
    read -p "Enter your contact number: " CONTACT

    RESPONSE=$(curl -s -X POST "$BASE_URL/register_user" \
      -H "Content-Type: application/json" \
      -d '{"username":"'$USERNAME'","email":"'$EMAIL'","contact_no":"'$CONTACT'"}')
    echo "Registration Response: $RESPONSE"

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
  
  awk -v last="$LAST_TS" -v year="$CURRENT_YEAR" \
      -v map_jan="${MONTH_MAP[Jan]}" -v map_feb="${MONTH_MAP[Feb]}" \
      -v map_mar="${MONTH_MAP[Mar]}" -v map_apr="${MONTH_MAP[Apr]}" \
      -v map_may="${MONTH_MAP[May]}" -v map_jun="${MONTH_MAP[Jun]}" \
      -v map_jul="${MONTH_MAP[Jul]}" -v map_aug="${MONTH_MAP[Aug]}" \
      -v map_sep="${MONTH_MAP[Sep]}" -v map_oct="${MONTH_MAP[Oct]}" \
      -v map_nov="${MONTH_MAP[Nov]}" -v map_dec="${MONTH_MAP[Dec]}" \
      'BEGIN {
         # build array for months
         m["Jan"]=map_jan; m["Feb"]=map_feb; m["Mar"]=map_mar;
         m["Apr"]=map_apr; m["May"]=map_may; m["Jun"]=map_jun;
         m["Jul"]=map_jul; m["Aug"]=map_aug; m["Sep"]=map_sep;
         m["Oct"]=map_oct; m["Nov"]=map_nov; m["Dec"]=map_dec;
       }
       {
         # parse month, day, time from line
         month=$1; day=sprintf("%02d", $2); time=$3;
         iso = year "-" m[month] "-" day "T" time;
         if (iso > last) print $0;
       }' /var/log/linux.log | \
  curl -s -X POST "$BASE_URL/ingest_logs" \
    -H "Content-Type: text/plain" \
    -H "X-Device-ID: $DEVICE_ID" \
    --data-binary @-
}

ensure_config
while true; do
  send_new_logs "$DEVICE_ID"
  sleep 10
done