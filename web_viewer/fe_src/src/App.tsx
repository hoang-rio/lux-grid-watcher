import { useCallback, useEffect, useRef, useState, lazy } from "react";
import { useTranslation } from "react-i18next";
import "./App.css";
import {
  IUpdateChart,
  IInverterData,
  INotificationData,
  IAuthUser,
  IUserInverter,
} from "./Intefaces";
import Footer from "./components/Footer";
import Loading from "./components/Loading";
import * as logUtil from "./utils/logUtil";
import { apiFetch } from "./utils/fetchUtil";

const SystemInformation = lazy(() => import("./components/SystemInformation"));
const Summary = lazy(() => import("./components/Summary"));
const HourlyChart = lazy(() => import("./components/HourlyChart"));
const EnergyChart = lazy(() => import("./components/EnergyChart"));
const AuthPanel = lazy(() => import("./components/AuthPanel"));
const InverterSetupPanel = lazy(() => import("./components/InverterSetupPanel"));
const TopAuthBar = lazy(() => import("./components/TopAuthBar"));

const MAX_RECONNECT_COUNT = 5;
const ACCESS_TOKEN_KEY = "lux_access_token";
const REFRESH_TOKEN_KEY = "lux_refresh_token";
const INVERTER_ID_KEY = "lux_selected_inverter_id";

function App() {
  const { t, i18n } = useTranslation();
  const [inverterData, setInverterData] = useState<IInverterData>();
  const [authUser, setAuthUser] = useState<IAuthUser | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [authConfigLoaded, setAuthConfigLoaded] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [userInverters, setUserInverters] = useState<IUserInverter[]>([]);
  const [selectedInverterId, setSelectedInverterId] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const eventSourceRef = useRef<EventSource>(undefined);
  const reconnectCountRef = useRef<number>(0);
  const [isSSEConnected, setIsSSEConnected] = useState<boolean>(false);
  const hourlyChartfRef = useRef<IUpdateChart>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const deviceTimeRef = useRef<string>("");

  // Changed to hold notification object or null
  const [newNotification, setNewNotification] =
    useState<INotificationData | null>(null);

  const isNoInverterOnboarding = authConfigLoaded && authRequired && !!authUser && userInverters.length === 0;
  const isAuthScreen = authConfigLoaded && authRequired && !authUser;

  const useBearerAuth = Boolean(accessToken);

  const connectSSE = useCallback(() => {
    if (authRequired && !authUser) {
      return;
    }
    if (eventSourceRef.current) {
      return;
    }
    logUtil.log(i18n.t("sse.connecting"));
    const sseParams = new URLSearchParams();
    if (selectedInverterId) {
      sseParams.set("inverter_id", selectedInverterId);
    }
    const ssePath = sseParams.toString() ? `/events?${sseParams.toString()}` : "/events";
    const eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}${ssePath}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      reconnectCountRef.current = 0;
      logUtil.log(i18n.t("sse.connected"));
      if (deviceTimeRef.current) {
        document.title = `[${deviceTimeRef.current}] ${i18n.t("webTitle")}`;
      }
      setIsSSEConnected(true);
    };

    eventSource.onmessage = (event) => {
      const jsonData = JSON.parse(event.data);
      if (jsonData.event === "new_notification") {
        setNewNotification(jsonData.data);
      } else {
        setInverterData(jsonData.inverter_data);
        hourlyChartfRef.current?.updateItem(jsonData.hourly_chart_item);
        setIsLoading(false);
      }
    };

    eventSource.onerror = (event) => {
      if (!isNoInverterOnboarding && !isAuthScreen) {
        document.title = `[${i18n.t("offline")}] ${i18n.t("webTitle")}`;
      }
      setIsSSEConnected(false);
      logUtil.error(i18n.t("sse.error"), event);
      eventSource.close();
      eventSourceRef.current = undefined;
      if (reconnectCountRef.current >= MAX_RECONNECT_COUNT) {
        logUtil.warn(i18n.t("sse.stopReconnect"), MAX_RECONNECT_COUNT);
        return;
      }

      reconnectCountRef.current++;
      logUtil.log(i18n.t("sse.reconnecting"), reconnectCountRef.current);
      setTimeout(() => connectSSE(), 1000 * reconnectCountRef.current);
    };
  }, [authRequired, authUser, i18n, isAuthScreen, isNoInverterOnboarding, selectedInverterId]);

  const closeSSE = useCallback(() => {
    logUtil.log(i18n.t("sse.closing"));
    if (!isNoInverterOnboarding && !isAuthScreen) {
      document.title = `[${i18n.t("offline")}] ${i18n.t("webTitle")}`;
    }
    setIsSSEConnected(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = undefined;
    }
  }, [i18n, isAuthScreen, isNoInverterOnboarding]);

  const fetchState = useCallback(async () => {
    try {
      if (authRequired && !accessToken) {
        return;
      }
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      const params = new URLSearchParams();
      if (selectedInverterId) {
        params.set("inverter_id", selectedInverterId);
      }
      const path = params.toString() ? `/state?${params.toString()}` : "/state";
      const res = await apiFetch(path, {
        withAuth: true,
      });
      const json = await res.json();
      if (Object.keys(json).length !== 0) {
        setInverterData(json);
        setIsLoading(false);
      }
    } catch (err) {
      logUtil.error(i18n.t("getStateError"), err);
    }
    isFetchingRef.current = false;
  }, [accessToken, authRequired, i18n, selectedInverterId]);

  const loadAuthConfig = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/config");
      const json = await res.json();
      setAuthRequired(Boolean(json?.auth_required));
    } catch {
      setAuthRequired(false);
    } finally {
      setAuthConfigLoaded(true);
    }
  }, []);

  const clearAuthSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken("");
    setAuthUser(null);
    setUserInverters([]);
    setSelectedInverterId("");
  }, []);

  const loadAuthSession = useCallback(async () => {
    if (!authConfigLoaded) {
      return;
    }
    if (!authRequired) {
      setIsAuthChecking(false);
      return;
    }

    setIsAuthChecking(true);

    const token = localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    if (!token) {
      clearAuthSession();
      setIsLoading(false);
      setIsAuthChecking(false);
      return;
    }

    setAccessToken(token);
    try {
      const profileRes = await apiFetch("/auth/profile", {
        withAuth: true,
      });
      const profileJson = await profileRes.json();
      if (!profileRes.ok || !profileJson.success) {
        clearAuthSession();
        setIsLoading(false);
        return;
      }
      setAuthUser(profileJson.user);

      const invRes = await apiFetch("/inverters", {
        withAuth: true,
      });
      const invJson = await invRes.json();
      if (!invRes.ok || !invJson.success || !Array.isArray(invJson.inverters)) {
        setUserInverters([]);
        setSelectedInverterId("");
        setIsLoading(false);
        return;
      }

      setUserInverters(invJson.inverters);
      const savedInverterId = localStorage.getItem(INVERTER_ID_KEY) || "";
      const defaultInverterId =
        invJson.inverters.find((inv: IUserInverter) => inv.id === savedInverterId)?.id ||
        invJson.inverters[0]?.id ||
        "";
      setSelectedInverterId(defaultInverterId);
      if (defaultInverterId) {
        localStorage.setItem(INVERTER_ID_KEY, defaultInverterId);
      }
      setIsLoading(false);
    } catch (err) {
      logUtil.error("load auth session error", err);
      clearAuthSession();
      setIsLoading(false);
    } finally {
      setIsAuthChecking(false);
    }
  }, [authConfigLoaded, authRequired, clearAuthSession]);

  const onAuthSuccess = useCallback(async (token: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setAccessToken(token);
    await loadAuthSession();
    await fetchState();
  }, [fetchState, loadAuthSession]);

  const onInverterCreated = useCallback(async () => {
    setIsLoading(true);
    await loadAuthSession();
    await fetchState();
  }, [fetchState, loadAuthSession]);

  const handleLogout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || "";
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        withAuth: true,
        body: JSON.stringify({ refresh_token: refreshToken }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      logUtil.error("logout request failed", err);
    } finally {
      clearAuthSession();
      setIsLoading(false);
    }
  }, [clearAuthSession]);

  useEffect(() => {
    loadAuthConfig();
  }, [loadAuthConfig]);

  useEffect(() => {
    loadAuthSession();
  }, [loadAuthSession]);

  useEffect(() => {
    const onSessionExpired = () => {
      clearAuthSession();
      setIsLoading(false);
    };
    window.addEventListener("lux:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("lux:session-expired", onSessionExpired);
    };
  }, [clearAuthSession]);

  useEffect(() => {
    if (authRequired && !accessToken) {
      return;
    }
    if (!eventSourceRef.current && !document.hidden) {
      connectSSE();
    }
    window.addEventListener("beforeunload", closeSSE);
    return () => {
      window.removeEventListener("beforeunload", closeSSE);
      closeSSE();
    };
  }, [accessToken, authRequired, connectSSE, closeSSE]);

  useEffect(() => {
    if (authRequired && !accessToken) {
      return;
    }
    fetchState();
  }, [accessToken, authRequired, fetchState]);

  useEffect(() => {
    if (!useBearerAuth || !selectedInverterId) {
      return;
    }
    fetchState();
  }, [fetchState, selectedInverterId, useBearerAuth]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When the page is hidden, close the SSE connection to reduce activity
        closeSSE();
      } else {
        // When back to foreground, fetch state and reconnect
        fetchState();
        connectSSE();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [connectSSE, closeSSE, fetchState]);

  useEffect(() => {
    if (selectedInverterId) {
      localStorage.setItem(INVERTER_ID_KEY, selectedInverterId);
    }
  }, [selectedInverterId]);

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

  if (authConfigLoaded && authRequired && isAuthChecking) {
    return (
      <>
        <div className="d-flex card loading align-center justify-center flex-1">
          <Loading />
        </div>
        <Footer />
      </>
    );
  }

  if (authConfigLoaded && authRequired && !authUser) {
    return (
      <>
        <AuthPanel onAuthSuccess={onAuthSuccess} />
        <Footer />
      </>
    );
  }

  if (authConfigLoaded && authRequired && authUser && userInverters.length === 0) {
    return (
      <>
        <TopAuthBar authUser={authUser} onLogout={handleLogout} />
        <InverterSetupPanel onCreated={onInverterCreated} />
        <Footer />
      </>
    );
  }

  if (inverterData) {
    return (
      <>
        {authUser && <TopAuthBar authUser={authUser} onLogout={handleLogout} />}
        <Summary
          invertData={inverterData}
          selectedInverterId={selectedInverterId}
          authToken={accessToken}
        />
        <SystemInformation
          inverterData={inverterData}
          isSSEConnected={isSSEConnected}
          onReconnect={connectSSE}
          newNotification={newNotification}
          authUser={authUser}
          inverters={userInverters}
          selectedInverterId={selectedInverterId}
          onSelectInverter={setSelectedInverterId}
        />
        <div className="row chart">
          <HourlyChart
            ref={hourlyChartfRef}
            className="flex-1 chart-item"
            selectedInverterId={selectedInverterId}
            authToken={accessToken}
          />
          <EnergyChart
            className="flex-1 chart-item"
            selectedInverterId={selectedInverterId}
            authToken={accessToken}
          />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      {authUser && <TopAuthBar authUser={authUser} onLogout={handleLogout} />}
      <div className="d-flex card server-offline align-center justify-center flex-1">
        {t("server.offline")}
      </div>
      <Footer />
    </>
  );
}

export default App;
