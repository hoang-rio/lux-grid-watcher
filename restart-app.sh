echo "Stopping app.py..."
PID=$(ps | grep app.py | grep -v grep | awk '{print $1}')
if [ -z "$PID" ]; then
    echo "No process to kill"
else
    echo "Killing process $PID"
    kill $PID
fi
echo "Starting app.py..."
nohup python app.py &