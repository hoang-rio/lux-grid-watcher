pip install --only-binary :all: --no-build-isolation -r requirements.txt
rm -rf aiohttp/aiohttp/_websocket/reader_c.py
cp -r aiohttp/aiohttp/_websocket/reader_py.py aiohttp/aiohttp/_websocket/reader_c.py