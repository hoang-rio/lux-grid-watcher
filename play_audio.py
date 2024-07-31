import threading
import pychromecast
import logging
import time


class PlayAudio(threading.Thread):
    __repeat = 3
    __sleep = 5
    __config: dict = {}
    __logger: logging.Logger
    __audio_file: str
    __stop_event: threading.Event

    def __init__(self, audio_file: str, repeat: int, sleep: int, config: dict, logger: logging.Logger):
        super(PlayAudio, self).__init__()
        self.__repeat = repeat
        self.__sleep = sleep
        self.__config = config
        self.__logger = logger
        self.__audio_file = audio_file
        self.__stop_event = threading.Event()

    def stop(self):
        self.__stop_event.set()

    def run(self):
        try:
            chromecast, browser = pychromecast.get_listed_chromecasts(
                [self.__config["CAST_DEVICE_NAME"]],
                tries=3,
                timeout=self.__sleep,
                discovery_timeout=self.__sleep
            )
            if len(chromecast) > 0:
                cast = chromecast[0]
                self.__logger.debug("Cast info: %s", cast.cast_info)
                cast.wait(self.__sleep)
                self.__logger.debug("Cast status: %s", cast.status)
                mediaController = cast.media_controller
                self.__logger.info(
                    "[%s]: Playing on %s %s times repeat",
                    self.__audio_file,
                    self.__config["CAST_DEVICE_NAME"],
                    self.__repeat
                )
                while self.__repeat > 0:
                    if self.__stop_event.is_set():
                        self.__logger.info(
                            "[%s]: Stopped play audio with %s times repeat remaining", self.__audio_file, self.__repeat)
                        browser.stop_discovery()
                        break
                    mediaController.play_media(
                        f"{self.__config['AUDIO_BASE_URL']}/{self.__audio_file}", "audio/mp3")
                    mediaController.block_until_active(self.__sleep)
                    self.__repeat = self.__repeat - 1
                    self.__logger.info(
                        "[%s]: Play times remaining: %s", self.__audio_file, self.__repeat)
                    if self.__repeat > 0:
                        self.__logger.info("[%s]: Wating for %s second before repeat",
                                           self.__audio_file, self.__sleep)
                    time.sleep(self.__sleep)
                self.__logger.debug("MediaControler status: %s",
                                    mediaController.status)
                browser.stop_discovery()
            else:
                self.__logger.info(
                    "[%s]: No device to play audio", self.__audio_file)
        except Exception as e:
            self.__logger.exception(
                "[%s]: Got exception when play audio", self.__audio_file, e)
