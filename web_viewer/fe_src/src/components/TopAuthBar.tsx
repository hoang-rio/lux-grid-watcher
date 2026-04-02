import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { IAuthUser } from "../Intefaces";
import { apiFetch } from "../utils/fetchUtil";
import * as logUtil from "../utils/logUtil";
import "./TopAuthBar.css";

interface TopAuthBarProps {
  authUser: IAuthUser;
  onLogout: () => void;
}

function TopAuthBar({ authUser, onLogout }: TopAuthBarProps) {
  const { t } = useTranslation();
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  const handleSendVerifyEmail = useCallback(async () => {
    setVerifyMessage("");
    setVerifySubmitting(true);
    try {
      const res = await apiFetch("/auth/send-verify-email", {
        method: "POST",
        withAuth: true,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || t("auth.sendVerifyEmailFailed"));
      }
      setVerifyMessage(json?.message || t("auth.sendVerifyEmailSuccess"));
    } catch (err) {
      logUtil.error("send verify email error", err);
      setVerifyMessage(t("auth.sendVerifyEmailFailed"));
    } finally {
      setVerifySubmitting(false);
    }
  }, [t]);

  return (
    <div className="card top-auth-bar">
      <div className="top-auth-bar-left">
        <strong>{authUser.email}</strong>
        {!authUser.email_confirmed && (
          <div className="top-auth-verify-wrap">
            <span>{t("auth.verifyEmailWarning")}</span>
            <button
              className="top-auth-verify-btn"
              onClick={handleSendVerifyEmail}
              disabled={verifySubmitting}
            >
              {t("auth.sendVerifyEmail")}
            </button>
            {verifyMessage && <span className="top-auth-message">{verifyMessage}</span>}
          </div>
        )}
      </div>
      <button className="top-auth-logout-btn" onClick={onLogout}>
        {t("auth.logout")}
      </button>
    </div>
  );
}

export default TopAuthBar;
