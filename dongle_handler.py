
from socket import socket
import socket_client
from datetime import datetime
import logging
from typing_extensions import Optional


class Dongle():
    __client: socket
    __config: dict
    __logger: logging.Logger

    def __init__(self, logger: logging.Logger, config: dict) -> None:
        self.__config = config
        self.__client = socket_client.connect(
            config["DONGLE_TCP_HOST"], int(config["DONGLE_TCP_PORT"]))
        self.__logger = logger

    def get_dongle_input(self) -> Optional[dict]:
        try:
            # TCP Header to dataTranslated readInput1
            msg = [161, 26, 1, 0, 32, 0, 1, 194]
            dongle_serial_arr = bytearray(
                str(self.__config["DONGLE_SERIAL"]).encode())
            # Dongle SERIAL
            msg.extend(dongle_serial_arr)
            # msg.extend([66, 65, 51, 50, 56, 48, 49, 49, 54, 52])
            msg.extend([18, 0, 0, 4])
            # INVERTER SERIAL
            invert_serial_arr = bytearray(
                str(self.__config["INVERT_SERIAL"]).encode())
            msg.extend(invert_serial_arr)
            # msg.extend([51, 53, 48, 51, 54, 56, 48, 49, 54, 49])
            msg.extend([0, 0, 40, 0, 226, 149])
            self.__client.send(bytes(msg))
            data = self.__client.recv(1024)
            self.__logger.debug("Server: %s", list(data))
            if Dongle.toInt(data[32:34]) == 0:
                parsed_data = Dongle.readInput1(list(data))
                self.__logger.debug("Parsed data: %s", parsed_data)
                parsed_data['deviceTime'] = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S")
                return parsed_data
            else:
                self.__logger.info("Not Input1 data. Skip")
                return None
        except Exception as e:
            self.__logger.exception(
                "Get exception when get_dongle_input %s", e)
            return None

    @staticmethod
    def toInt(ints: list[int]):
        return sum(b << (idx * 8) for idx, b in enumerate(ints))

    @staticmethod
    def readInput1(input: list[int]):
        # Remove header + checksum
        data = input[20: len(input) - 2]
        return {
            # 0 = static 1
            # 1 = R_INPUT
            # 2..12 = serial
            # 13/14 = length

            "status": Dongle.toInt(data[15:15 + 2]),

            "v_pv_1": Dongle.toInt(data[17:17 + 2]) / 10.0,  # V
            "v_pv_2": Dongle.toInt(data[19:19 + 2]) / 10.0,  # V
            "v_pv_3": Dongle.toInt(data[21:21 + 2]) / 10.0,  # V

            "v_bat": Dongle.toInt(data[23:23 + 2]) / 10.0,  # V
            "soc": data[25],  # %
            # 26 used for anything?

            # 27 always been 0 so far
            # 28 I've seen anything from 0 to 53, changes occasionally but
            # not spotted a pattern yet.
            "_unknown_i1_27": data[27],
            "_unknown_i1_28": data[28],

            # this might be useless if 27 and 28 are independent
            "_unknown_i1_27_28": Dongle.toInt(data[27:27 + 2]),

            # W
            "p_pv": Dongle.toInt(data[29:29 + 2]) + Dongle.toInt(data[31:31 + 2]) + Dongle.toInt(data[33:33 + 2]),
            "p_pv_1": Dongle.toInt(data[29:29 + 2]),  # W
            "p_pv_2": Dongle.toInt(data[31:31 + 2]),  # W
            "p_pv_3": Dongle.toInt(data[33:33 + 2]),  # W
            "p_charge": Dongle.toInt(data[35:35 + 2]),  # W
            "p_discharge": Dongle.toInt(data[37:37 + 2]),  # W
            "vacr": Dongle.toInt(data[39:39 + 2]),  # / 10.0 V
            "vacs": Dongle.toInt(data[41:41 + 2]),  # / 10.0 V
            "vact": Dongle.toInt(data[43:43 + 2]),  # / 10.0 V
            "fac": Dongle.toInt(data[45:45 + 2]),  # / 100.0 Hz

            "p_inv": Dongle.toInt(data[47:47 + 2]),  # W
            "p_rec": Dongle.toInt(data[49:49 + 2]),  # W

            # this seems to track with charge/discharge but at lower values.
            # no idea what this means.
            "_unknown_i1_51_52": Dongle.toInt(data[51:51 + 2]),  # W ?

            "pf": Dongle.toInt(data[53:53 + 2]) / 1000.0,  # Hz

            "v_eps_r": Dongle.toInt(data[55:55 + 2]) / 10.0,  # V
            "v_eps_s": Dongle.toInt(data[57:57 + 2]) / 10.0,  # V
            "v_eps_t": Dongle.toInt(data[59:59 + 2]) / 10.0,  # V
            "f_eps": Dongle.toInt(data[61:61 + 2]) / 100.0,  # Hz

            # peps and seps in 63..66?

            "p_to_grid": Dongle.toInt(data[67:67 + 2]),  # W
            "p_to_user": Dongle.toInt(data[69:69 + 2]),  # W

            "e_pv_day": (Dongle.toInt(data[71:71 + 2]) +
                         Dongle.toInt(data[73:73 + 2]) + Dongle.toInt(data[75:75 + 2])) / 10.0,  # kWh
            "e_pv_1_day": Dongle.toInt(data[71:71 + 2]) / 10.0,  # kWh
            "e_pv_2_day": Dongle.toInt(data[73:73 + 2]) / 10.0,  # kWh
            "e_pv_3_day": Dongle.toInt(data[75:75 + 2]) / 10.0,  # kWh
            "e_inv_day": Dongle.toInt(data[77:77 + 2]) / 10.0,  # kWh
            "e_rec_day": Dongle.toInt(data[79:79 + 2]) / 10.0,  # kWh
            "e_chg_day": Dongle.toInt(data[81:81 + 2]) / 10.0,  # kWh
            "e_dischg_day": Dongle.toInt(data[83:83 + 2]) / 10.0,  # kWh
            "e_eps_day": Dongle.toInt(data[85:85 + 2]) / 10.0,  # kWh
            "e_to_grid_day": Dongle.toInt(data[87:87 + 2]) / 10.0,  # kWh
            "e_to_user_day": Dongle.toInt(data[89:89 + 2]) / 10.0,  # kWh

            "v_bus_1": Dongle.toInt(data[91:91 + 2]) / 10.0,  # V
            "v_bus_2": Dongle.toInt(data[93:93 + 2]) / 10.0  # V
        }
