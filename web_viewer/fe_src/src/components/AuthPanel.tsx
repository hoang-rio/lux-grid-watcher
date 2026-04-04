import { FormEvent, useMemo, useState } from "react";
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

  const isEmailMode = mode === "login" || mode === "register" || mode === "forgot";
  const isPasswordMode = mode === "login" || mode === "register";

  const canSubmit =
    (mode === "login" && email.trim().length > 0 && password.trim().length > 0) ||
    (mode === "register" && email.trim().length > 0 && password.trim().length > 0) ||
    (mode === "forgot" && email.trim().length > 0) ||
    (mode === "reset" && newPassword.trim().length > 0);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !canSubmit) {
      return;
    }

    if (mode === "login") {
      await handleLogin();
      return;
    }
    if (mode === "register") {
      await handleRegister();
      return;
    }
    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }
    await handleResetPassword();
  };

  const getPrimaryActionLabel = () => {
    if (isSubmitting) {
      return "...";
    }
    if (mode === "login") {
      return t("authPanel.login");
    }
    if (mode === "register") {
      return t("authPanel.register");
    }
    if (mode === "forgot") {
      return t("authPanel.sendResetLink");
    }
    return t("authPanel.resetPassword");
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-head">
          <p className="auth-eyebrow">Lux Viewer</p>
          <h2>{t("authPanel.title")}</h2>
        </div>

        {mode !== "reset" && (
          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>{t("authPanel.login")}</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>{t("authPanel.register")}</button>
            <button type="button" className={mode === "forgot" ? "active" : ""} onClick={() => setMode("forgot")}>{t("authPanel.forgot")}</button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isEmailMode && (
            <>
              <label htmlFor="auth-email">{t("authPanel.email")}</label>
              <input
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
            </>
          )}

          {isPasswordMode && (
            <>
              <label htmlFor="auth-password">{t("authPanel.password")}</label>
              <input
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </>
          )}

          {mode === "reset" && (
            <>
              <label htmlFor="auth-new-password">{t("authPanel.newPassword")}</label>
              <input
                id="auth-new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
              />
            </>
          )}

          {error && <div className="auth-error" role="alert">{error}</div>}
          {message && <div className="auth-message" aria-live="polite">{message}</div>}

          <button type="submit" className="auth-submit" disabled={isSubmitting || !canSubmit}>
            {getPrimaryActionLabel()}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthPanel;
