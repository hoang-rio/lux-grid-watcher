source venv/bin/activate
PID=$(ps | grep app.py | grep -v grep | awk '{print $1}')
if [ -z "$PID" ]; then
    echo "app.py is not running."
else
    echo "Stopping app.py with process id $PID..."
    kill $PID
fi
echo "Starting app.py..."
nohup nice -n 100 python app.py &