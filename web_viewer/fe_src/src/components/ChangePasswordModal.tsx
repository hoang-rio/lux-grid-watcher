import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../utils/fetchUtil";
import * as logUtil from "../utils/logUtil";
import "./ChangePasswordModal.css";

interface ChangePasswordModalProps {
  onClose: () => void;
}

function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async () => {
    setMessage(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setMessage({ text: t("changePassword.errorAllFieldsRequired"), type: "error" });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ text: t("changePassword.errorPasswordsDoNotMatch"), type: "error" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ text: t("changePassword.errorPasswordTooShort"), type: "error" });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ text: t("changePassword.errorPasswordSameAsCurrent"), type: "error" });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        withAuth: true,
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: t('changePassword.success'), type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        window.localStorage.removeItem("lux_access_token");
        window.localStorage.removeItem("lux_refresh_token");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ text: data.message || t('changePassword.errorFailedToChangePassword'), type: "error" });
      }
    } catch (err) {
      logUtil.error("Failed to change password", err);
      setMessage({ text: t('changePassword.errorFailedToChangePassword'), type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="change-password-shell as-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="change-password-card card modal">
        <div className="change-password-header">
          <div>
            <h2>{t('changePassword.title')}</h2>
            <p>{t('changePassword.subtitle')}</p>
          </div>
          <button className="change-password-close-btn" onClick={onClose} type="button">
            ×
          </button>
        </div>

        {message && (
          <div className={`change-password-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="change-password-form">
          <div className="setting-item">
            <label>{t('changePassword.currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('changePassword.currentPasswordPlaceholder')}
              autoComplete="current-password"
            />
          </div>

          <div className="setting-item">
            <label>{t('changePassword.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('changePassword.newPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          <div className="setting-item">
            <label>{t('changePassword.confirmNewPassword')}</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder={t('changePassword.confirmNewPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting || !currentPassword || !newPassword || !confirmNewPassword
            }
            className="change-password-submit"
          >
            {isSubmitting ? t('changePassword.submitting') : t('changePassword.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
