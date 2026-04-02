import { useMemo, useState } from "react";
import { IAuthUser } from "../Intefaces";
import "./AuthPanel.css";

interface AuthPanelProps {
  onAuthSuccess: (accessToken: string, refreshToken: string, user?: IAuthUser) => void;
}

type Mode = "login" | "register" | "forgot" | "reset";

function AuthPanel({ onAuthSuccess }: AuthPanelProps) {
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
        setError(json.message || "Login failed");
        return;
      }
      onAuthSuccess(json.access_token, json.refresh_token, json.user);
    } catch {
      setError("Login failed");
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
        setError(json.message || "Register failed");
        return;
      }
      setMessage("Register success. Please verify your email, then login.");
      setMode("login");
    } catch {
      setError("Register failed");
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
        setError(json.message || "Request failed");
        return;
      }
      setMessage(json.message || "If your email is registered, a reset link has been sent.");
    } catch {
      setError("Request failed");
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
        setError(json.message || "Reset failed");
        return;
      }
      setMessage("Password reset success. Please login.");
      window.history.replaceState({}, document.title, window.location.pathname);
      setMode("login");
    } catch {
      setError("Reset failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Account</h2>

        {mode !== "reset" && (
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
            <button className={mode === "forgot" ? "active" : ""} onClick={() => setMode("forgot")}>Forgot</button>
          </div>
        )}

        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <>
            <label>Email</label>
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
            <label>Password</label>
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
            <label>New Password</label>
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
          <button disabled={isSubmitting} onClick={handleLogin}>Login</button>
        )}
        {mode === "register" && (
          <button disabled={isSubmitting} onClick={handleRegister}>Register</button>
        )}
        {mode === "forgot" && (
          <button disabled={isSubmitting} onClick={handleForgotPassword}>Send reset link</button>
        )}
        {mode === "reset" && (
          <button disabled={isSubmitting} onClick={handleResetPassword}>Reset password</button>
        )}
      </div>
    </div>
  );
}

export default AuthPanel;
