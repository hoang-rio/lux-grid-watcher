import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { IAuthUser } from "../Intefaces";
import "./AuthPanel.css";

interface AuthPanelProps {
  onAuthSuccess: (accessToken: string, refreshToken: string, user?: IAuthUser) => void;
}

type Mode = "login" | "register" | "forgot" | "reset";

function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
  const { t } = useTranslation();
  const search = new URLSearchParams(window.location.search);
  const resetToken = search.get("token") || "";
  const initialMode: Mode = useMemo(() => (resetToken ? "reset" : "login"), [resetToken]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const resetStatus = () => {
    setMessage("");
    setError("");
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    resetStatus();
    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("authPanel.loginFailed"));
        return;
      }
      onAuthSuccess(json.access_token, json.refresh_token, json.user);
    } catch {
      setError(t("authPanel.loginFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setIsSubmitting(true);
    resetStatus();
    try {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("authPanel.registerFailed"));
        return;
      }
      setMessage(t("authPanel.registerSuccess"));
      setMode("login");
    } catch {
      setError(t("authPanel.registerFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsSubmitting(true);
    resetStatus();
    try {
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("authPanel.requestFailed"));
        return;
      }
      setMessage(json.message || t("authPanel.forgotSent"));
    } catch {
      setError(t("authPanel.requestFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setIsSubmitting(true);
    resetStatus();
    try {
      const res = await fetch(`${baseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || t("authPanel.resetFailed"));
        return;
      }
      setMessage(t("authPanel.resetSuccess"));
      window.history.replaceState({}, document.title, window.location.pathname);
      setMode("login");
    } catch {
      setError(t("authPanel.resetFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>{t("authPanel.title")}</h2>

        {mode !== "reset" && (
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>{t("authPanel.login")}</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>{t("authPanel.register")}</button>
            <button className={mode === "forgot" ? "active" : ""} onClick={() => setMode("forgot")}>{t("authPanel.forgot")}</button>
          </div>
        )}

        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <>
            <label>{t("authPanel.email")}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </>
        )}

        {(mode === "login" || mode === "register") && (
          <>
            <label>{t("authPanel.password")}</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </>
        )}

        {mode === "reset" && (
          <>
            <label>{t("authPanel.newPassword")}</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </>
        )}

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-message">{message}</div>}

        {mode === "login" && (
          <button disabled={isSubmitting} onClick={handleLogin}>{t("authPanel.login")}</button>
        )}
        {mode === "register" && (
          <button disabled={isSubmitting} onClick={handleRegister}>{t("authPanel.register")}</button>
        )}
        {mode === "forgot" && (
          <button disabled={isSubmitting} onClick={handleForgotPassword}>{t("authPanel.sendResetLink")}</button>
        )}
        {mode === "reset" && (
          <button disabled={isSubmitting} onClick={handleResetPassword}>{t("authPanel.resetPassword")}</button>
        )}
      </div>
    </div>
  );
}

export default AuthPanel;
