import logging
from os import path
import json
import requests
from google.oauth2 import service_account
import google.auth.transport.requests
from threading import Thread
import sqlite3

from web_socket_client import WebSocketClient

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]

CHANNEL_ON_GRID = "111"
CHANNEL_OFF_GRID = "222"
CHANNEL_WARN = "333"


class FCMThread(Thread):
    __config: dict
    __logger: logging.Logger
    __title: str
    __body: str
    __device: str
    __is_grid_connected: bool
    __channel_id: str
    __sound: str
    valid_device: bool = True

    def __init__(self, logger: logging.Logger, config: dict, title: str, body: str, device: str, is_grid_connected: bool, channel_id: str = CHANNEL_ON_GRID):
        super(FCMThread, self).__init__()
        self.__config = config
        self.__logger = logger
        self.__title = title
        self.__body = body
        self.__device = device
        self.__is_grid_connected = is_grid_connected
        self.__channel_id = channel_id
        self.__sound = "warning" if channel_id == CHANNEL_WARN else "has_grid" if is_grid_connected else "lost_grid"

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
                        "is_grid_connected": "1" if is_grid_connected else "0",
                        "is_warning": "1" if self.__channel_id == CHANNEL_WARN else "0"
                    },
                    "android": {
                        "priority": "HIGH",
                        "direct_boot_ok": True,
                        "notification": {
                            "channel_id": self.__channel_id,
                            "notification_priority": "PRIORITY_MAX",
                            "visibility": "PUBLIC",
                            "default_sound": False,
                            "default_vibrate_timings": False,
                            "vibrate_timings": ["0.1s", "1s", "0.1s", "1s", "0.1s"],
                            "default_light_settings": True,
                            "sound": f"{self.__sound}.mp3"
                        },
                    },
                    "apns": {
                        "payload": {
                            "aps": {
                                "sound": f"{self.__sound}.aiff",
                                "badge": 0
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
    __ws_client: WebSocketClient | None = None

    def __init__(self, logger: logging.Logger, config: dict) -> None:
        self.__config = config
        self.__logger = logger
        self.__fcm_threads = []

    def _set_ws_client(self, ws_client: WebSocketClient):
        self.__ws_client = ws_client

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

    def __log_notification(self, title: str, body: str):
        try:
            from datetime import datetime
            conn = sqlite3.connect(self.__config["DB_NAME"])
            cursor = conn.cursor()
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute(
                "INSERT INTO notification_history (notified_at, title, body) VALUES (?, ?, ?)",
                (now_str, title, body)
            )
            conn.commit()
            # Limit history to 30 items by deleting older records
            cursor.execute(
                "DELETE FROM notification_history WHERE rowid NOT IN (SELECT rowid FROM notification_history ORDER BY notified_at DESC LIMIT 30)"
            )
            conn.commit()
            cursor.close()
            conn.close()
            if self.__ws_client is not None:
                import asyncio
                def send_ws():
                    asyncio.run(self.__ws_client.send_json({
                        "event": "new_notification",
                        "data": {
                            "title": title,
                            "body": body,
                            "notified_at": now_str,
                            "read": 0
                        }
                    }))
                Thread(target=send_ws).start()
            else:
                self.__logger.warning("__ws_client not found")
        except Exception as e:
            self.__logger.exception("Failed to log notification history: %s", e)

    def ongrid_notify(self):
        self.__fcm_threads = []
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.info("ON: No device to notify")
        else:
            self.__logger.info(
                f"ON: Start send notifcation to {len(devices)} devices"
            )
            for device in devices:
                t = FCMThread(
                    self.__logger,
                    self.__config,
                    "Đã có điện lưới.",
                    "Nhà đã có điện lưới có thể sử dụng điện không giới hạn.",
                    device,
                    True,
                    CHANNEL_ON_GRID
                    )
                self.__fcm_threads.append(t)
                t.start()
            self.__post_send_notify(devices)
        self.__log_notification("Đã có điện lưới.", "Nhà đã có điện lưới có thể sử dụng điện không giới hạn.")

    def offgrid_notify(self):
        self.__fcm_threads = []
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.info("OFF: No device to notify")
        else:
            self.__logger.info(
                f"OFF: Start send notifcation to {len(devices)} devices"
            )
            for device in devices:
                t = FCMThread(
                    self.__logger,
                    self.__config,
                    "Mất điện lưới.",
                    "Nhà đã mất điện lưới cần hạn chế sử dụng thiết bị điện công suất lớn như bếp từ, bình nóng lạnh.",
                    device,
                    False,
                    CHANNEL_OFF_GRID
                )
                self.__fcm_threads.append(t)
                t.start()
            self.__post_send_notify(devices)
        self.__log_notification("Mất điện lưới.", "Nhà đã mất điện lưới cần hạn chế sử dụng thiết bị điện công suất lớn như bếp từ, bình nóng lạnh.")

    def warning_notify(self):
        self.__fcm_threads = []
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.info("WARN: No device to notify")
        else:
            self.__logger.info(
                f"WARN: Start send notifcation to {len(devices)} devices"
            )
            for device in devices:
                t = FCMThread(
                    self.__logger,
                    self.__config,
                    "Cảnh báo: Tiêu thụ điện bất thường",
                    "Tiêu thụ điện bất thường, vui lòng kiểm tra xem vòi nước đã khoá chưa.",
                    device,
                    True,
                    CHANNEL_WARN
                )
                self.__fcm_threads.append(t)
                t.start()
            self.__post_send_notify(devices)
        self.__log_notification("Cảnh báo: Tiêu thụ điện bất thường", "Tiêu thụ điện bất thường, vui lòng kiểm tra xem vòi nước đã khoá chưa.")

    def offgrid_warning_notify(self, warning_power: float = 1500):
        self.__fcm_threads = []
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.info("WARN: No device to notify")
        else:
            self.__logger.info(
                f"WARN: Start send notifcation to {len(devices)} devices"
            )
            for device in devices:
                t = FCMThread(
                    self.__logger,
                    self.__config,
                    "Cảnh báo: Tiêu thụ điện cao",
                    f"Tiêu thụ điện cao hơn {warning_power}W khi đang mất điện lưới, vui lòng chú ý.",
                    device,
                    False,
                    CHANNEL_WARN
                )
                self.__fcm_threads.append(t)
                t.start()
            self.__post_send_notify(devices)
        self.__log_notification("Cảnh báo: Tiêu thụ điện cao", f"Tiêu thụ điện cao hơn {warning_power}W khi đang mất điện lưới, vui lòng chú ý.")
