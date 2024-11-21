from dotenv import dotenv_values
import logging.handlers
import logging
import time
from os import path, environ
import dongle_handler
import http_handler
from datetime import datetime
from fcm import FCM
import json
from play_audio import PlayAudio
from web_viewer import WebViewer
from web_socket_client import WebSocketClient
import asyncio

DONGLE_MODE = "DONGLE"

AUDIO_SLEEP_MAP = {
    "has-grid.mp3": 6,
    "lost-grid.mp3": 9,
}

config: dict = {
    **dotenv_values(".env"),
    **environ
}
log_level = logging.DEBUG if config["IS_DEBUG"] == 'True' else logging.INFO

logger = logging.getLogger(__file__)
log_file_handler = logging.handlers.RotatingFileHandler(
    config["LOG_FILE"],
    mode='a',
    maxBytes=int(config["LOG_FILE_SIZE"])*1024,
    backupCount=int(config["LOG_FILE_COUNT"])
)
log_file_handler.setFormatter(logging.Formatter(config["LOG_FORMAT"]))
log_file_handler.setLevel(log_level)
log_handlers: list[logging.Handler] = [
    log_file_handler
]
if log_level == logging.DEBUG:
    log_handlers.append(logging.StreamHandler())

logging.basicConfig(
    level=log_level,
    format=config["LOG_FORMAT"],
    handlers=log_handlers
)

play_audio_thread: PlayAudio | None = None


def play_audio(audio_file: str, repeat=3):
    global play_audio_thread
    if play_audio_thread is not None:
        play_audio_thread.stop()
    play_audio_thread = PlayAudio(
        audio_file=audio_file, repeat=repeat, sleep=AUDIO_SLEEP_MAP[audio_file], config=config, logger=logger)
    play_audio_thread.start()


def handle_grid_status(json_data: dict, fcm_service: FCM):
    # is_grid_connected = True
    is_grid_connected = json_data["fac"] > 0
    last_grid_connected = True
    disconnected_time = json_data["deviceTime"]
    if path.exists(config["STATE_FILE"]):
        with open(config["STATE_FILE"], 'r') as f:
            last_grid_connected = f.read() == "True"
        if not last_grid_connected:
            # Only get disconneced time from state file if disconnected from previos
            disconnected_time = datetime.fromtimestamp(
                path.getmtime(config['STATE_FILE'])
            ).strftime("%Y-%m-%d %H:%M:%S")
    status_text = json_data["status_text"] if "status_text" in json_data else json_data["status"]
    if not is_grid_connected:
        logger.warning(
            "_________Inverter disconnected from GRID since: %s with status: \"%s\"_________",
            disconnected_time,
            status_text,
        )
    else:
        logger.info(
            "_________Inverter currently connected to GRID with\nStatus: \"%s\" at deviceTime: %s with fac: %s Hz and vacr: %s V_________",
            status_text,
            json_data['deviceTime'],
            int(json_data['fac']) / 100,
            int(json_data['vacr']) / 10,
        )
    if last_grid_connected != is_grid_connected:
        current_history = []
        if path.exists(config['HISTORY_FILE']):
            with open(config['HISTORY_FILE'], 'r') as f_history:
                current_history = json.loads(f_history.read())
        if len(current_history) == int(config["HISTORY_COUNT"]):
            del current_history[len(current_history) - 1]
        current_history.insert(0, {
            "type": "ON_GRID" if is_grid_connected else "OFF_GRID",
            "time": json_data["deviceTime"],
        })
        with open(config['HISTORY_FILE'], 'w') as f_history_w:
            f_history_w.write(json.dumps(current_history))
        with open(config["STATE_FILE"], "w") as fw:
            fw.write(str(is_grid_connected))
        if is_grid_connected:
            fcm_service.ongrid_notify()
            play_audio("has-grid.mp3")
        else:
            logger.warning("All json data: %s", json_data)
            fcm_service.offgrid_notify()
            play_audio("lost-grid.mp3", 5)
    else:
        logger.info("State did not change. Skip play notify audio")


async def main():
    try:
        logger.info("Grid connect watch working on mode: %s",
                    config["WORKING_MODE"])
        fcm_service = FCM(logger, config)
        run_web_view = config["RUN_WEB_VIEWER"] == "True"
        if config["WORKING_MODE"] == DONGLE_MODE:
            if run_web_view:
                WebViewer(logger).start()
                time.sleep(1)
                ws_client = WebSocketClient(logger=logger, host=config["HOST"], port=int(config["PORT"]))
                ws_client.start()
            dongle = dongle_handler.Dongle(logger, config)
            while True:
                inverter_data = dongle.get_dongle_input()
                if inverter_data is not None:
                    handle_grid_status(inverter_data, fcm_service)
                    if ws_client is not None:
                        await ws_client.send_json(inverter_data)
                logger.info("Wating for %s second before next check",
                            config["SLEEP_TIME"])
                time.sleep(int(config["SLEEP_TIME"]))
        else:
            http = http_handler.Http(logger, config)
            while True:
                inverter_data = http.get_run_time_data()
                handle_grid_status(inverter_data, fcm_service)
                logger.info("Wating for %s second before next check",
                            config["SLEEP_TIME"])
                time.sleep(int(config["SLEEP_TIME"]))
    except Exception as e:
        logger.exception("Got error when run main %s", e)
        exit(1)

asyncio.run(main())
