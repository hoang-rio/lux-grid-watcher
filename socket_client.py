import socket


def connect(host: str, port: int) -> socket.socket:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_address = (host, port)
    print('connecting to socket ' + str(server_address))
    s.settimeout(3)
    s.connect(server_address)
    return s
