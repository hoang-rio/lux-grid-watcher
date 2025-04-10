import { IInverterData, INotificationData } from "../Intefaces";
import "./SystemInformation.css";
import SolarPV from "./SolarPV";
import Battery from "./Battery";
import Inverter from "./Inverter";
import Grid from "./Grid";
import Consumption from "./Consumption";
import EPS from "./EPS";
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from "react";

interface Props {
  inverterData: IInverterData;
  isSocketConnected: boolean;
  onReconnect: () => void;
  // New prop to trigger notification popover when new notification event occurs
  newNotificationTrigger?: number;
}

function SystemInformation({
  inverterData,
  isSocketConnected,
  onReconnect,
  newNotificationTrigger,
}: Props) {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<INotificationData[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLDivElement>(null);

  // Added helper function to format datetime
  const formatDateTime = (dateInput: string | number) => {
    const date = new Date(dateInput);
    return date.toLocaleString();
  };

  const toggleNotifications = () => setShowNotifications(prev => !prev);

  // Extracted fetchNotifications function
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notification-history`);
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Updated effect: auto fetch notifications when page becomes visible regardless of popover state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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

  // New effect: when the newNotificationTrigger prop changes, show popover and fetch notifications.
  useEffect(() => {
    if (newNotificationTrigger) {
      setShowNotifications(true);
      fetchNotifications();
    }
  }, [newNotificationTrigger]);

  return (
    <>
      <div className="card system-information">
        <div className="system-content">
          <div className="system-title">
            <span className="system-title-text">{t("systemInformation")}</span>
            <span>{inverterData.deviceTime}</span>
            <div className="notification-button" ref={notificationButtonRef}>
              <button
                onClick={toggleNotifications}
                className={showNotifications ? "active" : "inactive"}
                title={t("notificationHistory")}
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
                  className={`system-status-icon ${
                    !isSocketConnected
                      ? "offline"
                      : inverterData.status !== 0
                      ? "normal"
                      : "fault"
                  }`}
                ></div>
                <div>
                  {!isSocketConnected
                    ? t("offline")
                    : inverterData.status !== 0
                    ? t("normal")
                    : t("fault")}
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
                <h3>{t("notificationHistory")}</h3>
                <button className="close-popover" onClick={toggleNotifications}>
                  ×
                </button>
              </div>
              <ul>
                {notifications.map((note, idx) => (
                  <li key={idx}>
                    <div>
                      <strong>{note.title}</strong>
                    </div>
                    <div>{note.body}</div>
                    <div style={{ fontSize: "smaller", color: "#555" }}>
                      {formatDateTime(note.notified_at)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default SystemInformation;
