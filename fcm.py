import logging
from os import path
import json
import requests
import requests.auth
from google.oauth2 import service_account
import google.auth.transport.requests
from threading import Thread

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

CHANNEL_ON_GRID = "111"
CHANNEL_OFF_GRID = "222"


class FCMThread(Thread):
    __config: dict
    __logger: logging.Logger
    __title: str
    __body: str
    __device: str
    __is_grid_connected: bool
    valid_device: bool = True

    def __init__(self, logger: logging.Logger, config: dict, title: str, body: str, device: str, is_grid_connected: bool):
        super(FCMThread, self).__init__()
        self.__config = config
        self.__logger = logger
        self.__title = title
        self.__body = body
        self.__device = device
        self.__is_grid_connected = is_grid_connected

    def _get_access_token(self):
        """Retrieve a valid access token that can be used to authorize requests.
        :return: Access token.
        """
        credentials = service_account.Credentials.from_service_account_file(
            self.__config["FCM_ADMIN_KEY_FILE"], scopes=SCOPES)
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        return credentials.token

    def __send_notify(self, title: str, body: str, device: str, is_grid_connected: bool):
        if not path.exists(self.__config["FCM_ADMIN_KEY_FILE"]):
            self.__logger.warning("Missing FCM_ADMIN_KEY_FILE")
            return
        if 'FCM_PROJECT' not in self.__config or self.__config["FCM_PROJECT"] == "":
            self.__logger.warning("Missing FCM_PROJECT")
            return
        self.__logger.info(
            "Send notify with title: %s and body: %s to %s", title, body, device)
        access_token = self._get_access_token()
        req = requests.post(
            f"https://fcm.googleapis.com/v1/projects/{self.__config['FCM_PROJECT']}/messages:send",
            json={
                "message": {
                    "notification": {
                        "title": title,
                        "body": body
                    },
                    "data": {
                        "title": title,
                        "body": body,
                        "is_grid_connected": "1" if is_grid_connected else "0"
                    },
                    "android": {
                        "priority": "HIGH",
                        "direct_boot_ok": True,
                        "notification": {
                            "channel_id": CHANNEL_ON_GRID if is_grid_connected else CHANNEL_OFF_GRID,
                            "notification_priority": "PRIORITY_MAX",
                            "visibility": "PUBLIC",
                            "default_sound": False,
                            "default_vibrate_timings": False,
                            "vibrate_timings": ["0.1s", "1s", "0.1s", "1s", "0.1s"],
                            "default_light_settings": True,
                            "sound": "has_grid.mp3" if is_grid_connected else "lost_grid.mp3"
                        },
                    },
                    "apns": {
                        "payload": {
                            "aps": {
                                "sound": "has_grid.aiff" if is_grid_connected else "lost_grid.aiff",
                                "badge": 1
                            }
                        },
                    },
                    "token": device,
                },
            },
            headers={
                'Authorization': 'Bearer ' + access_token,
                'Content-Type': 'application/json; UTF-8',
            }
        )
        self.valid_device = req.status_code != 404
        self.__logger.info("FCM send to device: %s", device)
        self.__logger.info("FCM Status code: %s", req.status_code)
        self.__logger.info("FCM Result: %s", req.text)

    def run(self):
        log_prefix = "ON" if self.__is_grid_connected else "OFF"
        self.__logger.info(
            f"{log_prefix} [{self.__device}]: Start send notify")
        self.__send_notify(self.__title, self.__body,
                           self.__device, self.__is_grid_connected)
        self.__logger.info(
            f"{log_prefix} [{self.__device}]: Finish send notify")


class FCM():
    __config: dict
    __logger: logging.Logger
    __fcm_threads: list[FCMThread]

    def __init__(self, logger: logging.Logger, config: dict) -> None:
        self.__config = config
        self.__logger = logger
        self.__fcm_threads = []

    def __get_devices(self):
        if path.exists(self.__config["DEVICE_IDS_JSON_FILE"]):
            with open(self.__config["DEVICE_IDS_JSON_FILE"], "r") as fr:
                return json.loads(fr.read())
        return []

    def __save_device(self, devices: list[str]):
        with open(self.__config["DEVICE_IDS_JSON_FILE"], "w") as fw:
            fw.write(json.dumps(devices))

    def __post_send_notify(self, devices: list[str]):
        valid_devices: list[str] = []
        for idx, t in enumerate(self.__fcm_threads):
            t.join()
            if t.valid_device:
                valid_devices.append(devices[idx])

        if len(valid_devices) != len(devices):
            self.__save_device(valid_devices)

    def ongrid_notify(self):
        self.__fcm_threads = []
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.info("ON: No device to notify")
        else:
            for device in devices:
                t = FCMThread(
                    self.__logger,
                    self.__config,
                    "Đã có điện lưới.",
                    "Nhà đã có điện lưới có thể sử dụng điện không giới hạn.",
                    device,
                    True)
                self.__fcm_threads.append(t)
                t.start()
            self.__post_send_notify(devices)

    def offgrid_notify(self):
        self.__fcm_threads = []
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.info("OFF: No device to notify")
        else:
            for device in devices:
                t = FCMThread(
                    self.__logger,
                    self.__config,
                    "Mất điện lưới.",
                    "Nhà đã mất điện lưới cần hạn chế sử dụng thiết bị điện công suất lớn như bếp từ, bình nóng lạnh.",
                    device,
                    False
                )
                self.__fcm_threads.append(t)
                t.start()
            self.__post_send_notify(devices)
