import sqlite3
from dotenv import dotenv_values
import logging.handlers
import logging
import time
from os import path, environ
import dongle_handler
import http_handler
from datetime import datetime, timedelta
from fcm import FCM
import json
from play_audio import PlayAudio
import asyncio
from web_socket_client import WebSocketClient
import settings

DONGLE_MODE = "DONGLE"

# SLEEP_TIME should be minimum audio duration + 2 seconds
# Example: 4 seconds for has-grid.mp3 + 2 seconds = 6 seconds to sleep
AUDIO_SLEEP_MAP = {
    "has-grid.mp3": 6,
    "lost-grid.mp3": 9,
    "warning.mp3": 7,
    "warning_power_off_grid.mp3": 6
}

config: dict = {
    **dotenv_values(".env"),
    **environ
}

# Settings will be loaded from DB
def get_abnormal_detection_enabled():
    return settings.get_setting("ABNORMAL_DETECTION_ENABLED", config.get("ABNORMAL_DETECTION_ENABLED", "true")).lower() == "true"

def get_abnormal_check_cooldown_hours():
    return int(settings.get_setting("ABNORMAL_CHECK_COOLDOWN_HOURS", config.get("ABNORMAL_CHECK_COOLDOWN_HOURS", 3)))

def get_abnormal_usage_count():
    return 32 * get_abnormal_check_cooldown_hours()

def get_normal_min_usage_count():
    return 5 * get_abnormal_check_cooldown_hours()

def get_abnormal_min_power():
    return int(settings.get_setting("ABNORMAL_MIN_POWER", 900))

def get_off_grid_warning_power():
    return int(settings.get_setting("OFF_GRID_WARNING_POWER", 2200))

def get_off_grid_warning_soc():
    return int(settings.get_setting("OFF_GRID_WARNING_SOC", 87))

def get_max_battery_power():
    return int(settings.get_setting("MAX_BATTERY_POWER", 3000))

def get_off_grid_warning_enabled():
    return settings.get_setting("OFF_GRID_WARNING_ENABLED", "true").lower() == "true"

def get_battery_full_notify_enabled():
    return settings.get_setting("BATTERY_FULL_NOTIFY_ENABLED", "true").lower() == "true"

def get_battery_full_notify_body():
    return settings.get_setting("BATTERY_FULL_NOTIFY_BODY", "Pin đã sạc đầy 100%. Có thể bật bình nóng lạnh để tối ưu sử dụng.")

def get_abnormal_notify_body():
    return settings.get_setting("ABNORMAL_NOTIFY_BODY", "Tiêu thụ điện bất thường, vui lòng kiểm tra xem vòi nước đã khoá chưa.")
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

# Number of hours to skip check when detect abnormal usage
abnormal_skip_check_count = 0
def dectect_abnormal_usage(db_connection: sqlite3.Connection, fcm_service: FCM):
    if not get_abnormal_detection_enabled():
        return  # Skip check if abnormal detection is disabled
    now = datetime.now()
    # now = now.replace(minute=0, second=0, hour=6)
    sleep_time = int(config["SLEEP_TIME"])
    abnormal_check_cooldown_hours = get_abnormal_check_cooldown_hours()
    if (sleep_time >= 60 and now.minute <= sleep_time / 60) or (now.minute == 0 and now.second <= sleep_time):
        global abnormal_skip_check_count
        if abnormal_skip_check_count > 0:
            abnormal_skip_check_count = abnormal_skip_check_count - 1
            return
        cursor = db_connection.cursor()
        abnormal_check_start_time = now - timedelta(hours=abnormal_check_cooldown_hours)
        from web_viewer import dict_factory
        cursor.row_factory = dict_factory
        all_items = cursor.execute(
            "SELECT * FROM hourly_chart WHERE datetime >= ? AND datetime < ?",
            (abnormal_check_start_time.strftime("%Y-%m-%d %H:%M:%S"), now.strftime("%Y-%m-%d %H:%M:%S"))
        ).fetchall()
        abnormnal_count = 0
        normnal_count = 0
        min_power = 0
        max_power = 0
        consumption_count: dict = {}
        abnormal_min_power = get_abnormal_min_power()
        abnormal_usage_count = get_abnormal_usage_count()
        normal_min_usage_count = get_normal_min_usage_count()
        for item in all_items:
            rounded_consumption = item["consumption"] - item["consumption"] % 200
            consumption_count[rounded_consumption] = consumption_count.get(rounded_consumption, 0) + 1
            if min_power == 0 or rounded_consumption < min_power:
                min_power = rounded_consumption
            if rounded_consumption > abnormal_min_power and (max_power == 0 or consumption_count[rounded_consumption] > consumption_count.get(max_power, 0)):
                max_power = rounded_consumption
        abnormnal_count = consumption_count.get(max_power, 0)
        normnal_count = consumption_count.get(min_power, 0)
        if max_power >= abnormal_min_power and max_power > min_power and abnormnal_count > abnormal_usage_count and normnal_count > normal_min_usage_count and normnal_count < abnormnal_count:
            logger.warning(
                "_________Abnormal usage detected from %s to %s with %s abnormal times and %s normal times (max_power: %s, min_power: %s)_________",
                abnormal_check_start_time.strftime("%Y-%m-%d %H:%M:%S"),
                now.strftime("%Y-%m-%d %H:%M:%S"),
                abnormnal_count,
                normnal_count,
                max_power,
                min_power
            )
            warning_body = get_abnormal_notify_body()
            fcm_service.abnormal_notify(warning_body)
            play_audio("warning.mp3", 5)
            # Skip next abnormal_check_cooldown_hours hours when detect abnormal usage
            abnormal_skip_check_count = abnormal_check_cooldown_hours
        else:
            logger.info(
                "_________No abnormal usage detected from %s to %s with %s abnormal times and %s normal times (max_power: %s, min_power: %s)_________",
                abnormal_check_start_time.strftime("%Y-%m-%d %H:%M:%S"),
                now.strftime("%Y-%m-%d %H:%M:%S"),
                abnormnal_count,
                normnal_count,
                max_power,
                min_power
            )
        cursor.close()


dectect_off_grid_warning_skip_check_count = 0
last_battery_full_notify_date = None
def dectect_off_grid_warning(is_grid_connected: bool, pv_power: int, eps_power: int, soc: int, fcm_service: FCM):
    if not get_off_grid_warning_enabled() or is_grid_connected:
        return
    if pv_power > eps_power:
        # No need to check off grid warning if pv power is greater than eps power
        return
    global dectect_off_grid_warning_skip_check_count
    # Notify off grid warning if eps power >= OFF_GRID_WARNING_POWER and pv power < eps power / 2
    # and (battery percent (soc) < OFF_GRID_WARNING_SOC or battery discharge > MAX_BATTERY_POWER)
    off_grid_warning_power = get_off_grid_warning_power()
    off_grid_warning_soc = get_off_grid_warning_soc()
    max_battery_power = get_max_battery_power()

    high_load = eps_power >= off_grid_warning_power
    insufficient_pv = pv_power < eps_power / 2
    low_battery = soc < off_grid_warning_soc
    high_battery_discharge = eps_power - pv_power > max_battery_power

    if high_load and insufficient_pv and (low_battery or high_battery_discharge):
        if dectect_off_grid_warning_skip_check_count > 0:
            dectect_off_grid_warning_skip_check_count = dectect_off_grid_warning_skip_check_count - 1
            return
        logger.warning(
            "_________Off grid warning detected with pv power: (%sW), eps power: (%sW) and soc: (%s%)_________",
            pv_power,
            eps_power,
            soc
        )
        fcm_service.offgrid_warning_notify(off_grid_warning_power, None if high_battery_discharge else off_grid_warning_soc)
        play_audio("warning_power_off_grid.mp3")
        # Skip next OFF_GRID_WARNING_SKIP_CHECK_COUNT time when detect off grid warning
        dectect_off_grid_warning_skip_check_count = 60 // int(config["SLEEP_TIME"])
    else:
        dectect_off_grid_warning_skip_check_count = 0

def detect_battery_full(soc: int, fcm_service: FCM):
    if not get_battery_full_notify_enabled():
        return
    global last_battery_full_notify_date
    now = datetime.now()
    today = now.date()
    if soc == 100 and (last_battery_full_notify_date is None or last_battery_full_notify_date != today):
        logger.info("_________Battery full detected with soc: %s%%_________", soc)
        body = get_battery_full_notify_body()
        fcm_service.battery_full_notify(body)
        last_battery_full_notify_date = today

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
            "_________Inverter disconnected from GRID since: %s with status: \"%s\" (%s)_________",
            disconnected_time,
            status_text,
            json_data["status"],
        )
    else:
        logger.info(
            """_________Inverter currently connected to GRID with________
________Status: \"%s\" (%s) at deviceTime: %s with fac: %s Hz and vacr: %s V_________""",
            status_text,
            json_data["status"],
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
    dectect_off_grid_warning(
        is_grid_connected, json_data["p_pv"], json_data["p_eps"], json_data["soc"], fcm_service)
    detect_battery_full(json_data["soc"], fcm_service)


def insert_hourly_chart(db_connection: sqlite3.Connection, inverter_data: dict):
    cursor = db_connection.cursor()
    device_time = datetime.strptime(inverter_data["deviceTime"], "%Y-%m-%d %H:%M:%S")
    # Remove hourly_chart records older than 30 days
    oldest_date = (device_time - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    cursor.execute(
        "DELETE FROM hourly_chart WHERE datetime < ?", (oldest_date.strftime("%Y-%m-%d %H:%M:%S"),))
    sleep_time = int(config["SLEEP_TIME"])
    item_id = device_time.strftime("%Y%m%d%H%M")
    grid = inverter_data["p_to_grid"] - inverter_data["p_to_user"]
    consumption = inverter_data["p_inv"] + \
        inverter_data["p_to_user"] - \
        inverter_data["p_rec"] + inverter_data["p_eps"]
    hourly_chart_item = {
        "id": item_id,
        "datetime": inverter_data["deviceTime"],
        "pv": inverter_data["p_pv"],
        "battery": inverter_data["p_discharge"] - inverter_data["p_charge"],
        "grid": grid,
        "consumption": consumption,
        "soc": inverter_data["soc"],
    }
    from web_viewer import dict_factory
    cursor.row_factory = dict_factory
    exist_item = cursor.execute(
        "SELECT * FROM hourly_chart WHERE id = ?", (
            item_id,)
    ).fetchone()
    if exist_item is None:
        cursor.execute(
            "INSERT INTO hourly_chart (id, datetime, pv, battery, grid, consumption, soc) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (item_id, hourly_chart_item["datetime"], hourly_chart_item["pv"], hourly_chart_item["battery"],
                hourly_chart_item["grid"], hourly_chart_item["consumption"], hourly_chart_item["soc"]),
        )
    else:
        sleep_count_since_zero = max(int(device_time.second / sleep_time), 1)
        total_count = sleep_count_since_zero + 1
        pv_average = round((hourly_chart_item["pv"] * sleep_count_since_zero + exist_item["pv"]) / total_count)
        battery_average = round((hourly_chart_item["battery"] * sleep_count_since_zero + exist_item["battery"]) / total_count)
        grid_average = round((hourly_chart_item["grid"] * sleep_count_since_zero + exist_item["grid"]) / total_count)
        consumption_average = round((hourly_chart_item["consumption"] * sleep_count_since_zero + exist_item["consumption"]) / total_count)
        soc_average = round((hourly_chart_item["soc"] * sleep_count_since_zero + exist_item["soc"]) / total_count)
        cursor.execute(
            "UPDATE hourly_chart SET datetime = ?, pv = ?, battery = ?, grid = ?, consumption = ?, soc = ? WHERE id = ?",
            (
                hourly_chart_item["datetime"],
                pv_average,
                battery_average,
                grid_average,
                consumption_average,
                soc_average,
                item_id)
        )
    cursor.close()
    db_connection.commit()
    return [item_id, hourly_chart_item["datetime"], hourly_chart_item["pv"], hourly_chart_item["battery"], hourly_chart_item["grid"], hourly_chart_item["consumption"], hourly_chart_item["soc"]]


def insert_daily_chart(db_connection: sqlite3.Connection, inverter_data: dict):
    device_time = datetime.strptime(inverter_data["deviceTime"],
                                    "%Y-%m-%d %H:%M:%S")
    if device_time.hour == 0 and device_time.minute == 0:
        # Igore daily data in first minute of the day
        return
    cursor = db_connection.cursor()
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
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    is_exist = cursor.execute(
        "SELECT id, consumption FROM daily_chart WHERE id = ?", (item_id,)
    ).fetchone()
    if is_exist is None:
        cursor.execute(
            "INSERT INTO daily_chart (id, year, month, date, pv, battery_charged, battery_discharged, grid_import, grid_export, consumption, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (item_id, daily_chart_item["year"], daily_chart_item["month"], daily_chart_item["date"], daily_chart_item["pv"], daily_chart_item["battery_charged"],
                daily_chart_item["battery_discharged"], daily_chart_item["grid_import"], daily_chart_item["grid_export"],
                daily_chart_item["consumption"], daily_chart_item["updated"]),
        )
    else:
        cursor.execute(
                "UPDATE daily_chart SET year = ?, month = ?, date = ?, pv = ?, battery_charged = ?, battery_discharged = ?, grid_import = ?, grid_export = ?, consumption = ?, updated =? WHERE id = ?",
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
                    daily_chart_item["updated"],
                    item_id)
            )
    cursor.close()
    db_connection.commit()


async def initialize_web_socket_client(fcm_service: FCM, old_ws_client: WebSocketClient | None = None):
    if old_ws_client is not None:
        # Reinitialize the web socket client for next iteration
        logger.info("Stopping old web socket client")
        await old_ws_client.stop()
        logger.info("Reinitializing web socket client for next iteration")
    ws_client = WebSocketClient(
        logger=logger, host=config["HOST"], port=int(config["PORT"]))
    fcm_service._set_ws_client(ws_client)
    ws_client.start()
    return ws_client

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
                from migration import run_migration
                run_migration(db_connection, logger)
                settings.load_settings(db_connection)
                from web_viewer import WebViewer
                webViewer = WebViewer(logger)
                webViewer.start()
                time.sleep(1)
                ws_client = await initialize_web_socket_client(fcm_service)
            dongle = dongle_handler.Dongle(logger, config)
            while True:
                try:
                    timeout_duration = int(config["SLEEP_TIME"]) * 3
                    try:
                        inverter_data = await asyncio.wait_for(
                            asyncio.to_thread(dongle.get_dongle_input),
                            timeout=timeout_duration
                        )
                    except asyncio.TimeoutError:
                        logger.error("Timeout waiting for dongle input for %s seconds", timeout_duration)
                    if inverter_data is not None:
                        handle_grid_status(inverter_data, fcm_service)
                        if run_web_view:
                            hourly_chart_item = insert_hourly_chart(db_connection, inverter_data)
                            try:
                                sent = await asyncio.wait_for(
                                    ws_client.send_json({
                                        "inverter_data": inverter_data,
                                        "hourly_chart_item": hourly_chart_item
                                    }),
                                    timeout=timeout_duration
                                )
                                if not sent:
                                    logger.error("Failed to send data to web socket")
                                    ws_client = await initialize_web_socket_client(fcm_service, ws_client)
                            except asyncio.TimeoutError:
                                logger.error("Timeout waiting for web socket to send data for %s seconds", timeout_duration)
                                ws_client = await initialize_web_socket_client(fcm_service, ws_client)
                            insert_daily_chart(db_connection, inverter_data)
                            dectect_abnormal_usage(db_connection, fcm_service)
                except Exception as e:
                    logger.exception("Got error when get dongle input %s", e)
                logger.info("Wating for %s second before next check",
                                config["SLEEP_TIME"])
                time.sleep(int(config["SLEEP_TIME"]))
        else:
            http = http_handler.Http(logger, config)
            while True:
                try:
                    inverter_data = http.get_run_time_data()
                    handle_grid_status(inverter_data, fcm_service)
                except Exception as e:
                    logger.exception("Got error when get http input %s", e)
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
