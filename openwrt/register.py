#!/usr/bin/env python
import json
import cgi
from os import path

print("content-type: application/json")
print("")
DEVICES_FILE = '/mnt/sda1/Programs/grid-watcher/devices.json'
ret_data = {
    "is_success": False,
    "message": "Unknow error",
    "device_count": 0
}
try:
    form = cgi.FieldStorage()
    if "token" in form:
        req_token = form["token"].value  # Get token from post field 'token'
        if path.exists(DEVICES_FILE):
            with open(DEVICES_FILE) as fd:
                devices_json = list(json.loads(fd.read()))
                if req_token in devices_json:
                    ret_data["is_success"] = False
                    ret_data["message"] = "Device already register"
                else:
                    with open(DEVICES_FILE, 'w') as fw:
                        fw.write(json.dumps(devices_json))
                        devices_json.append(req_token)
                        ret_data["is_success"] = True
                        ret_data["message"] = "Device register success"
                        ret_data["device_count"] = len(devices_json)
    else:
        ret_data["is_success"] = False
        ret_data["message"] = "Missing required parameter 'token'"
except Exception as e:
    ret_data["message"] = "Got exception %s".format(e)
print(json.dumps(ret_data))
