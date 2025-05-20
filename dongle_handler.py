
from socket import socket
import socket_client
from datetime import datetime
import logging
from typing_extensions import Optional

STATUS_MAP: dict = {
    0: "idle / standby",
    0x01: "fault",
    0x02: "programming",
    0x04: "pv supporting load first, surplus into grid",
    0x08: "pv charging battery",
    0x10: "discharge battery to support load, surplus into grid",
    0x14: "pv + battery discharging to support load, surplus into grid",
    0x20: "ac charging battery",
    0x28: "pv + ac charging battery",
    0x40: "battery powering EPS(grid off)",
    0x80: "pv not sufficient to power EPS? (grid off)",
    0xc0: "pv + battery powering EPS(grid off)",
    0x88: "pv powering EPS(grid off), surplus stored in battery",
}

TCP_FUNCTION_TRANSLATE = 194

class Dongle():
    __client: socket | None = None
    __config: dict
    __logger: logging.Logger

    def __init__(self, logger: logging.Logger, config: dict) -> None:
        self.__config = config
        self.__logger = logger
        self.__connect_socket()

    def __connect_socket(self):
        try:
            self.__client = socket_client.connect(
                self.__config["DONGLE_TCP_HOST"],
                int(self.__config["DONGLE_TCP_PORT"])
            )
        except Exception as e:
            self.__logger.exception("Got exception when connect socket %s", e)

    def get_dongle_input(self) -> Optional[dict]:
        try:
            self.__logger.info("Start get dongle input")
            # TCP Header to dataTranslated readInput1 with TCP_PROTOCOL_V1
            TCP_PROTOCOL_V1 = 1
            msg = [161, 26, TCP_PROTOCOL_V1, 0, 32, 0, 1, 194]
            dongle_serial_arr = bytearray(
                str(self.__config["DONGLE_SERIAL"]).encode()
            )
            # Dongle SERIAL
            msg.extend(dongle_serial_arr)
            msg.extend([18, 0, 0, 4])
            # INVERTER SERIAL
            invert_serial_arr = bytearray(
                str(self.__config["INVERT_SERIAL"]).encode()
            )
            msg.extend(invert_serial_arr)
            msg.extend([0, 0, 40, 0, 226, 149])
            if self.__client is None:
                self.__logger.info(
                    "Socket initial error. Re init for next time"
                )
                self.__connect_socket()
                return None
            self.__client.send(bytes(msg))
            data = self.__client.recv(1024)
            self.__logger.debug("Server: %s", list(data))
            if data[0] != 0 and data[7] == TCP_FUNCTION_TRANSLATE and Dongle.toInt(list(data[32:34])) == 0 and len(data) == 117:
                parsed_data = Dongle.readInput1(list(data))
                self.__logger.debug("Parsed data: %s", parsed_data)
                parsed_data['deviceTime'] = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                self.__logger.info("Finish get dongle input")
                if parsed_data["v_bat"] < 40 or parsed_data["v_bat"] > 58:
                    self.__logger.warning(
                        "v_bat must between 40 and must lower than 58. Ignore this result.\nFull result: %s",
                        parsed_data,
                    )
                    return None
                return parsed_data
            else:
                self.__logger.info("Not Input1 data. Skip")
                return None
        except Exception as e:
            self.__logger.exception(
                "Get exception when get_dongle_input: %s", e)
            str_err = str(e)
            if "Broken pipe" in str_err or 'timed out' in str_err:
                self.__connect_socket()
            return None

    @staticmethod
    def toInt(ints: list[int]):
        return sum(b << (idx * 8) for idx, b in enumerate(ints))

    @staticmethod
    def readInput1(input: list[int]):
        # Remove header + checksum
        data = input[20: len(input) - 2]
        status = Dongle.toInt(data[15:15 + 2])
        status_text = "Unknow status"
        if status in STATUS_MAP:
            status_text = STATUS_MAP[status]
        return {
            # 0 = static 1
            # 1 = R_INPUT
            # 2..12 = serial
            # 13/14 = length

            "status": status,
            "status_text": status_text,

            "v_pv_1": Dongle.toInt(data[17:17 + 2]) / 10.0,  # V
            "v_pv_2": Dongle.toInt(data[19:19 + 2]) / 10.0,  # V
            "v_pv_3": Dongle.toInt(data[21:21 + 2]) / 10.0,  # V

            "v_bat": Dongle.toInt(data[23:23 + 2]) / 10.0,  # V
            "soc": data[25],  # %
            "soh": data[26],  # %
            "internal_fault": Dongle.toInt(data[27:27 + 2]),

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

            # IinvRMS https://github.com/celsworth/lxp-bridge/blob/d4d2b14ed12330e62bde6bacc81bbfc4037295ee/src/lxp/packet.rs#L268-L269
            "i_inv_rms": Dongle.toInt(data[51:51 + 2]),  # W ?

            "pf": Dongle.toInt(data[53:53 + 2]) / 1000.0,  # Hz

            "v_eps_r": Dongle.toInt(data[55:55 + 2]) / 10.0,  # V
            "v_eps_s": Dongle.toInt(data[57:57 + 2]) / 10.0,  # V
            "v_eps_t": Dongle.toInt(data[59:59 + 2]) / 10.0,  # V
            "f_eps": Dongle.toInt(data[61:61 + 2]) / 100.0,  # Hz

            "p_eps": Dongle.toInt(data[63:63 + 2]),  # W
            "s_eps": Dongle.toInt(data[65:65 + 2]),  # W

            "p_to_grid": Dongle.toInt(data[67:67 + 2]),  # W
            "p_to_user": Dongle.toInt(data[69:69 + 2]),  # W

            "e_pv_day": (Dongle.toInt(data[71:71 + 2]) +
                         # kWh
                         Dongle.toInt(data[73:73 + 2]) + Dongle.toInt(data[75:75 + 2])) / 10.0,
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
