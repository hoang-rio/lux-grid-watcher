## About
A python script allow watch Luxpower SNA inverter in realtime. Tested in Luxpower SNA 6k

## Configuration
* Copy `.env.example` to `.env`
* Update configuration in `.env` with your info

## Installation and run
* Sync gitsubmodule with `git submodule init && git submodule update`
* Python 3 required
* Setup python venv with `python -m venv venv`
* Active python venv `source venv/Scripts/activate` on git-bash Windows or `source venv/bin/active` on Unix/Linux
* Install dependencies with `pip install -r requirements.txt` or `./pip-binary-install.sh`
* Run application with `python app.py`

## Notification app
You can implement notification app for Android/iOS by your self and push Firebase Device ID to devices.json file to get notification when grid connect state change.

I also developed an app for Android/iOS. If you need it feel free to contact me

## Webviewer
* Build FE with command `cd web_viewer/fe_src && yarn install && yarn build`
* Now you can see LuxPower realtime webviewer in http://locahost:88 (This url can be change by modify variable in `.env` file) like image bellow.

<center>
<picture style="max-width: 800px">
    <source srcset="misc/screenshot-light.png" media="(prefers-color-scheme: light)"/>
    <source srcset="misc/screenshot-dark.png"  media="(prefers-color-scheme: dark)"/>
    <img src="misc/screenshot-light.png"/>
</picture>
</center>

## Third-party

Thanks to [@celsworth](https://github.com/celsworth) by awesome project [celsworth/lxp-packet](https://github.com/celsworth/lxp-packet) *(has been deleted)* and [celsworth/lxp-bridge](https://github.com/celsworth/lxp-bridge) (under MIT License)
