import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../utils/fetchUtil";
import "./InverterSetupPanel.css";

interface InverterSetupPanelProps {
  onCreated: () => Promise<void> | void;
}

function InverterSetupPanel({ onCreated }: InverterSetupPanelProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [dongleSerial, setDongleSerial] = useState("");
  const [invertSerial, setInvertSerial] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setIsSubmitting(true);
    setError("");
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
        setError(json.message || t("inverterSetup.createFailed"));
        return;
      }
      await onCreated();
    } catch {
      setError(t("inverterSetup.createFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inverter-setup-shell">
      <div className="inverter-setup-card">
        <h2>{t("inverterSetup.title")}</h2>
        <p>{t("inverterSetup.description")}</p>

        <label>{t("inverterSetup.name")}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />

        <label>{t("inverterSetup.dongleSerial")}</label>
        <input value={dongleSerial} onChange={(e) => setDongleSerial(e.target.value)} />

        <label>{t("inverterSetup.invertSerial")}</label>
        <input value={invertSerial} onChange={(e) => setInvertSerial(e.target.value)} />

        {error && <div className="inverter-setup-error">{error}</div>}

        <button disabled={isSubmitting} onClick={submit}>
          {t("inverterSetup.create")}
        </button>
      </div>
    </div>
  );
}

export default InverterSetupPanel;
