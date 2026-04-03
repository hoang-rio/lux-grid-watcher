import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { IAuthUser, IUserInverter } from "../Intefaces";
import { apiFetch } from "../utils/fetchUtil";
import * as logUtil from "../utils/logUtil";
import "./TopAuthBar.css";

interface TopAuthBarProps {
  authUser: IAuthUser;
  onLogout: () => void;
  inverters?: IUserInverter[];
  selectedInverterId?: string;
  onSelectInverter?: (inverterId: string) => void;
}

function TopAuthBar({
  authUser,
  onLogout,
  inverters = [],
  selectedInverterId = "",
  onSelectInverter,
}: TopAuthBarProps) {
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
      <div className="top-auth-bar-right">
        {inverters.length > 0 && (
          <select
            className="top-auth-inverter-select"
            value={selectedInverterId}
            onChange={(e) => onSelectInverter?.(e.target.value)}
            aria-label={t("systemInformation")}
          >
            {inverters.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {`${inv.name} (${inv.invert_serial})`}
              </option>
            ))}
          </select>
        )}
        <button className="top-auth-logout-btn" onClick={onLogout}>
          {t("auth.logout")}
        </button>
      </div>
    </div>
  );
}

export default TopAuthBar;
