import { IInverterData, INotificationData } from "../Intefaces";
import "./SystemInformation.css";
import SolarPV from "./SolarPV";
import Battery from "./Battery";
import Inverter from "./Inverter";
import Grid from "./Grid";
import Consumption from "./Consumption";
import EPS from "./EPS";
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Loading from "./Loading";
import * as logUtil from "../utils/logUtil";

interface Props {
  inverterData: IInverterData;
  isSocketConnected: boolean;
  onReconnect: () => void;
  // Changed to accept an INotificationData object or null
  newNotification?: INotificationData | null;
}

function SystemInformation({
  inverterData,
  isSocketConnected,
  onReconnect,
  newNotification,
}: Props) {
  const { t, i18n } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<INotificationData[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false); // new state
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLDivElement>(null);
  const notificationOpened = useRef(false); // Track if notification popover was opened

  // Added helper function to format datetime
  const formatDateTime = useCallback((dateInput: string | number) => {
    const date = new Date(dateInput);
    return date.toLocaleString();
  }, []);

  // Fetch unread notification count on mount and when page becomes visible
  const fetchUnreadCount = useCallback(async () => {
    try {
      logUtil.log(i18n.t("notification.fetchingUnreadCount"));
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notification-unread-count`);
      const data = await res.json();
      setUnreadCount(data.unread_count);
    } catch (err) {
      logUtil.error(i18n.t("notification.failedFetchUnreadCount"), err);
    }
  }, [i18n]);

  useEffect(() => {
    fetchUnreadCount();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchUnreadCount]);

  // Extracted fetchNotifications function
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true); // start loading
    try {
      logUtil.log(i18n.t("notification.fetchingNotifications"));
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notification-history`);
      const data = await res.json();
      setNotifications(data.notifications);
      // Don't set unreadCount here, it's handled by fetchUnreadCount
    } catch (err) {
      logUtil.error(i18n.t("notification.failedFetchNotifications"), err);
    } finally {
      setLoadingNotifications(false); // end loading
    }
  }, [i18n]);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications, fetchNotifications]);

  useEffect(() => {
    if (showNotifications) {
      const handleClickOutside = (event: MouseEvent) => {
        // If click is inside popover OR inside notification button, do nothing.
        if (
          (popoverRef.current && popoverRef.current.contains(event.target as Node)) ||
          (notificationButtonRef.current && notificationButtonRef.current.contains(event.target as Node))
        ) {
          return;
        }
        setShowNotifications(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  // Remove auto-open popover on new notification, just update unread count
  useEffect(() => {
    if (newNotification) {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [newNotification, ...prev]);
    }
  }, [newNotification]);

  // Mark notifications as read when popover is closed after being opened
  useEffect(() => {
    if (showNotifications) {
      notificationOpened.current = true;
    } else {
      if (notificationOpened.current && unreadCount > 0) {
        fetch(`${import.meta.env.VITE_API_BASE_URL}/notification-mark-read`, { method: 'POST' })
          .then(() => fetchUnreadCount());
      }
      notificationOpened.current = false;
    }
  }, [showNotifications, unreadCount, fetchUnreadCount]);

  const handleShowNotifications = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  const status = useMemo(() => {
    if (!isSocketConnected) {
      return "offline";
    }
    if (inverterData.status === 1) {
      return "fault";
    }
    if (
      inverterData.internal_fault !== 0 ||
      inverterData.status_text == "Unknow status" ||
      inverterData.v_bat < 40 ||
      inverterData.v_bat > 58
    ) {
      return "notice";
    }
    return "normal";
  }, [
    isSocketConnected,
    inverterData.status,
    inverterData.internal_fault,
    inverterData.status_text,
    inverterData.v_bat,
  ]);

  return (
    <>
      <div className="card system-information">
        <div className="system-content">
          <div className="system-title">
            <span className="system-title-text">{t("systemInformation")}</span>
            <span>{inverterData.deviceTime}</span>
            <div className="notification-button" ref={notificationButtonRef}>
              <button
                onClick={handleShowNotifications}
                className={showNotifications ? "active" : "inactive"}
                title={t("notification.title")}
              >
                {/* Single bell icon SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  viewBox="0 0 24 24"
                  strokeLinejoin="round"
                  className="feather feather-bell"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-unread-badge">{unreadCount}</span>
                )}
              </button>
            </div>
          </div>
          <div className="system-graph">
            <div className="system-status row">
              <div
                className="system-status-display"
                title={inverterData.status_text}
              >
                <div
                  className={`system-status-icon ${status}`}
                ></div>
                <div>
                  {t(status)}
                </div>
              </div>
              <button
                className="system-status-reconnect"
                onClick={onReconnect}
                title={t("reconnect")}
                disabled={isSocketConnected}
              >
                {t("reconnect")}
              </button>
            </div>
            <div className="row">
              <div className="flex-1"></div>
              <SolarPV
                inverterData={inverterData}
                isSocketConnected={isSocketConnected}
              />
              <div className="flex-1"></div>
            </div>
            <div className="row">
              <Battery
                inverterData={inverterData}
                isSocketConnected={isSocketConnected}
              />
              <Inverter
                inverterData={inverterData}
                isSocketConnected={isSocketConnected}
              />
              <Grid
                inverterData={inverterData}
                isSocketConnected={isSocketConnected}
              />
            </div>
            <div className="row">
              <div className="flex-1"></div>
              <EPS
                inverterData={inverterData}
                isSocketConnected={isSocketConnected}
              />
              <Consumption
                inverterData={inverterData}
                isSocketConnected={isSocketConnected}
              />
            </div>
          </div>
        </div>
        {showNotifications && (
          <div className="notification-history notification-popover">
            <div className="notification-popover-content" ref={popoverRef}>
              <div className="notification-popover-header">
                <h3>{t("notification.title")}</h3>
                <button className="close-popover" onClick={handleShowNotifications}>
                  ×
                </button>
              </div>
              {loadingNotifications ? (
                <Loading />
              ) : notifications.length === 0 ? (
                <div className="notification-no-record">{t("notification.noRecords")}</div>
              ) : (
                <ul>
                  {notifications.map((note, idx) => (
                    <li key={idx} className={note.read === 0 ? "notification-unread" : ""}>
                      <div>
                        <strong>{note.title}</strong>
                      </div>
                      <div className="notification-body">{note.body}</div>
                      <div className="notification-date">
                        {formatDateTime(note.notified_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SystemInformation;
