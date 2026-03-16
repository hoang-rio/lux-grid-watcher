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
from typing import List, Optional
from base64 import b64decode
from html import escape

from api_storage import read_grid_state, register_device_token

# Load config from .env and environment
config: dict = {**dotenv_values(".env"), **environ}

logger: Logger = getLogger(__file__)

_db_conn: Optional[sqlite3.Connection] = None

def get_db_connection() -> sqlite3.Connection:
    global _db_conn
    if _db_conn is None:
        db_name = config.get("DB_NAME")
        if not db_name:
            raise RuntimeError("DB_NAME not set in config")
        _db_conn = sqlite3.connect(db_name, check_same_thread=False)
    return _db_conn

def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

# SSE state
sse_clients: List[web.StreamResponse] = []
last_inverter_data: str = '{"inverter_data": {}}'

async def http_handler(_: web.Request):
    index_file_path = path.join(path.dirname(__file__), 'build', 'index.html')
    return web.FileResponse(index_file_path, headers={"expires": "0", "cache-control": "no-cache"})

async def sse_handler(request):
    global sse_clients
    response = web.StreamResponse()
    response.headers['Content-Type'] = 'text/event-stream'
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Cache-Control'
    await response.prepare(request)
    sse_clients.append(response)
    logger.debug(f"SSE_CLIENTS count: {len(sse_clients)}")
    try:
        # Keep the connection open with keep-alive
        await response.write(b': keep-alive\n\n')
        # Keep the connection alive indefinitely
        # The connection will be closed when client disconnects or server shuts down
        while True:
            await asyncio.sleep(30)  # Send keep-alive every 30 seconds
            try:
                await response.write(b': keep-alive\n\n')
            except Exception:
                # Client disconnected
                break
    except Exception as e:
        logger.error(f"SSE connection error: {e}")
    finally:
        if response in sse_clients:
            sse_clients.remove(response)
    return response

async def broadcast_sse(data: str):
    global sse_clients
    for client in sse_clients[:]:
        try:
            await client.write(f"data: {data}\n\n".encode('utf-8'))
        except Exception as e:
            logger.error(f"Error sending to SSE client: {e}")
            if client in sse_clients:
                sse_clients.remove(client)

async def websocket_handler(request):
    global last_inverter_data
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    try:
        async for msg in ws:
            logger.debug("[WS Server] received message")
            logger.debug(msg)
            if msg.type == aiohttp.WSMsgType.TEXT:
                if "inverter_data" in msg.data:
                    last_inverter_data = msg.data
                await broadcast_sse(msg.data)
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error(f"WS connection closed with exception {ws.exception()}")
    finally:
        pass
    return ws

VITE_CORS_HEADER = {'Access-Control-Allow-Origin': '*'}

async def state(_: web.Request):
    global last_inverter_data
    try:
        data = json.loads(last_inverter_data)["inverter_data"]
    except Exception:
        data = {}
    return web.json_response(data, headers=VITE_CORS_HEADER)


async def mobile_state(_: web.Request):
    try:
        state_file = config.get("STATE_FILE", "grid_connect_state.ini")
        history_file = config.get("HISTORY_FILE", "history.json")
        return web.json_response(
            read_grid_state(state_file, history_file),
            headers=VITE_CORS_HEADER,
        )
    except Exception as error:
        logger.error(f"Error in mobile_state: {error}")
        return web.json_response(
            {"is_connected": False, "history": []},
            headers=VITE_CORS_HEADER,
        )


async def register_fcm(request: web.Request):
    try:
        token = ""
        if request.can_read_body:
            content_type = request.content_type.lower() if request.content_type else ""
            if content_type == "application/json":
                payload = await request.json()
                if isinstance(payload, dict):
                    token = str(payload.get("token", ""))
            else:
                payload = await request.post()
                token = str(payload.get("token", ""))

        result = register_device_token(
            config.get("DEVICE_IDS_JSON_FILE", "devices.json"),
            token,
        )
        status = 200 if result["is_success"] else 400
        return web.json_response(result, status=status, headers=VITE_CORS_HEADER)
    except Exception as error:
        logger.error(f"Error in register_fcm: {error}")
        return web.json_response(
            {
                "is_success": False,
                "message": f"Got exception {error}",
                "device_count": 0,
            },
            status=500,
            headers=VITE_CORS_HEADER,
        )



# Reusable CORS handler for OPTIONS endpoints
def cors_options_handler(allowed_methods: str = "GET, POST, OPTIONS"):
    async def handler(_: web.Request):
        return web.Response(headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": allowed_methods,
            "Access-Control-Allow-Headers": "Content-Type",
        })
    return handler

async def hourly_chart(request: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        date_str = request.rel_url.query.get('date')
        if date_str:
            try:
                query_date = datetime.strptime(date_str, "%Y-%m-%d")
            except Exception:
                query_date = datetime.now()
        else:
            query_date = datetime.now()
        start_of_day = query_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        hourly_chart = cursor.execute(
            "SELECT * FROM hourly_chart WHERE datetime >= ? AND datetime < ?",
            (start_of_day.strftime("%Y-%m-%d %H:%M:%S"), end_of_day.strftime("%Y-%m-%d %H:%M:%S"))
        ).fetchall()
        return web.json_response(hourly_chart, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in hourly_chart: {e}")
        return web.json_response([], headers=VITE_CORS_HEADER)

async def total(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.row_factory = dict_factory
        total = cursor.execute(
            "SELECT SUM(pv) as pv, SUM(battery_charged) as battery_charged, SUM(battery_discharged) as battery_discharged, SUM(grid_import) as grid_import, SUM(grid_export) as grid_export, SUM(consumption) as consumption FROM daily_chart"
        ).fetchone()
        return web.json_response(total, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in total: {e}")
        return web.json_response({}, headers=VITE_CORS_HEADER)

async def daily_chart(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        request = _
        month_str = request.rel_url.query.get('month')
        if month_str:
            # Expect format YYYY-MM
            try:
                year, month = map(int, month_str.split('-'))
                query_date = datetime(year, month, 1)
            except Exception:
                query_date = datetime.now()
                year = query_date.year
                month = query_date.month
        else:
            query_date = datetime.now()
            year = query_date.year
            month = query_date.month
        daily_chart = cursor.execute(
            "SELECT * FROM daily_chart WHERE year = ? AND month = ?",
            (year, month)
        ).fetchall()
        # Fill empty data to daily_chart from last item to last day of month
        if daily_chart:
            last_day_of_month = (query_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
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
        return web.json_response(daily_chart, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in daily_chart: {e}")
        return web.json_response([], headers=VITE_CORS_HEADER)

async def monthly_chart(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now()
        monthly_chart = cursor.execute(
            "SELECT id, id, id, month || '/' || year as month, SUM(pv), SUM(battery_charged), SUM(battery_discharged), SUM(grid_import), SUM(grid_export), SUM(consumption) FROM daily_chart WHERE year = ? GROUP BY month",
            (now.year,)
        ).fetchall()
        return web.json_response(monthly_chart, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in monthly_chart: {e}")
        return web.json_response([], headers=VITE_CORS_HEADER)

async def yearly_chart(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        yearly_chart = cursor.execute(
            "SELECT id, id, id, year || '' as year, SUM(pv), SUM(battery_charged), SUM(battery_discharged), SUM(grid_import), SUM(grid_export), SUM(consumption) FROM daily_chart GROUP BY year"
        ).fetchall()
        return web.json_response(yearly_chart, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in yearly_chart: {e}")
        return web.json_response([], headers=VITE_CORS_HEADER)

async def notification_history(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        notifications = cursor.execute(
            "SELECT id, title, body, notified_at, read FROM notification_history ORDER BY notified_at DESC"
        ).fetchall()
        data = [
            {"id": row[0], "title": row[1], "body": row[2], "notified_at": row[3], "read": row[4]}
            for row in notifications
        ]
        return web.json_response({"notifications": data}, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in notification_history: {e}")
        return web.json_response({"notifications": []}, headers=VITE_CORS_HEADER)

async def mark_notifications_read(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE notification_history SET read = 1 WHERE read = 0")
        conn.commit()
        return web.json_response({"success": True}, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in mark_notifications_read: {e}")
        return web.json_response({"success": False}, headers=VITE_CORS_HEADER)

async def notification_unread_count(_: web.Request):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        unread_count = cursor.execute("SELECT COUNT(*) FROM notification_history WHERE read = 0").fetchone()[0]
        return web.json_response({"unread_count": unread_count}, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in notification_unread_count: {e}")
        return web.json_response({"unread_count": 0}, headers=VITE_CORS_HEADER)

async def get_settings(_: web.Request):
    try:
        import settings
        return web.json_response(settings.settings, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in get_settings: {e}")
        return web.json_response({}, headers=VITE_CORS_HEADER)

async def update_settings(request: web.Request):
    try:
        data = await request.json()
        conn = get_db_connection()
        import settings
        for key, value in data.items():
            settings.save_setting(key, value, conn)
        return web.json_response({"success": True}, headers=VITE_CORS_HEADER)
    except Exception as e:
        logger.error(f"Error in update_settings: {e}")
        return web.json_response({"success": False}, headers=VITE_CORS_HEADER)

async def options_settings(_: web.Request):
    return web.Response(headers={
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    })


def _auth_html_response(status: int, title: str, message: str, include_www_authenticate: bool = False) -> web.Response:
        """Return a small friendly HTML response for auth errors."""
        safe_title = escape(title)
        safe_message = escape(message)
        body = f"""
        <!doctype html>
        <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <title>{safe_title}</title>
                <style>body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.4;margin:24px;color:#222}}h2{{margin-top:0}}.hint{{color:#666;font-size:0.9em}}</style>
            </head>
            <body>
                <h2>{safe_title}</h2>
                <p>{safe_message}</p>
                <p class="hint">If you are the device owner you can update authentication in the <strong>Settings</strong> panel of this web viewer.</p>
            </body>
        </html>
        """
        headers = {}
        if include_www_authenticate:
                headers["WWW-Authenticate"] = "Basic realm='WebViewer'"
        return web.Response(status=status, text=body, content_type='text/html', headers=headers)

# --- Basic Auth Middleware (reads auth settings dynamically) ---
@web.middleware
async def basic_auth_middleware(request, handler):
    # Allow access to /ws only if from loopback
    if request.path == "/ws":
        peer = request.transport.get_extra_info("peername")
        if peer:
            ip = peer[0]
            if ip == "127.0.0.1" or ip == "::1":
                return await handler(request)
            else:
                return _auth_html_response(403, "Forbidden", "Access to the websocket endpoint is restricted to localhost.")
    # Read auth settings from persistent `settings` (updated by web UI).
    try:
        import settings as app_settings
        auth_enabled = app_settings.get_setting("AUTH_ENABLED", config.get("AUTH_ENABLED", "false")).lower() == "true"
        auth_username = app_settings.get_setting("AUTH_USERNAME", config.get("AUTH_USERNAME", "admin"))
        auth_password = app_settings.get_setting("AUTH_PASSWORD", config.get("AUTH_PASSWORD", "changeme"))
    except Exception:
        # Fallback to env/config if settings module not available for any reason
        auth_enabled = config.get("AUTH_ENABLED", "false").lower() == "true"
        auth_username = config.get("AUTH_USERNAME", "admin")
        auth_password = config.get("AUTH_PASSWORD", "changeme")

    if not auth_enabled:
        return await handler(request)
    if request.method == "OPTIONS":
        return await handler(request)
    # Allow unauthenticated access to static files
    if request.path.startswith("/static") or request.path.startswith("/build"):
        return await handler(request)
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Basic "):
        return _auth_html_response(401, "Authentication required", "This web viewer is protected. Please provide HTTP Basic credentials.", include_www_authenticate=True)
    try:
        encoded = auth_header.split(" ", 1)[1]
        decoded = b64decode(encoded).decode()
        username, password = decoded.split(":", 1)
    except Exception:
        return _auth_html_response(401, "Invalid authentication", "Invalid Authorization header. Please provide valid HTTP Basic credentials.", include_www_authenticate=True)
    if username != auth_username or password != auth_password:
        return _auth_html_response(401, "Invalid credentials", "The username or password you provided is incorrect.", include_www_authenticate=True)
    return await handler(request)

def create_runner():
    app = web.Application(middlewares=[basic_auth_middleware])
    app.add_routes([
        web.get("/", http_handler),
        web.get("/ws", websocket_handler),
        web.get("/events", sse_handler),
        web.get("/state", state),
        web.get("/mobile/state", mobile_state),
        web.post("/fcm/register", register_fcm),
        web.options("/fcm/register", cors_options_handler("POST, OPTIONS")),
        web.get("/hourly-chart", hourly_chart),
        web.get("/daily-chart", daily_chart),
        web.get("/monthly-chart", monthly_chart),
        web.get("/yearly-chart", yearly_chart),
        web.get("/total", total),
        web.get("/notification-history", notification_history),
        web.post("/notification-mark-read", mark_notifications_read),
        web.get("/notification-unread-count", notification_unread_count),
        web.get("/settings", get_settings),
        web.post("/settings", update_settings),
        web.options("/settings", cors_options_handler("GET, POST, OPTIONS")),
        web.static("/", path.join(path.dirname(__file__), "build"))
    ])
    return web.AppRunner(app, access_log=None)

async def start_server(host="127.0.0.1", port=1337):
    runner = create_runner()
    logger.info(f"Start server on {host}:{port}")
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()

loop: Optional[asyncio.AbstractEventLoop] = None

def run_http_server():
    global loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    host = config.get("HOST", "127.0.0.1")
    port = int(config.get("PORT", 1337))
    # Start primary server (IPv4 or hostname)
    loop.run_until_complete(start_server(host=host, port=port))

    # If HOST_IPV6 is configured, start a second server bound to that IPv6 address
    # using the same port as requested.
    host_ipv6 = config.get("HOST_IPV6")
    if host_ipv6:
        try:
            ipv6_port = port  # explicitly use same port for both
            loop.run_until_complete(start_server(host=host_ipv6, port=ipv6_port))
        except Exception as e:
            logger.error(f"Failed to start IPv6 server on {host_ipv6}:{port} - {e}")
    loop.run_forever()

class WebViewer(threading.Thread):
    def __init__(self, _logger: Logger):
        super().__init__()
        global logger
        logger = _logger

    def run(self) -> None:
        run_http_server()

    def stop(self) -> None:
        global loop
        if loop is not None:
            loop.call_soon_threadsafe(loop.stop)

if __name__ == "__main__":
    run_http_server()
