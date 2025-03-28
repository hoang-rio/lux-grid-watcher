import { useCallback, useEffect, useRef, useState, lazy } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";
import { IUpdateChart, IInverterData } from "./Intefaces";
import Footer from "./components/Footer";
import Loading from "./components/Loading";

const SystemInformation = lazy(() => import("./components/SystemInformation"));
const Summary = lazy(() => import("./components/Summary"));
const HourlyChart = lazy(() => import("./components/HourlyChart"));
const EnergyChart = lazy(() => import("./components/EnergyChart"));

const MAX_RECONNECT_COUNT = 3;

function App() {
  const { t } = useTranslation();
  const [inverterData, setInverterData] = useState<IInverterData>();
  const socketRef = useRef<WebSocket>();
  const selfCloseRef = useRef<boolean>(false);
  const reconnectCountRef = useRef<number>(0);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const hourlyChartfRef = useRef<IUpdateChart>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const deviceTimeRef = useRef<string>();

  const connectSocket = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.CONNECTING || !socketRef.current.CLOSED)
    ) {
      return;
    }
    console.log(t("socket.connecting"));
    // Create WebSocket connection.
    const socket = new WebSocket(`${import.meta.env.VITE_API_BASE_URL}/ws`);
    socketRef.current = socket;

    // Connection opened
    socket.addEventListener("open", () => {
      reconnectCountRef.current = 0;
      console.log(t("socket.connected"));
      if (deviceTimeRef.current) {
        document.title = `[${deviceTimeRef.current}] ${t("webTitle")}`;
      }
      setIsSocketConnected(true);
    });

    // Listen for messages
    socket.addEventListener("message", (event) => {
      const jsonData = JSON.parse(event.data);
      setInverterData(jsonData.inverter_data);
      hourlyChartfRef.current?.updateItem(jsonData.hourly_chart_item);
    });
    socket.addEventListener("close", () => {
      document.title = `[${t("offline")}] ${t("webTitle")}`;
      setIsSocketConnected(false);
      if (selfCloseRef.current || socketRef.current?.CONNECTING) {
        return;
      }
      if (reconnectCountRef.current >= MAX_RECONNECT_COUNT) {
        console.warn(t("socket.stopReconnect"), MAX_RECONNECT_COUNT);
        return;
      }
      reconnectCountRef.current++;
      console.log(
        t("socket.reconnecting"),
        reconnectCountRef.current
      );
      connectSocket();
    });
    socket.addEventListener("error", (event) => {
      console.error(t("socket.error"), event);
    });
  }, [t]);

  const closeSocket = useCallback(() => {
    selfCloseRef.current = true;
    socketRef.current?.close();
  }, []);

  const fetchState = useCallback(async () => {
    try {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/state`);
      const json = await res.json();
      setInverterData(json);
      setIsLoading(false);
    } catch (err) {
      console.error("API get state error", err);
    }
    isFetchingRef.current = false;
  }, []);

  useEffect(() => {
    fetchState();
    selfCloseRef.current = false;
    if (!socketRef.current) {
      connectSocket();
    }
    window.addEventListener("beforeunload", closeSocket);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchState();
        if (reconnectCountRef.current >= MAX_RECONNECT_COUNT) {
          reconnectCountRef.current = 0;
          console.warn(t("socket.reconnectOnActive"), MAX_RECONNECT_COUNT);
          connectSocket();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", closeSocket);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      closeSocket();
    };
  }, [connectSocket, closeSocket, fetchState, t]);

  useEffect(() => {
    if (!inverterData?.deviceTime) return;
    const deviceTimeOnly = inverterData?.deviceTime?.split(" ")[1];
    deviceTimeRef.current = deviceTimeOnly;
    document.title = `[${deviceTimeOnly}] ${t("webTitle")}`;
  }, [inverterData?.deviceTime]);

  if (isLoading) {
    return (
      <>
        <div className="d-flex card loading align-center justify-center flex-1">
          <Loading />
        </div>
        <Footer />
      </>
    );
  }

  if (inverterData) {
    return (
      <>
        <Summary invertData={inverterData} />
        <SystemInformation
          inverterData={inverterData}
          isSocketConnected={isSocketConnected}
          onReconnect={connectSocket}
        />
        <div className="row chart">
          <HourlyChart ref={hourlyChartfRef} className="flex-1 chart-item" />
          <EnergyChart className="flex-1 chart-item" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="d-flex card server-offline align-center justify-center flex-1">
        {t("server.offline")}
      </div>
      <Footer />
    </>
  );
}

export default App;
