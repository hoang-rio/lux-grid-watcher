import { useCallback, useEffect, useRef, useState, lazy } from "react";
import "./App.css";
import { IInverterData } from "./Intefaces";
import SystemInformation from "./components/SystemInformation";
import Summary from "./components/Summary";
const DailyChart = lazy(() => import("./components/DailyChart"));

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

  const fetchState = useCallback(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/state`)
      .then((res) => res.json())
      .then((json) => {
        setInverterData(json);
      })
      .catch((err) => {
        console.error("API get state error", err);
      });
  }, [setInverterData]);

  useEffect(() => {
    fetchState();
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
        fetchState();
        connectSocket();
      }
    });
    return closeSocket;
  }, [connectSocket, closeSocket, fetchState]);

  useEffect(() => {
    if (!inverterData?.deviceTime) return;
    const deviceTimeOnly = inverterData?.deviceTime?.split(" ")[1];
    document.title = `[${deviceTimeOnly}] ${import.meta.env.VITE_APP_TITLE}`;
  }, [inverterData?.deviceTime]);

  if (inverterData) {
    return (
      <>
        <Summary invertData={inverterData} />
        <SystemInformation
          inverterData={inverterData}
          isSocketConnected={isSocketConnected}
          onReconnect={connectSocket}
        />
        <DailyChart />
      </>
    );
  }

  return (
    <div className="card server-offline">
      Server is offline. Reload page when you make sure that server is online
    </div>
  );
}

export default App;
