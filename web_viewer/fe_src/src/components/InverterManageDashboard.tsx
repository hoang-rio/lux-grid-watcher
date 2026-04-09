import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IUserInverter } from "../Intefaces";
import { apiFetch } from "../utils/fetchUtil";
import * as logUtil from "../utils/logUtil";
import "./InverterManageDashboard.css";

interface InverterManageDashboardProps {
  inverters: IUserInverter[];
  selectedInverterId?: string;
  onSelectInverter?: (inverterId: string) => void;
  onChanged: () => Promise<void> | void;
  onClose?: () => void;
  allowClose?: boolean;
}

function InverterManageDashboard({
  inverters,
  selectedInverterId = "",
  onSelectInverter,
  onChanged,
  onClose,
  allowClose = true,
}: InverterManageDashboardProps) {
  const { t } = useTranslation();
  const currentHostname = window.location.hostname;
  const [name, setName] = useState("");
  const [dongleSerial, setDongleSerial] = useState("");
  const [invertSerial, setInvertSerial] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [savingEditId, setSavingEditId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const sortedInverters = useMemo(() => {
    return [...inverters].sort((a, b) => {
      if (a.id === selectedInverterId) {
        return -1;
      }
      if (b.id === selectedInverterId) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [inverters, selectedInverterId]);

  const resetForm = () => {
    setName("");
    setDongleSerial("");
    setInvertSerial("");
  };

  const createInverter = async () => {
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await apiFetch("/inverters", {
        method: "POST",
        withAuth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dongle_serial: dongleSerial.trim(),
          invert_serial: invertSerial.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("inverterManager.createFailed"));
        return;
      }

      resetForm();
      setMessage(t("inverterManager.createSuccess"));
      await onChanged();
    } catch (err) {
      logUtil.error(t("inverterManager.createFailed"), err);
      setError(t("inverterManager.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteInverter = async (inverterId: string) => {
    if (!window.confirm(t("inverterManager.deleteConfirm"))) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingId(inverterId);

    try {
      const res = await apiFetch(`/inverters/${inverterId}`, {
        method: "DELETE",
        withAuth: true,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("inverterManager.deleteFailed"));
        return;
      }

      setMessage(t("inverterManager.deleteSuccess"));
      await onChanged();
    } catch (err) {
      logUtil.error(t("inverterManager.deleteFailed"), err);
      setError(t("inverterManager.deleteFailed"));
    } finally {
      setDeletingId("");
    }
  };

  const beginEdit = (inv: IUserInverter) => {
    setEditingId(inv.id);
    setEditingName(inv.name);
    setError("");
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditingName("");
  };

  const saveEdit = async (inv: IUserInverter) => {
    setError("");
    setMessage("");
    setSavingEditId(inv.id);

    try {
      const res = await apiFetch(`/inverters/${inv.id}`, {
        method: "PATCH",
        withAuth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("inverterManager.updateFailed"));
        return;
      }

      setMessage(t("inverterManager.updateSuccess"));
      cancelEdit();
      await onChanged();
    } catch (err) {
      logUtil.error(t("inverterManager.updateFailed"), err);
      setError(t("inverterManager.updateFailed"));
    } finally {
      setSavingEditId("");
    }
  };

  return (
    <div
      className={`inverter-manager-shell ${allowClose ? "as-modal" : "embedded"}`}
      onClick={(e) => {
        if (!allowClose || !onClose) {
          return;
        }
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`inverter-manager-card card ${allowClose ? "modal" : "embedded"}`}>
        <div className="inverter-manager-header">
          <div>
            <h2>{t("inverterManager.title")}</h2>
            <p>{t("inverterManager.description")}</p>
            <button
              className="inverter-manager-guide-btn-mobile"
              onClick={() => setShowSetupGuide((prev) => !prev)}
              type="button"
            >
              {showSetupGuide ? t("inverterGuide.hide") : t("inverterGuide.show")}
            </button>
          </div>
          <div className="inverter-manager-header-actions">
            <button
              className="inverter-manager-guide-btn"
              onClick={() => setShowSetupGuide((prev) => !prev)}
              type="button"
            >
              {showSetupGuide ? t("inverterGuide.hide") : t("inverterGuide.show")}
            </button>
            {allowClose && onClose && (
              <button className="inverter-manager-close-btn" onClick={onClose} type="button">
                {t("inverterManager.close")}
              </button>
            )}
          </div>
        </div>

        {(error || message) && (
          <div className={`inverter-manager-message ${error ? "error" : "success"}`}>
            {error || message}
          </div>
        )}

        {showSetupGuide && (
          <div className="inverter-manager-guide card" role="region" aria-label={t("inverterGuide.title")}>
            <h3>{t("inverterGuide.title")}</h3>
            <p className="inverter-manager-guide-description">{t("inverterGuide.description")}</p>

            <div className="inverter-manager-guide-steps">
              <section>
                <h4>{t("inverterGuide.openDongleSettings.title")}</h4>
                <p>{t("inverterGuide.openDongleSettings.body")}</p>
                <img
                  src="/assets/lux_run_state.png"
                  alt={t("inverterGuide.openDongleSettings.imageAlt")}
                  loading="lazy"
                />
              </section>

              <section>
                <h4>{t("inverterGuide.networkSettings.title")}</h4>
                <p>{t("inverterGuide.networkSettings.body")}</p>
                <ul>
                  <li>{t("inverterGuide.networkSettings.items.connectionSetting1")}</li>
                  <li>{t("inverterGuide.networkSettings.items.connectionSetting2")}</li>
                  <li>{t("inverterGuide.networkSettings.items.connectionSetting2Protocol")}</li>
                  <li>{t("inverterGuide.networkSettings.items.connectionSetting2Port")}</li>
                  <li>
                    {t("inverterGuide.networkSettings.items.connectionSetting2Hostname")}{" "}
                    <span className="inverter-manager-copy-value">{currentHostname}</span>
                  </li>
                </ul>
                <div className="inverter-manager-network-image-wrap">
                  <img
                    src="/assets/dongle_network_setting.png"
                    alt={t("inverterGuide.networkSettings.imageAlt")}
                    loading="lazy"
                  />
                  <span className="inverter-manager-network-overlay" title={currentHostname} aria-hidden="true">
                    {currentHostname}
                  </span>
                </div>
              </section>
            </div>
            <p className="inverter-manager-guide-security">
              {t("inverterGuide.securityNote", { hostname: currentHostname })}
            </p>
          </div>
        )}

        <div className="inverter-manager-grid">
          <div className="inverter-manager-list-wrap">
            <h3>{t("inverterManager.listTitle")}</h3>
            {sortedInverters.length === 0 ? (
              <div className="inverter-manager-empty">{t("inverterManager.empty")}</div>
            ) : (
              <ul className="inverter-manager-list">
                {sortedInverters.map((inv) => {
                  const isCurrent = inv.id === selectedInverterId;
                  const isEditing = inv.id === editingId;
                  return (
                    <li key={inv.id} className={`inverter-manager-item ${isCurrent ? "active" : ""}`}>
                      {isEditing ? (
                        <div className="inverter-manager-edit-wrap">
                          <label>{t("inverterManager.name")}</label>
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                          />

                          <div className="inverter-manager-edit-actions">
                            <button
                              className="inverter-manager-save"
                              onClick={() => saveEdit(inv)}
                              disabled={
                                savingEditId === inv.id ||
                                !editingName.trim()
                              }
                            >
                              {savingEditId === inv.id ? t("inverterManager.saving") : t("inverterManager.save")}
                            </button>
                            <button className="inverter-manager-cancel" onClick={cancelEdit}>
                              {t("inverterManager.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            className="inverter-manager-select"
                            onClick={() => onSelectInverter?.(inv.id)}
                            title={t("inverterManager.select")}
                          >
                            <div className="inverter-manager-name">{inv.name}</div>
                            <div className="inverter-manager-serial">{inv.invert_serial || inv.dongle_serial}</div>
                          </button>
                          <button
                            className="inverter-manager-edit"
                            onClick={() => beginEdit(inv)}
                            disabled={Boolean(deletingId) || Boolean(savingEditId)}
                            title={t("inverterManager.rename", "Rename")}
                          >
                            {t("inverterManager.rename", "Rename")}
                          </button>
                          <button
                            className="inverter-manager-delete"
                            onClick={() => deleteInverter(inv.id)}
                            disabled={deletingId === inv.id || Boolean(savingEditId)}
                            title={t("inverterManager.delete")}
                          >
                            {deletingId === inv.id ? t("inverterManager.deleting") : t("inverterManager.delete")}
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="inverter-manager-form-wrap">
            <h3>{t("inverterManager.addTitle")}</h3>
            <p className="inverter-manager-form-help">
              {t("inverterManager.serialSourcePrefix")}{" "}
              <a
                href="https://server.luxpowertek.com/WManage/web/login"
                target="_blank"
                rel="noreferrer"
              >
                {t("inverterManager.serialSourceWeb")}
              </a>{" "}
              {t("inverterManager.serialSourceOr")}{" "}
              <span>{t("inverterManager.serialSourceMobile")}</span>
              .
            </p>

            <label>{t("inverterManager.name")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("inverterManager.namePlaceholder")}
            />

            <label>{t("inverterManager.dongleSerial")}</label>
            <input
              value={dongleSerial}
              onChange={(e) => setDongleSerial(e.target.value)}
              placeholder={t("inverterManager.donglePlaceholder")}
            />
            <p className="inverter-manager-field-note">{t("inverterManager.dongleSerialHint", "You can find dongle serial in stamp on your dongle beside QR code")}</p>

            <label>{t("inverterManager.invertSerial")}</label>
            <input
              value={invertSerial}
              onChange={(e) => setInvertSerial(e.target.value)}
              placeholder={t("inverterManager.invertPlaceholder")}
            />
            <p className="inverter-manager-field-note">{t("inverterManager.invertSerialOptionalHint")}</p>

            <button
              className="inverter-manager-create"
              onClick={createInverter}
              disabled={
                isSubmitting ||
                !dongleSerial.trim()
              }
            >
              {isSubmitting ? t("inverterManager.creating") : t("inverterManager.create")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InverterManageDashboard;
