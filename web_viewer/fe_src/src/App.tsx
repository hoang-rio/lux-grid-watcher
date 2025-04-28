import { useCallback, useEffect, useRef, useState, lazy } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";
import { IUpdateChart, IInverterData, INotificationData } from "./Intefaces";
import Footer from "./components/Footer";
import Loading from "./components/Loading";
import * as logUtil from "./utils/logUtil";

const SystemInformation = lazy(() => import("./components/SystemInformation"));
const Summary = lazy(() => import("./components/Summary"));
const HourlyChart = lazy(() => import("./components/HourlyChart"));
const EnergyChart = lazy(() => import("./components/EnergyChart"));

const MAX_RECONNECT_COUNT = 5;

function App() {
  const { t, i18n } = useTranslation();
  const [inverterData, setInverterData] = useState<IInverterData>();
  const socketRef = useRef<WebSocket>();
  const selfCloseRef = useRef<boolean>(false);
  const reconnectCountRef = useRef<number>(0);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const hourlyChartfRef = useRef<IUpdateChart>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const deviceTimeRef = useRef<string>();

  // Changed to hold notification object or null
  const [newNotification, setNewNotification] = useState<INotificationData | null>(null);

  const connectSocket = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.CONNECTING || !socketRef.current.CLOSED)
    ) {
      return;
    }
    logUtil.log(i18n.t("socket.connecting"));
    const socket = new WebSocket(`${import.meta.env.VITE_API_BASE_URL}/ws`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      selfCloseRef.current = false;
      reconnectCountRef.current = 0;
      logUtil.log(i18n.t("socket.connected"));
      if (deviceTimeRef.current) {
        document.title = `[${deviceTimeRef.current}] ${i18n.t("webTitle")}`;
      }
      setIsSocketConnected(true);
    });

    socket.addEventListener("message", (event) => {
      const jsonData = JSON.parse(event.data);
      if (isLoading) {
        setIsLoading(false);
      }
      if (jsonData.event === "new_notification") {
        setNewNotification(jsonData.data);
      } else {
        setInverterData(jsonData.inverter_data);
        hourlyChartfRef.current?.updateItem(jsonData.hourly_chart_item);
      }
    });

    socket.addEventListener("close", () => {
      document.title = `[${i18n.t("offline")}] ${i18n.t("webTitle")}`;
      setIsSocketConnected(false);
      if (selfCloseRef.current || socketRef.current?.CONNECTING) {
        logUtil.log(i18n.t("socket.closed"));
        socketRef.current = undefined;
        reconnectCountRef.current = 0;
        return;
      }
      if (reconnectCountRef.current >= MAX_RECONNECT_COUNT) {
        logUtil.warn(i18n.t("socket.stopReconnect"), MAX_RECONNECT_COUNT);
        return;
      }
      reconnectCountRef.current++;
      logUtil.log(
        i18n.t("socket.reconnecting"),
        reconnectCountRef.current
      );
      connectSocket();
    });

    socket.addEventListener("error", (event) => {
      logUtil.error(i18n.t("socket.error"), event);
    });
  }, [i18n, isLoading]);

  const closeSocket = useCallback(() => {
    logUtil.log(i18n.t("socket.closing"));
    selfCloseRef.current = true;
    socketRef.current?.close();
  }, [i18n]);

  const fetchState = useCallback(async () => {
    try {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/state`);
      const json = await res.json();
      if (Object.keys(json).length !== 0) {
        setInverterData(json);
        setIsLoading(false);
      }
    } catch (err) {
      logUtil.error(t("getStateError"), err);
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
    return () => {
      window.removeEventListener("beforeunload", closeSocket);
      closeSocket();
    };
  }, [connectSocket, closeSocket, fetchState, i18n]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When the page is hidden, close the socket to reduce activity
        closeSocket();
      } else {
        // When back to foreground, fetch state and reconnect
        fetchState();
        connectSocket();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connectSocket, closeSocket, fetchState]);

  useEffect(() => {
    if (!inverterData?.deviceTime) return;
    const deviceTimeOnly = inverterData.deviceTime.split(" ")[1];
    deviceTimeRef.current = deviceTimeOnly;
    document.title = `[${deviceTimeOnly}] ${t("webTitle")}`;
  }, [inverterData?.deviceTime, t]);

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
          newNotification={newNotification}
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
