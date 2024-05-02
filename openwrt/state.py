#!/usr/bin/env python
import json
from os import path

print("content-type: application/json")
print("")
STATE_FILE = "/mnt/sda1/Programs/grid-watcher/grid_connect_state.ini"
HISTORY_FILE = "/mnt/sda1/Programs/grid-watcher/history.json"

is_connected = False
if path.exists(STATE_FILE):
    with open(STATE_FILE) as fd:
        is_connected = fd.read() == 'True'
history = []
if path.exists(HISTORY_FILE):
    with open(HISTORY_FILE) as f_history:
        history = json.loads(f_history.read())
print(json.dumps({"is_connected": is_connected, "history": history}))
