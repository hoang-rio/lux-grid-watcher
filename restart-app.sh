PID=$(ps | grep app.py | grep -v grep | awk '{print \$1}')
echo $PID
kill $PID
nohup python app.py & >> /dev/null