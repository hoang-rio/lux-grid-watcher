from dotenv import dotenv_values
import logging.handlers
import pychromecast
import requests
import logging
import time
from os import path, environ

AUDIO_SLEEP_MAP = {
    "has-grid.mp3": 6,
    "lost-grid.mp3": 9,
}

config = {
    **dotenv_values(".env"),
    **environ
}
log_level = logging.DEBUG if bool(config["IS_DEBUG"]) else logging.INFO

logger = logging.getLogger(__file__)
log_file_handler = logging.handlers.RotatingFileHandler(
    config["LOG_FILE"], mode='a', maxBytes=300*1024, backupCount=2)
log_file_handler.setFormatter(logging.Formatter(config["LOG_FORMAT"]))
log_file_handler.setLevel(log_level)
log_handlers = [
    log_file_handler
]
if log_level == logging.DEBUG:
    log_handlers.append(logging.StreamHandler())

logging.basicConfig(
    level=log_level,
    format=config["LOG_FORMAT"],
    handlers=log_handlers
)


def play_audio(audio_file: str, repeat=3):
    chromecast, _ = pychromecast.get_listed_chromecasts(
        [config["CAST_DEVICE_NAME"]])
    if len(chromecast) > 0:
        cast = chromecast[0]
        logger.debug("Cast info: %s", cast.cast_info)
        cast.wait()
        logger.debug("Cast status: %s", cast.status)
        mediaController = cast.media_controller
        logger.info(
            "Playing %s on %s %s times repeat",
            audio_file,
            config["CAST_DEVICE_NAME"],
            repeat
        )
        while repeat > 0:
            mediaController.play_media(
                f"{config['AUDIO_BASE_URL']}/{audio_file}", "audio/mp3")
            mediaController.block_until_active()
            repeat = repeat - 1
            logger.info("Play time remaining: %s", repeat)
            if repeat > 0:
                logger.info("Wating for %s second before repeat",
                            AUDIO_SLEEP_MAP[audio_file])
            time.sleep(AUDIO_SLEEP_MAP[audio_file])
        logger.debug("MediaControler status: %s", mediaController.status)
    else:
        logger.info("No device to play audio")


def get_run_time_data(session: requests.Session, retry_count=0):
    try:
        logger.info("Start get runtime data")
        req = session.post(
            f"{config['BASE_URL']}/api/inverter/getInverterRuntime",
            headers={
                "Referer": f"{config['BASE_URL']}/web/monitor/inverter",
                "UserAgent": config["USER_AGENT"]
            },
            data={"serialNum": config["SERIAL_NUM"]}
        )
        res_json = req.json()
        logger.debug("All run time data response: %s", res_json)
        is_grid_connected = res_json['fac'] > 0
        # is_grid_connected = True
        if not is_grid_connected:
            logger.warning(
                "_________Inverter disconnected from GRID since %s_________",
                res_json['deviceTime'],
            )
        else:
            logger.info(
                "__Inverter currently connected to GRID at deviceTime: %s with fac: %s Hz and vacr: %s V",
                res_json['deviceTime'],
                int(res_json['fac']) / 100,
                int(res_json['vacr']) / 10,
            )
        last_grid_connected = True
        if path.exists(config["STATE_FILE"]):
            with open(config["STATE_FILE"], 'r') as f:
                last_grid_connected = f.read() == "True"
        if last_grid_connected != is_grid_connected:
            if is_grid_connected:
                play_audio("has-grid.mp3")
            else:
                play_audio("lost-grid.mp3", 5)
            with open(config["STATE_FILE"], "w") as fw:
                fw.write(str(is_grid_connected))
        else:
            logger.info("State did not change. Skip play notify auto")
        logger.info("Finish get runtime data")
    except Exception as e:
        logger.exception("Got exception when get run time data %s", e)
        if retry_count < int(config["MAX_RETRY_COUNT"]):
            login(session)
            get_run_time_data(session, retry_count + 1)


def login(session: requests.Session):
    logger.info("Start login")
    login_req = session.post(
        f"{config['BASE_URL']}/web/login",
        data={"account": config["ACCOUNT"], "password": config["PASSWORD"]},
        headers={
            "Referer": f"{config['BASE_URL']}/web/login",
            "UserAgent": config["USER_AGENT"]
        }
    )
    logger.info("Login status code: %s", login_req.status_code)


def main():
    session: requests.Session = requests.Session()
    try:
        login(session)
        while True:
            get_run_time_data(session)
            time.sleep(int(config["SLEEP_TIME"]))
    except Exception as e:
        logger.exception("Got error when run main %s", e)
        exit(1)


main()
