import requests
import logging


class Http():
    __logger: logging.Logger
    __config: dict
    __session: requests.Session

    def __init__(self, logger: logging.Logger, config: dict):
        self.__logger = logger
        self.__config = config
        self.__session = requests.Session()
        self.login()

    def get_run_time_data(self, retry_count=0):
        try:
            self.__logger.info("Start get runtime data")
            req = self.__session.post(
                f"{self.__config['BASE_URL']}/api/inverter/getInverterRuntime",
                headers={
                    "Referer": f"{self.__config['BASE_URL']}/web/monitor/inverter",
                    "UserAgent": self.__config["USER_AGENT"]
                },
                data={"serialNum": self.__config["INVERT_SERIAL"]}
            )
            res_json = req.json()
            self.__logger.debug("All run time data response: %s", res_json)
            self.__logger.info("Finish get runtime data")
            if not res_json['success']:
                self.login()
                return self.get_run_time_data(retry_count + 1)
            return res_json
        except Exception as e:
            self.__logger.exception(
                "Got exception when get run time data %s", e)
            if retry_count < int(self.__config["MAX_RETRY_COUNT"]):
                self.login()
                return self.get_run_time_data(retry_count + 1)

    def login(self):
        self.__logger.info("Start login")
        login_req = self.__session.post(
            f"{self.__config['BASE_URL']}/web/login",
            data={"account": self.__config["ACCOUNT"],
                  "password": self.__config["PASSWORD"]},
            headers={
                "Referer": f"{self.__config['BASE_URL']}/web/login",
                "UserAgent": self.__config["USER_AGENT"]
            }
        )
        self.__logger.info("Login status code: %s", login_req.status_code)
