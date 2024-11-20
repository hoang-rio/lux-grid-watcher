import asyncio
import threading
from aiohttp import web, WSCloseCode
import aiohttp
from os import environ, path

from dotenv import dotenv_values


config: dict = {
    **dotenv_values(".env"),
    **environ
}

async def http_handler(request: web.Request):
    index_file_path = path.join(path.dirname(__file__), 'public', 'index.html')
    return web.FileResponse(index_file_path)


async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    async for msg in ws:
        if msg.type == aiohttp.WSMsgType.TEXT:
            if msg.data == "close":
                await ws.close()
            else:
                await ws.send_str("some websocket message payload")
        elif msg.type == aiohttp.WSMsgType.ERROR:
            print("ws connection closed with exception %s" % ws.exception())

    return ws


def create_runner():
    app = web.Application()
    app.add_routes([
        web.get("/",   http_handler),
        web.get("/ws", websocket_handler),
        web.static("/", path.join(path.dirname(__file__), "public"))
    ])
    return web.AppRunner(app)


async def start_server(host="127.0.0.1", port=1337):
    runner = create_runner()
    print(f"Start server on {config["HOST"]}:{config["PORT"]}")
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

def run_http_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_server(
        host=config["HOST"], port=int(config["PORT"])))
    loop.run_forever()


class WebViewer(threading.Thread):
    def run(self) -> None:
        run_http_server()


if __name__ == "__main__":
    run_http_server()
