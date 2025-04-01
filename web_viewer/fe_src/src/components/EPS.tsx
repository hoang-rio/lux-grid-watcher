import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import { useTranslation } from "react-i18next";

export default function EPS({ inverterData, isSocketConnected }: ICProps) {
  const { t } = useTranslation();
  const epsValue = isSocketConnected ? inverterData.p_eps : 0;

  const renderEPSContent = (className?: string) => {
    return epsValue === 0 ? (
      <strong className={`eps-status ${className || ""}`}>{t('eps.standby')}</strong>
    ) : (
      <GeneralValue className={className} value={epsValue} unit=" W" />
    );
  };

  return (
    <div className="eps flex-1">
      <div className="row">
        <div className="col align-center">
          <div className={`y-arrow ${epsValue > 0 ? "down" : "none"}`}></div>
          <img src="/assets/icon_eps.png" />
          {renderEPSContent("show-small")}
        </div>
        <div className="eps-texts">
          {renderEPSContent()}
          <div className="description">{t('eps.backupPower')}</div>
        </div>
      </div>
    </div>
  );
}
