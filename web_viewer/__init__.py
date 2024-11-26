import asyncio
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
    index_file_path = path.join(path.dirname(__file__), 'public', 'index.html')
    return web.FileResponse(index_file_path)

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
            logger.error("WS connection closed with exception %s" % ws.exception())

    return ws

cors_header = {
    'Access-Control-Allow-Origin': 'http://localhost:5173'}

def state(_: web.Request):
    global last_inverter_data
    res = web.json_response(json.loads(
        last_inverter_data), headers=cors_header)
    return res

def daily_chart(_: web.Request):
    if "DB_NAME" not in config:
        return web.json_response([], headers=cors_header)
    global db_connection
    if db_connection is None:
       db_connection = sqlite3.connect(config["DB_NAME"])
    cursor = db_connection.cursor()
    daily_chart = cursor.execute(
        "SELECT * FROM daily_chart").fetchall()
    res = web.json_response(daily_chart, headers=cors_header)
    return res

def create_runner():
    app = web.Application()
    app.add_routes([
        web.get("/",   http_handler),
        web.get("/ws", websocket_handler),
        web.get("/state", state),
        web.get("/daily-chart", daily_chart),
        web.static("/", path.join(path.dirname(__file__), "public"))
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
