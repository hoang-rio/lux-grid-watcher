import json
from os import path
from typing import Any


def load_device_tokens(device_file: str) -> list[str]:
    if not path.exists(device_file):
        return []

    with open(device_file, "r") as file_handle:
        data = json.load(file_handle)

    if not isinstance(data, list):
        return []

    return [str(item) for item in data if isinstance(item, str) and item.strip()]


def save_device_tokens(device_file: str, devices: list[str]) -> None:
    with open(device_file, "w") as file_handle:
        json.dump(devices, file_handle)


def register_device_token(device_file: str, token: str) -> dict[str, Any]:
    normalized_token = token.strip()
    if normalized_token == "":
        return {
            "is_success": False,
            "message": "Missing required parameter 'token'",
            "device_count": 0,
        }

    devices = load_device_tokens(device_file)
    if normalized_token in devices:
        return {
            "is_success": False,
            "message": "Device already register",
            "device_count": len(devices),
        }

    devices.append(normalized_token)
    save_device_tokens(device_file, devices)
    return {
        "is_success": True,
        "message": "Device register success",
        "device_count": len(devices),
    }


def read_grid_state(state_file: str, history_file: str) -> dict[str, Any]:
    is_connected = False
    if path.exists(state_file):
        with open(state_file, "r") as file_handle:
            is_connected = file_handle.read().strip() == "True"

    history: list[Any] = []
    if path.exists(history_file):
        with open(history_file, "r") as file_handle:
            loaded_history = json.load(file_handle)
            if isinstance(loaded_history, list):
                history = loaded_history

    return {
        "is_connected": is_connected,
        "history": history,
    }