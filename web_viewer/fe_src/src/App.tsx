import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { IInverterData } from "./Intefaces";
import SystemInformation from "./components/SystemInformation";

const MAX_RECONNECT_COUNT = 3;

function App() {
  const [inverterData, setInverterData] = useState<IInverterData>();
  const socketRef = useRef<WebSocket>();
  const selfCloseRef = useRef<boolean>(false);
  const reconnectCountRef = useRef<number>(0);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(true);

  const connectSocket = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.CONNECTING || !socketRef.current.CLOSED)
    ) {
      return;
    }
    console.log("[Socket] Connecting to socket server...");
    // Create WebSocket connection.
    const socket = new WebSocket(`${import.meta.env.VITE_API_BASE_URL}/ws`);
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener("open", () => {
      reconnectCountRef.current = 0;
      console.log("[Socket] Connected to server");
      document.title = import.meta.env.VITE_APP_TITLE;
      setIsSocketConnected(true);
    });

    // Listen for messages
    socket.addEventListener("message", (event) => {
      const jsonData = JSON.parse(event.data);
      setInverterData(jsonData);
    });
    socket.addEventListener("close", () => {
      document.title = `[Offline] ${import.meta.env.VITE_APP_TITLE}`;
      setIsSocketConnected(false);
      if (selfCloseRef.current || socketRef.current?.CONNECTING) {
        return;
      }
      if (reconnectCountRef.current >= MAX_RECONNECT_COUNT) {
        console.warn("[Socket] stop reconnect by reached MAX_RECONNECT_COUNT");
        return;
      }
      reconnectCountRef.current++;
      console.log(
        "[Socket] connection closed. Reconnecting (%s)...",
        reconnectCountRef.current
      );
      connectSocket();
    });
    socket.addEventListener("error", (event) => {
      console.error("[Socket] socket error", event);
    });
  }, [setInverterData, setIsSocketConnected]);

  const closeSocket = useCallback(() => {
    selfCloseRef.current = true;
    socketRef.current?.close();
  }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/state`)
      .then((res) => res.json())
      .then((json) => {
        setInverterData(json);
      })
      .catch((err) => {
        console.error("API get state error", err);
      });
    selfCloseRef.current = false;
    connectSocket();
    window.addEventListener("beforeunload", closeSocket);
    document.addEventListener("visibilitychange", () => {
      if (
        !document.hidden &&
        reconnectCountRef.current >= MAX_RECONNECT_COUNT
      ) {
        reconnectCountRef.current = 0;
        console.warn("[Socket] reconnect when window active again");
        connectSocket();
      }
    });
    return closeSocket;
  }, [connectSocket, closeSocket]);

  return (
    <>
      {inverterData && (
        <>
          <SystemInformation inverterData={inverterData} isSocketConnected={isSocketConnected} onReconnect={connectSocket}/>
        </>
      )}
    </>
  );
}

export default App;
