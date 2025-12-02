import { useTranslation } from 'react-i18next';
import { useState, useEffect, forwardRef } from 'react';
import Loading from './Loading';
import * as logUtil from '../utils/logUtil';
import './SettingsPopover.css';

interface SettingsPopoverProps {
  onClose: () => void;
}

interface Settings {
  ABNORMAL_DETECTION_ENABLED: string;
  ABNORMAL_CHECK_COOLDOWN_HOURS: string;
  ABNORMAL_MIN_POWER: string;
  OFF_GRID_WARNING_POWER: string;
  OFF_GRID_WARNING_SOC: string;
  MAX_BATTERY_POWER: string;
  OFF_GRID_WARNING_ENABLED: string;
  BATTERY_FULL_NOTIFY_ENABLED: string;
  BATTERY_FULL_NOTIFY_BODY: string;
}

const SettingsPopover = forwardRef<HTMLDivElement, SettingsPopoverProps>(({ onClose }, ref) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings`);
      const data = await res.json();
      // Set defaults if missing
      const defaults = {
        ABNORMAL_DETECTION_ENABLED: 'true',
        ABNORMAL_CHECK_COOLDOWN_HOURS: '3',
        ABNORMAL_MIN_POWER: '900',
        OFF_GRID_WARNING_POWER: '2200',
        OFF_GRID_WARNING_SOC: '87',
        MAX_BATTERY_POWER: '3000',
        OFF_GRID_WARNING_ENABLED: 'true',
        BATTERY_FULL_NOTIFY_ENABLED: 'true',
        BATTERY_FULL_NOTIFY_BODY: 'Pin đã sạc đầy 100%. Có thể bật bình nóng lạnh để tối ưu sử dụng.'
      };
      const merged = { ...defaults, ...data };
      setSettings(merged);
      setOriginalSettings(merged);
    } catch (err) {
      logUtil.error('Failed to fetch settings', err);
      setMessage({text: t('settings.saveError'), type: 'error'});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setOriginalSettings(settings);
        setMessage({text: t('settings.saveSuccess'), type: 'success'});
      } else {
        setMessage({text: t('settings.saveError'), type: 'error'});
      }
    } catch (err) {
      logUtil.error('Failed to save settings', err);
      setMessage({text: t('settings.saveError'), type: 'error'});
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const hasChanges = () => {
    if (!settings || !originalSettings) return false;
    return Object.keys(settings).some((key) => settings[key as keyof Settings] !== originalSettings[key as keyof Settings]);
  };

  if (loading) {
    return (
      <div className="settings-popover" ref={ref}>
        <div className="notification-popover-content">
          <div className="notification-popover-header">
            <h3>{t('settings.title')}</h3>
            <button className="close-popover" onClick={onClose}>
              ×
            </button>
          </div>
          <Loading />
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="settings-popover" ref={ref}>
      <div className="notification-popover-content">
        <div className="notification-popover-header">
          <h3>{t("settings.title")}</h3>
          {message && (
            <div className={`settings-message ${message.type}`}>
              {message.text}
            </div>
          )}
          <button className="close-popover" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="settings-content">
          <div className="settings-section">
            <h4>{t("settings.batterySection")}</h4>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.BATTERY_FULL_NOTIFY_ENABLED === "true"}
                  onChange={(e) =>
                    updateSetting(
                      "BATTERY_FULL_NOTIFY_ENABLED",
                      e.target.checked ? "true" : "false"
                    )
                  }
                />
                {t("settings.batteryFullNotifyEnabled")}
              </label>
            </div>
            <div className="setting-item setting-item-block">
              <label>{t("settings.batteryFullNotifyBody")}</label>
              <textarea
                value={settings.BATTERY_FULL_NOTIFY_BODY}
                onChange={(e) =>
                  updateSetting("BATTERY_FULL_NOTIFY_BODY", e.target.value)
                }
                disabled={settings.BATTERY_FULL_NOTIFY_ENABLED !== "true"}
                rows={3}
              />
            </div>
          </div>
          <div className="settings-section">
            <h4>{t("settings.abnormalUsageSection")}</h4>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.ABNORMAL_DETECTION_ENABLED === "true"}
                  onChange={(e) =>
                    updateSetting(
                      "ABNORMAL_DETECTION_ENABLED",
                      e.target.checked ? "true" : "false"
                    )
                  }
                />
                {t("settings.abnormalDetectionEnabled")}
              </label>
            </div>
            <div className="setting-item">
              <label>{t("settings.abnormalSkipCheckHours")}</label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.ABNORMAL_CHECK_COOLDOWN_HOURS}
                onChange={(e) =>
                  updateSetting("ABNORMAL_CHECK_COOLDOWN_HOURS", e.target.value)
                }
                disabled={settings.ABNORMAL_DETECTION_ENABLED !== "true"}
              />
              <span>{t("settings.hours")}</span>
            </div>
            <div className="setting-item">
              <label>{t("settings.abnormalMinPower")}</label>
              <input
                type="number"
                min="500"
                max="1500"
                value={settings.ABNORMAL_MIN_POWER}
                onChange={(e) =>
                  updateSetting("ABNORMAL_MIN_POWER", e.target.value)
                }
                disabled={settings.ABNORMAL_DETECTION_ENABLED !== "true"}
              />
              <span>{t("settings.watts")}</span>
            </div>
          </div>
          <div className="settings-section">
            <h4>{t("settings.offGridWarningSection")}</h4>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.OFF_GRID_WARNING_ENABLED === "true"}
                  onChange={(e) =>
                    updateSetting(
                      "OFF_GRID_WARNING_ENABLED",
                      e.target.checked ? "true" : "false"
                    )
                  }
                />
                {t("settings.offGridWarningEnabled")}
              </label>
            </div>
            <div className="setting-item">
              <label>{t("settings.offGridWarningPower")}</label>
              <input
                type="number"
                value={settings.OFF_GRID_WARNING_POWER}
                onChange={(e) =>
                  updateSetting("OFF_GRID_WARNING_POWER", e.target.value)
                }
                disabled={settings.OFF_GRID_WARNING_ENABLED !== "true"}
              />
              <span>{t("settings.watts")}</span>
            </div>
            <div className="setting-item">
              <label>{t("settings.offGridWarningSoc")}</label>
              <input
                type="number"
                value={settings.OFF_GRID_WARNING_SOC}
                onChange={(e) =>
                  updateSetting("OFF_GRID_WARNING_SOC", e.target.value)
                }
                disabled={settings.OFF_GRID_WARNING_ENABLED !== "true"}
              />
              <span>{t("settings.percent")}</span>
            </div>
            <div className="setting-item">
              <label>{t("settings.maxBatteryPower")}</label>
              <input
                type="number"
                value={settings.MAX_BATTERY_POWER}
                onChange={(e) =>
                  updateSetting("MAX_BATTERY_POWER", e.target.value)
                }
                disabled={settings.OFF_GRID_WARNING_ENABLED !== "true"}
              />
              <span>{t("settings.watts")}</span>
            </div>
            <p className="setting-descrtiption">
              {t("settings.offGridWarningDescription")}
            </p>
          </div>
          <div className="settings-actions">
            <button onClick={handleSave} disabled={saving || !hasChanges()}>
              {saving ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default SettingsPopover;
