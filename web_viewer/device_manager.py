from aiohttp.aiohttp import web
def register(request: web.Request):
    print(request.path)
