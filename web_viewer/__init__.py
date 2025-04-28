import asyncio
from datetime import datetime, timedelta
import sqlite3
import threading
from aiohttp.aiohttp import web
from aiohttp import aiohttp
from os import environ, path
import json
from logging import Logger, getLogger
from dotenv import dotenv_values


config: dict = {
    **dotenv_values(".env"),
    **environ
}

logger: Logger = getLogger(__file__)
db_connection: sqlite3.Connection | None = None


async def http_handler(_: web.Request):
    index_file_path = path.join(path.dirname(__file__), 'build', 'index.html')
    return web.FileResponse(index_file_path, headers={"expires": "0", "cache-control": "no-cache"})

ws_clients: list[web.WebSocketResponse] = []
last_inverter_data: str = '{}'


async def websocket_handler(request):
    global ws_clients
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    ws_clients.append(ws)

    async for msg in ws:
        logger.debug("[WS Server] received message")
        logger.debug(msg)
        logger.debug(f"WS_CLIENTS count: {len(ws_clients)}")
        if msg.type == aiohttp.WSMsgType.TEXT:
            global last_inverter_data
            if "inverter_data" in msg.data:
                last_inverter_data = msg.data
            for ws_client in ws_clients:
                if ws_client != ws:
                    if not ws_client.closed:
                        await ws_client.send_str(msg.data)
                    else:
                        ws_clients.remove(ws_client)
        elif msg.type == aiohttp.WSMsgType.CLOSED:
            ws_clients.remove(ws)
        elif msg.type == aiohttp.WSMsgType.ERROR:
            ws_clients.remove(ws)
            logger.error("WS connection closed with exception %s" %
                         ws.exception())

    return ws

VITE_CORS_HEADER = {'Access-Control-Allow-Origin': '*'}

async def state(_: web.Request):
    global last_inverter_data
    res = web.json_response(json.loads(
        last_inverter_data)["inverter_data"], headers=VITE_CORS_HEADER)
    return res


async def hourly_chart(_: web.Request):
    if "DB_NAME" not in config:
        return web.json_response([], headers=VITE_CORS_HEADER)
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    hourly_chart = cursor.execute(
        "SELECT * FROM hourly_chart WHERE datetime >= ?", (start_of_day.strftime("%Y-%m-%d %H:%M:%S"),)).fetchall()
    res = web.json_response(hourly_chart, headers=VITE_CORS_HEADER)
    return res


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


async def total(_: web.Request):
    if "DB_NAME" not in config:
        return web.json_response({}, headers=VITE_CORS_HEADER)
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    cursor.row_factory = dict_factory
    total = cursor.execute(
        "SELECT SUM(pv) as pv, SUM(battery_charged) as battery_charged, SUM(battery_discharged) as battery_discharged, SUM(grid_import) as grid_import, SUM(grid_export) as grid_export, SUM(consumption) as consumption FROM daily_chart").fetchone()
    res = web.json_response(total, headers=VITE_CORS_HEADER)
    return res


async def daily_chart(_: web.Request):
    if "DB_NAME" not in config:
        return web.json_response([], headers=VITE_CORS_HEADER)
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    now = datetime.now()
    daily_chart = cursor.execute(
        "SELECT * FROM daily_chart WHERE year = ? AND month = ?",
        (now.year, now.month)
    ).fetchall()
    # Fill empty data to daily_chart from last item to last day of month
    if len(daily_chart) > 0:
        last_day_of_month = (now.replace(day=1, hour=0, minute=0, second=0,
                                microsecond=0) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        last_item_date = datetime.strptime(daily_chart[-1][3], "%Y-%m-%d")
        while last_item_date < last_day_of_month:
            last_item_date += timedelta(days=1)
            daily_chart.append((
                last_item_date.strftime("%Y%m%d"),
                last_item_date.year,
                last_item_date.month,
                last_item_date.strftime("%Y-%m-%d"),
                0, 0, 0, 0, 0, 0, ""
            ))
    res = web.json_response(daily_chart, headers=VITE_CORS_HEADER)
    return res


async def monthly_chart(_: web.Request):
    if "DB_NAME" not in config:
        return web.json_response([], headers=VITE_CORS_HEADER)
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    now = datetime.now()
    monthly_chart = cursor.execute(
        "SELECT id, id, id, month || '/' || year as month, SUM(pv), SUM(battery_charged), SUM(battery_discharged), SUM(grid_import), SUM(grid_export), SUM(consumption) FROM daily_chart WHERE year = ? GROUP BY month",
        (now.year,)
    ).fetchall()
    res = web.json_response(monthly_chart, headers=VITE_CORS_HEADER)
    return res


async def yearly_chart(_: web.Request):
    if "DB_NAME" not in config:
        return web.json_response([], headers=VITE_CORS_HEADER)
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    yearly_chart = cursor.execute(
        "SELECT id, id, id, year || '' as year, SUM(pv), SUM(battery_charged), SUM(battery_discharged), SUM(grid_import), SUM(grid_export), SUM(consumption) FROM daily_chart GROUP BY year"
    ).fetchall()
    res = web.json_response(yearly_chart, headers=VITE_CORS_HEADER)
    return res


async def notification_history(_: web.Request):
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    notifications = cursor.execute(
        "SELECT id, title, body, notified_at, read FROM notification_history ORDER BY notified_at DESC"
    ).fetchall()
    data = [{"id": row[0], "title": row[1], "body": row[2], "notified_at": row[3], "read": row[4]} for row in notifications]
    return web.json_response({"notifications": data}, headers=VITE_CORS_HEADER)


async def mark_notifications_read(_: web.Request):
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    cursor.execute("UPDATE notification_history SET read = 1 WHERE read = 0")
    db_connection.commit()
    return web.json_response({"success": True}, headers=VITE_CORS_HEADER)


async def notification_unread_count(_: web.Request):
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    unread_count = cursor.execute("SELECT COUNT(*) FROM notification_history WHERE read = 0").fetchone()[0]
    return web.json_response({"unread_count": unread_count}, headers=VITE_CORS_HEADER)


def create_runner():
    app = web.Application()
    app.add_routes([
        web.get("/", http_handler),
        web.get("/ws", websocket_handler),
        web.get("/state", state),
        web.get("/hourly-chart", hourly_chart),
        web.get("/daily-chart", daily_chart),
        web.get("/monthly-chart", monthly_chart),
        web.get("/yearly-chart", yearly_chart),
        web.get("/total", total),
        web.get("/notification-history", notification_history),
        web.post("/notification-mark-read", mark_notifications_read),
        web.get("/notification-unread-count", notification_unread_count),
        web.static("/", path.join(path.dirname(__file__), "build"))
    ])
    return web.AppRunner(app)


async def start_server(host="127.0.0.1", port=1337):
    runner = create_runner()
    logger.info(f"Start server on {host}:{port}")
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

loop: asyncio.AbstractEventLoop | None = None


def run_http_server():
    global loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_server(
        host=config["HOST"], port=int(config["PORT"])))
    loop.run_forever()


class WebViewer(threading.Thread):
    def __init__(self, _logger: Logger):
        super(WebViewer, self).__init__()
        global logger
        logger = _logger

    def run(self) -> None:
        run_http_server()

    def stop(self) -> None:
        global loop
        if loop is None:
            return
        loop.call_soon_threadsafe(loop.stop)


if __name__ == "__main__":
    run_http_server()
