import logging
from dotenv import dotenv_values

env = dotenv_values(".env")

ACCOUNT = env["ACCOUNT"]
PASSWORD = env["PASSWORD"]
BASE_URL = 'https://server.luxpowertek.com/WManage'
SLEEP_TIME = 60
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0"
SERIAL_NUM = env["SERIAL_NUM"]
LOG_FILE = 'logs/app.log'
LOG_LEVEL = logging.DEBUG if env["IS_DEBUG"] == "True" else logging.INFO
LOG_FORMAT = "%(asctime)s %(levelname)s:%(name)s: %(message)s"
AUDIO_BASE_URL = env["AUDIO_BASE_URL"]
STATE_FILE = 'grid_connect_state.ini'
MAX_RETRY_COUNT = 3
DEVICE_NAME = env["DEVICE_NAME"]
