import pychromecast
import requests
from config import BASE_URL, ACCOUNT, PASSWORD, SLEEP_TIME, USER_AGENT, SERIAL_NUM
import config
import logging
import time
from os import path

logger = logging.getLogger(__file__)
logging.basicConfig(
    level=config.LOG_LEVEL,
    format=config.LOG_FORMAT,
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler()
    ]
)


def play_audio(audio_file: str):
    chromecast, _ = pychromecast.get_listed_chromecasts([config.DEVICE_NAME])
    if len(chromecast) > 0:
        cast = chromecast[0]
        logger.info("Cast info: %s", cast.cast_info)
        cast.wait()
        logger.info("Cast status: %s", cast.status)
        mediaController = cast.media_controller
        mediaController.play_media(
            f"{config.AUDIO_BASE_URL}/{audio_file}", "audio/mp3")
        mediaController.block_until_active()
        logger.info("MediaControler status: %s", mediaController.status)
    else:
        logger.info("No device to play audio")


def get_run_time_data(session: requests.Session, retry_count=0):
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
        last_grid_connected = True
        if path.exists(config.STATE_FILE):
            with open(config.STATE_FILE, 'r') as f:
                last_grid_connected = f.read() == "True"
        if last_grid_connected != is_grid_connected:
            play_audio("has-grid.mp3" if is_grid_connected else "lost-grid.mp3")
            with open(config.STATE_FILE, "w") as fw:
                fw.write(str(is_grid_connected))
        else:
            logger.info("State did not change. Skip play notify auto")
        logger.info("Finish get runtime data")
    except Exception as e:
        logger.exception("Got exception when get run time data %s", e)
        if retry_count < config.MAX_RETRY_COUNT:
            login(session)
            get_run_time_data(session, retry_count + 1)


def login(session: requests.Session):
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


def main():
    session: requests.Session = requests.Session()
    try:
        login(session)
        while True:
            get_run_time_data(session)
            time.sleep(SLEEP_TIME)
    except Exception as e:
        logger.exception("Got error when run main %s", e)
        exit(1)


main()
