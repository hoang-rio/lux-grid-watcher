from aiohttp.aiohttp import ClientSession, ClientWebSocketResponse
import asyncio
from aiohttp import aiohttp
from logging import Logger
import threading

class WebSocketClient(threading.Thread):
    __ws: ClientWebSocketResponse | None = None
    __logger: Logger
    __host: str
    __port: int

    def __init__(self, logger: Logger, host: str, port: int) -> None:
        super(WebSocketClient, self).__init__()
        self.__logger = logger
        self.__host = host
        self.__port = port

    def run(self) -> None:
        asyncio.run(self.connect())

    async def stop(self) -> None:
        if self.__ws is not None and not self.__ws.closed:
            await self.__ws.close()

    async def send_json(self, data):
        if self.__ws is not None and not self.__ws.closed:
            try:
                await self.__ws.send_json(data=data)
            except Exception as e:
                self.__logger.exception("Error when send message", e)
                await self.connect()
        else:
            self.__logger.error("Web socket client did not initial or closed")
            await self.connect()

    async def connect(self):
        async with ClientSession() as session:
            async with session.ws_connect(f"http://{self.__host}:{self.__port}/ws") as ws:
                self.__ws = ws
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        self.__logger.debug("[WS Client] receive data")
                        self.__logger.debug(msg.data)
                    elif msg.type == aiohttp.WSMsgType.ERROR:
                        break
