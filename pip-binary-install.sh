echo "Starting to install requirements.txt..."
source venv/bin/activate
pip install --upgrade pip
pip install --only-binary :all: --no-build-isolation -r requirements.txt