import asyncio
import logging
from typing import Optional
import dongle_handler

# Per-user sleep_time cache to avoid repeated DB queries
_sleep_time_cache: dict[str, int] = {}


def _normalize_sleep_time(value, fallback: int = 30) -> int:
    allowed_values = {3, 5, 10, 15, 30}
    try:
        parsed = int(value)
    except Exception:
        parsed = fallback
    return parsed if parsed in allowed_values else fallback


def _resolve_inverter_id(dongle_serial: str, logger: logging.Logger) -> Optional[str]:
    """Look up the PostgreSQL inverter UUID for the given dongle serial.

    Returns the inverter UUID string when found, or None when PostgreSQL is not
    configured or the dongle is not registered.
    """
    try:
        from multi_tenant.db import get_db_session
        from multi_tenant import repository as repo
        session = next(get_db_session())
        try:
            inverter = repo.get_inverter_by_dongle_serial(session, dongle_serial)
            if inverter:
                return str(inverter.id)
        finally:
            session.close()
    except RuntimeError:
        # POSTGRES_DB_URL not configured — multi-tenant mode disabled
        pass
    except Exception as exc:
        logger.warning("Failed to resolve inverter_id for dongle_serial=%s: %s", dongle_serial, exc)
    return None


def _resolve_sleep_time(dongle_serial: str, default_sleep_time: int, logger: logging.Logger) -> int:
    if not dongle_serial:
        return default_sleep_time
    try:
        from multi_tenant.db import get_db_session
        from multi_tenant import repository as repo
        session = next(get_db_session())
        try:
            inverter = repo.get_inverter_by_dongle_serial(session, dongle_serial)
            if inverter is None:
                return default_sleep_time
            
            user_id_str = str(inverter.user_id)
            # Check cache first
            if user_id_str in _sleep_time_cache:
                return _sleep_time_cache[user_id_str]
            
            # Query and cache
            user_sleep_time = repo.get_user_setting(session, inverter.user_id, "SLEEP_TIME")
            cached_value = _normalize_sleep_time(user_sleep_time, default_sleep_time)
            _sleep_time_cache[user_id_str] = cached_value
            return cached_value
        finally:
            session.close()
    except RuntimeError:
        return default_sleep_time
    except Exception as exc:
        logger.warning("Failed to resolve sleep_time for dongle_serial=%s: %s", dongle_serial, exc)
        return default_sleep_time


def clear_sleep_time_cache(user_id: str) -> None:
    """Clear per-user sleep_time cache for the given user_id."""
    try:
        _sleep_time_cache.pop(str(user_id), None)
    except Exception:
        pass


class DongleServer:
    __server: asyncio.Server | None = None
    __config: dict
    __logger: logging.Logger
    __port: int
    __host: str

    def __init__(self, logger: logging.Logger, config: dict) -> None:
        self.__config = config
        self.__logger = logger
        self.__host = config.get("SERVER_MODE_HOST", "0.0.0.0")
        self.__port = int(config.get("SERVER_MODE_PORT", 4346))
        self.__data_queue: asyncio.Queue[dict] = asyncio.Queue()

    async def start_server(self):
        """Start the TCP server to listen for dongle connections."""
        try:
            self.__server = await asyncio.start_server(
                self.__handle_client,
                self.__host,
                self.__port
            )
            self.__logger.info(
                "Dongle server started on %s:%s",
                self.__host,
                self.__port
            )
            async with self.__server:
                await self.__server.serve_forever()
        except Exception as e:
            self.__logger.exception("Failed to start dongle server: %s", e)
            raise

    async def __handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter
    ):
        """Handle incoming client connection from dongle."""
        client_addr = writer.get_extra_info('peername')
        self.__logger.info("Dongle connected from %s", client_addr)

        try:
            dongle_serial = self.__config.get("DONGLE_SERIAL", "")
            inverter_serial = self.__config.get("INVERT_SERIAL", "")
            sleep_time = _normalize_sleep_time(self.__config.get("SLEEP_TIME", 30))
            read_mode = dongle_handler.normalize_read_input_mode(
                self.__config.get("READ_INPUT_MODE", dongle_handler.READ_INPUT_MODE_ALL)
            )
            registers = [0] if read_mode == dongle_handler.READ_INPUT_MODE_INPUT1_ONLY else [0, 40, 80, 120]
            next_register_idx = 0
            all_mode_buffer: dict = {}
            all_mode_received_registers: set[int] = set()

            def build_poll_request(register: int) -> bytes:
                return dongle_handler.Dongle.build_read_input_request(
                    dongle_serial,
                    inverter_serial,
                    register=register,
                    protocol=1,
                )

            request_name = "ReadInput1" if read_mode == dongle_handler.READ_INPUT_MODE_INPUT1_ONLY else "ReadInput1-4"

            def extract_register(raw_data: list[int]) -> int | None:
                if len(raw_data) < 38:
                    return None
                body = raw_data[20: len(raw_data) - 2]
                if len(body) < 14:
                    return None
                return dongle_handler.Dongle.to_int(body[12:14])

            def get_next_register() -> int:
                return registers[next_register_idx % len(registers)]

            def advance_next_register():
                nonlocal next_register_idx
                next_register_idx = (next_register_idx + 1) % len(registers)
            
            if dongle_serial:
                self.__logger.debug(
                    "DONGLE_SERIAL configured (INVERT_SERIAL optional), "
                    "will send %s requests to dongle",
                    request_name,
                )
                # Send ReadInput request immediately when dongle connects
                current_register = get_next_register()
                request = build_poll_request(current_register)
                writer.write(request)
                await writer.drain()
                self.__logger.debug(
                    "Sent %s request (register=%s, protocol 1) to %s immediately",
                    request_name,
                    current_register,
                    client_addr,
                )
                advance_next_register()
            else:
                self.__logger.warning(
                    "DONGLE_SERIAL not configured, "
                    "waiting for dongle to send data"
                )
            
            while True:
                try:
                    # Wait for data from dongle
                    try:
                        data = await asyncio.wait_for(
                            reader.read(1024),
                            timeout=int(self.__config.get("SERVER_MODE_TIMEOUT", 300))
                        )
                    except (ConnectionResetError, ConnectionAbortedError) as e:
                        # Remote peer reset/aborted connection while we were waiting for data
                        self.__logger.info(
                            "Connection reset by peer while reading from %s: %s",
                            client_addr,
                            e
                        )
                        break

                    if not data:
                        self.__logger.info(
                            "Dongle disconnected from %s",
                            client_addr
                        )
                        break

                    self.__logger.debug(
                        "Received %d bytes from %s: %s",
                        len(data),
                        client_addr,
                        list(data)
                    )

                    # Parse the received data
                    raw_data = list(data)
                    parsed_data = self.__parse_inverter_data(raw_data)
                    cycle_complete = False
                    if parsed_data is not None:
                        if not inverter_serial:
                            parsed_inverter_serial = str(parsed_data.get("serial") or "").strip()
                            if parsed_inverter_serial:
                                inverter_serial = parsed_inverter_serial
                                self.__logger.info(
                                    "INVERT_SERIAL auto-updated from parsed dongle data: %s",
                                    inverter_serial,
                                )

                        resolved_dongle_serial = str(parsed_data.get("dongle_serial") or dongle_serial)
                        sleep_time = _resolve_sleep_time(resolved_dongle_serial, sleep_time, self.__logger)
                        if read_mode == dongle_handler.READ_INPUT_MODE_INPUT1_ONLY:
                            await self.__enqueue_inverter_data(parsed_data, client_addr)
                            self.__logger.debug(
                                "Successfully parsed data from %s",
                                client_addr
                            )
                            cycle_complete = True
                        else:
                            register = extract_register(raw_data)
                            if register is not None:
                                all_mode_buffer.update(parsed_data)
                                all_mode_received_registers.add(register)
                                self.__logger.debug(
                                    "Parsed register=%s from %s (%s/4)",
                                    register,
                                    client_addr,
                                    len(all_mode_received_registers),
                                )
                                if all_mode_received_registers.issuperset({0, 40, 80, 120}):
                                    await self.__enqueue_inverter_data(dict(all_mode_buffer), client_addr)
                                    self.__logger.debug(
                                        "Merged ReadInput1-4 data ready from %s",
                                        client_addr,
                                    )
                                    all_mode_buffer = {}
                                    all_mode_received_registers.clear()
                                    cycle_complete = True

                    # Send next ReadInput request after processing
                    if dongle_serial:
                        current_register = get_next_register()
                        request = build_poll_request(current_register)
                        writer.write(request)
                        await writer.drain()
                        self.__logger.debug(
                            "Sent %s request (register=%s) to %s",
                            request_name,
                            current_register,
                            client_addr,
                        )
                        advance_next_register()
                    if cycle_complete:
                        # Only sleep after a complete cycle; in ALL mode the 4 intermediate
                        # register reads now happen back-to-back without unnecessary delay.
                        self.__logger.debug(
                            "Waiting %s seconds before next request to %s",
                            sleep_time,
                            client_addr
                        )
                        await asyncio.sleep(sleep_time)

                except asyncio.TimeoutError:
                    self.__logger.warning(
                        "Timeout waiting for data from %s",
                        client_addr
                    )
                    # Keep polling on timeout in case the previous response was dropped.
                    if dongle_serial:
                        current_register = get_next_register()
                        request = build_poll_request(current_register)
                        writer.write(request)
                        await writer.drain()
                        self.__logger.debug(
                            "Resent %s request (register=%s) to %s after timeout",
                            request_name,
                            current_register,
                            client_addr,
                        )
                        advance_next_register()
                    await asyncio.sleep(sleep_time)
                except Exception as e:
                    self.__logger.exception(
                        "Error handling data from %s: %s",
                        client_addr,
                        e
                    )
                    break

        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except ConnectionResetError:
                # Remote peer reset connection while we were closing; ignore
                self.__logger.debug(
                    "Connection reset by peer while closing connection from %s",
                    client_addr
                )
            except Exception as e:
                self.__logger.debug(
                    "Exception while closing connection from %s: %s",
                    client_addr,
                    e
                )
            self.__logger.info("Connection from %s closed", client_addr)

    def __parse_inverter_data(self, data: list[int]) -> Optional[dict]:
        """Parse raw data from dongle - supports all ReadInput types (1-4 and All)."""
        try:
            # Validate basic TCP frame format
            if len(data) < 38:
                self.__logger.debug(
                    "Received data too short: %d bytes", len(data)
                )
                return None
            
            if data[0] == 0:
                self.__logger.debug(
                    "Received data starts with 0, skipping"
                )
                return None
            
            if data[7] != dongle_handler.TCP_FUNCTION_TRANSLATE:
                self.__logger.debug(
                    "Received data is not TranslatedData function: %s",
                    data[7] if len(data) > 7 else "N/A"
                )
                return None

            # Try to auto-detect and parse any ReadInput type
            parsed_data = dongle_handler.Dongle.read_input(data)
            
            if parsed_data is not None:
                # Add device timestamp
                from datetime import datetime
                parsed_data['deviceTime'] = datetime.now().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )

                # Log input type if available
                input_type = parsed_data.get("input_type", "input1")
                self.__logger.debug(
                    "Successfully parsed %s data from dongle",
                    input_type
                )
                self.__logger.debug("Parsed data: %s", parsed_data)

                # Validate battery voltage if present
                if "v_bat" in parsed_data:
                    if parsed_data["v_bat"] < 40 or parsed_data["v_bat"] > 58:
                        self.__logger.warning(
                            "v_bat should be between 40V and 58V. "
                            "Inverter may not work properly. Parsed data: %s",
                            parsed_data
                        )

                return parsed_data
            else:
                # Fallback: try ReadInput1 directly for backward compatibility
                data_len = len(data)
                register = None
                try:
                    body = data[20: len(data) - 2]
                    if len(body) >= 14:
                        register = dongle_handler.Dongle.to_int(body[12:14])
                except Exception:
                    register = None

                if data_len == 117 and register == 0:
                    parsed_data = dongle_handler.Dongle.read_input1(data)
                    if parsed_data is not None:
                        from datetime import datetime
                        parsed_data['deviceTime'] = datetime.now().strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                        self.__logger.info(
                            "Parsed data using ReadInput1 fallback"
                        )
                        return parsed_data
                
                self.__logger.debug(
                    "Received data could not be parsed. "
                    "Length: %d, First byte: %s, Function: %s",
                    len(data),
                    data[0] if data else "N/A",
                    data[7] if len(data) > 7 else "N/A"
                )
                return None
        except Exception as e:
            self.__logger.exception("Failed to parse inverter data: %s", e)
            return None

    async def __enqueue_inverter_data(self, data: dict, client_addr) -> None:
        """Queue parsed inverter data so client handlers never overwrite each other.

        Tags ``_inverter_id`` in the dict when the dongle is registered in PostgreSQL.
        """
        dongle_serial = data.get("dongle_serial") or data.get("serial", "")
        if dongle_serial:
            inverter_id = _resolve_inverter_id(dongle_serial, self.__logger)
            if inverter_id:
                data = dict(data)  # avoid mutating the shared all_mode_buffer
                data["_inverter_id"] = inverter_id
                self.__logger.info(
                    "Resolved inverter_id=%s for dongle_serial=%s", inverter_id, dongle_serial
                )
        await self.__data_queue.put(data)
        self.__logger.debug(
            "Queued inverter data from %s. Pending queue size: %s",
            client_addr,
            self.__data_queue.qsize(),
        )

    async def wait_for_data(
        self,
        timeout: Optional[float] = None
    ) -> Optional[dict]:
        """Wait for next queued dongle payload with optional timeout."""
        try:
            return await asyncio.wait_for(self.__data_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    def get_pending_data(self) -> Optional[dict]:
        """Return queued payload immediately without blocking."""
        try:
            return self.__data_queue.get_nowait()
        except asyncio.QueueEmpty:
            return None

    async def stop_server(self):
        """Stop the TCP server."""
        if self.__server is not None:
            self.__server.close()
            await self.__server.wait_closed()
            self.__logger.info("Dongle server stopped")