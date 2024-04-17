import logging
from os import path
import json
import requests
import requests.auth
from google.oauth2 import service_account
import google.auth.transport.requests

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]


class FCM():
    __config: dict
    __logger: logging.Logger

    def __init__(self, logger: logging.Logger, config: dict) -> None:
        self.__config = config
        self.__logger = logger

    def _get_access_token(self):
        """Retrieve a valid access token that can be used to authorize requests.
        :return: Access token.
        """
        credentials = service_account.Credentials.from_service_account_file(
            self.__config["FCM_ADMIN_KEY_FILE"], scopes=SCOPES)
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        return credentials.token

    def __get_devices(self):
        if path.exists(self.__config["DEVICE_IDS_JSON_FILE"]):
            with open(self.__config["DEVICE_IDS_JSON_FILE"], "r") as fr:
                return json.loads(fr.read())
        return []

    def __send_notify(self, title: str, body: str, devices: list[str], is_grid_connected: bool):
        if not path.exists(self.__config["FCM_ADMIN_KEY_FILE"]):
            self.__logger.warning("Missing FCM_ADMIN_KEY_FILE")
            return
        if 'FCM_PROJECT' not in self.__config or self.__config["FCM_PROJECT"] == "":
            self.__logger.warning("Missing FCM_PROJECT")
            return
        self.__logger.debug(
            "Send notify with title: %s and body: %s to %s devices", title, body, len(devices))
        access_token = self._get_access_token()
        for device in devices:
            requests.post(
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
                        "token": device,
                    },
                },
                headers={
                    'Authorization': 'Bearer ' + access_token,
                    'Content-Type': 'application/json; UTF-8',
                }
            )

    def ongrid_notify(self):
        self.__logger.debug("ON: Start send notify")
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.debug("ON: No device to notify")
        else:
            self.__send_notify(
                "Đã có điện lưới.",
                "Nhà đã có điện lưới có thể sử dụng điện không giới hạn.",
                devices,
                True
            )
        self.__logger.debug("ON: Finish send notify")

    def offgrid_notify(self):
        self.__logger.debug("OFF: Start send notify")
        devices = self.__get_devices()
        if len(devices) == 0:
            self.__logger.debug("OFF: No device to notify")
        else:
            self.__send_notify(
                "Mất điện lưới.",
                "Nhà đã mất điện lưới cần hạn chế sử dụng thiết bị điện công suất lớn như bếp từ, bình nóng lạnh.",
                devices,
                False
            )
        self.__logger.debug("OFF: Finish send notify")
