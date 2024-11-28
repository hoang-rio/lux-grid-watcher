import sqlite3
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


def insert_hourly_chart(db_connection: sqlite3.Connection, inverter_data: dict):
    cursor = db_connection.cursor()
    device_time = datetime.strptime(inverter_data["deviceTime"],
                                    "%Y-%m-%d %H:%M:%S")
    sleep_time = int(config["SLEEP_TIME"])
    if sleep_time < 60:
        if device_time.hour == 0 and device_time.minute == 0 and device_time.second <= sleep_time:
            cursor.execute(
                "DELETE FROM hourly_chart WHERE datetime < ?", (inverter_data["deviceTime"],))
    elif sleep_time < 3600:
        if device_time.hour == 0 and device_time.minute <= sleep_time / 60:
            cursor.execute(
                "DELETE FROM hourly_chart WHERE datetime < ?", (inverter_data["deviceTime"],))

    item_id = device_time.strftime("%Y%m%d%H%M")
    grid = inverter_data["p_to_user"] - inverter_data["p_to_grid"]
    consumption = inverter_data["p_inv"] + \
        inverter_data["p_to_user"] - \
        inverter_data["p_rec"]
    hourly_chart_item = {
        "id": item_id,
        "datetime": inverter_data["deviceTime"],
        "pv": inverter_data["p_pv"],
        "battery": inverter_data["p_discharge"] - inverter_data["p_charge"],
        "grid": grid,
        "consumption": consumption,
        "soc": inverter_data["soc"],
    }
    is_exist = cursor.execute(
        "SELECT id FROM hourly_chart WHERE id = ?", (
            item_id,)
    ).fetchone()
    if is_exist is None:
        cursor.execute(
            "INSERT INTO hourly_chart (id, datetime, pv, battery, grid, consumption, soc) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (item_id, hourly_chart_item["datetime"], hourly_chart_item["pv"], hourly_chart_item["battery"],
                hourly_chart_item["grid"], hourly_chart_item["consumption"], hourly_chart_item["soc"]),
        )
    else:
        cursor.execute(
            "UPDATE hourly_chart SET datetime = ?, pv = ?, battery = ?, grid = ?, consumption = ?, soc = ? WHERE id = ?",
            (
                hourly_chart_item["datetime"],
                hourly_chart_item["pv"],
                hourly_chart_item["battery"],
                hourly_chart_item["grid"],
                hourly_chart_item["consumption"],
                hourly_chart_item["soc"],
                item_id)
        )
    cursor.close()
    db_connection.commit()
    return [item_id, hourly_chart_item["datetime"], hourly_chart_item["pv"], hourly_chart_item["battery"], hourly_chart_item["grid"], hourly_chart_item["consumption"], hourly_chart_item["soc"]]


def insert_daly_chart(db_connection: sqlite3.Connection, inverter_data: dict):
    cursor = db_connection.cursor()
    device_time = datetime.strptime(inverter_data["deviceTime"],
                                    "%Y-%m-%d %H:%M:%S")
    item_id = device_time.strftime("%Y%m%d")
    consumption = (
        inverter_data["e_inv_day"] +
        inverter_data["e_to_user_day"] +
        inverter_data["e_eps_day"] -
        inverter_data["e_rec_day"]
    )
    daily_chart_item = {
        "id": item_id,
        "year": device_time.year,
        "month": device_time.month,
        "date": device_time.strftime("%Y-%m-%d"),
        "pv": inverter_data["e_pv_day"],
        "battery_charged": inverter_data["e_chg_day"],
        "battery_discharged": inverter_data["e_dischg_day"],
        "grid_import": inverter_data["e_to_user_day"],
        "grid_export": inverter_data["e_to_grid_day"],
        "consumption": round(consumption, 1),
    }
    is_exist = cursor.execute(
        "SELECT id, consumption FROM daily_chart WHERE id = ?", (item_id,)
    ).fetchone()
    if is_exist is None:
        cursor.execute(
            "INSERT INTO daily_chart (id, year, month, date, pv, battery_charged, battery_discharged, grid_import, grid_export, consumption) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (item_id, daily_chart_item["year"], daily_chart_item["month"], daily_chart_item["date"], daily_chart_item["pv"], daily_chart_item["battery_charged"],
                daily_chart_item["battery_discharged"], daily_chart_item["grid_import"], daily_chart_item["grid_export"],
                daily_chart_item["consumption"]),
        )
    else:
        _, current_consumption = is_exist
        if consumption >= current_consumption:
            cursor.execute(
                "UPDATE daily_chart SET year = ?, month = ?, date = ?, pv = ?, battery_charged = ?, battery_discharged = ?, grid_import = ?, grid_export = ?, consumption = ? WHERE id = ?",
                (
                    daily_chart_item["year"],
                    daily_chart_item["month"],
                    daily_chart_item["date"],
                    daily_chart_item["pv"],
                    daily_chart_item["battery_charged"],
                    daily_chart_item["battery_discharged"],
                    daily_chart_item["grid_import"],
                    daily_chart_item["grid_export"],
                    daily_chart_item["consumption"],
                    item_id)
            )
    cursor.close()
    db_connection.commit()


async def main():
    try:
        logger.info("Grid connect watch working on mode: %s",
                    config["WORKING_MODE"])
        fcm_service = FCM(logger, config)
        run_web_view = config["RUN_WEB_VIEWER"] == "True"
        if config["WORKING_MODE"] == DONGLE_MODE:
            if run_web_view:
                db_connection = sqlite3.connect(
                    config["DB_NAME"]) if "DB_NAME" in config else None
                if db_connection is not None:
                    from migration import run_migration
                    run_migration(db_connection, logger)
                from web_viewer import WebViewer
                webViewer = WebViewer(logger)
                webViewer.start()
                time.sleep(1)
                from web_socket_client import WebSocketClient
                ws_client = WebSocketClient(
                    logger=logger, host=config["HOST"], port=int(config["PORT"]))
                ws_client.start()
            dongle = dongle_handler.Dongle(logger, config)
            while True:
                inverter_data = dongle.get_dongle_input()
                if inverter_data is not None:
                    handle_grid_status(inverter_data, fcm_service)
                    if run_web_view:
                        if db_connection is not None:
                            hourly_chart_item = insert_hourly_chart(db_connection, inverter_data)
                            insert_daly_chart(db_connection, inverter_data)
                        await ws_client.send_json({
                            "inverter_data": inverter_data,
                            "hourly_chart_item": hourly_chart_item
                        })
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
        try:
            if run_web_view:
                webViewer.stop()
                ws_client.stop()
        except NameError as e:
            pass
        except Exception as e:
            logger.exception(
                "Got error when stop web viewer or web socket %s", e)
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
