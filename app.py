import requests
from config import BASE_URL, ACCOUNT, PASSWORD, SLEEP_TIME, USER_AGENT, SERIAL_NUM
import config
import logging
import time

logger = logging.getLogger(__file__)
logging.basicConfig(
    level=config.LOG_LEVEL,
    format=config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler()
    ]
)


def get_run_time_data(session: requests.Session):
    try:
        logger.info("Start get runtime data")
        req = session.post(
            f"{BASE_URL}/api/inverter/getInverterRuntime",
            headers={
                "Referer": f"{BASE_URL}/web/monitor/inverter",
                "UserAgent": USER_AGENT
            },
            data={"serialNum": SERIAL_NUM}
        )
        res_json = req.json()
        logger.debug("All run time data response: %s", res_json)
        is_grid_connected = res_json["fac"] > 0
        if not is_grid_connected:
            logger.warning("_________Inverter disconnected from GRID_________")
        else:
            logger.info(
                "__GRID currently connected at deviceTime: %s with fac: %s Hz and vacr: %s V",
                res_json['deviceTime'],
                int(res_json['fac']) / 100,
                int(res_json['vacr']) / 10,
            )
        logger.info("Finish get runtime data")
    except Exception as e:
        logger.exception("Got exception when get run time data %s", e)


def main():
    session: requests.Session = requests.Session()
    try:
        logger.info("Start login")
        login_req = session.post(
            f"{BASE_URL}/web/login",
            data={"account": ACCOUNT, "password": PASSWORD},
            headers={
                "Referer": f"{BASE_URL}/web/login",
                "UserAgent": USER_AGENT
            }
        )
        logger.info("Login status code: %s", login_req.status_code)
        while True:
            get_run_time_data(session)
            time.sleep(SLEEP_TIME)
    except Exception as e:
        logger.exception("Got error when run main %s", e)


main()
