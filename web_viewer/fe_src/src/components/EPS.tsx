import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import { useTranslation } from "react-i18next";

export default function EPS({ inverterData, isSocketConnected }: ICProps) {
  const { t } = useTranslation();
  return (
    <div className="eps flex-1">
      <div className="row">
        <div className="col align-center">
          <div
            className={`y-arrow ${
              isSocketConnected
                ? inverterData.p_eps > 0
                  ? "down"
                  : "none"
                : "none"
            }`}
          ></div>
          <img src="/assets/icon_eps.png" />
          {inverterData.p_eps === 0 ? (
            <strong className="show-small eps-status">{t('eps.standby')}</strong>
          ) : (
            <GeneralValue
              className="show-small"
              value={isSocketConnected ? inverterData.p_eps : 0}
              unit=" W"
            />
          )}
        </div>
        <div className="eps-texts">
          {inverterData.p_eps === 0 ? (
            <strong className="eps-status">{t('eps.standby')}</strong>
          ) : (
            <GeneralValue
              value={isSocketConnected ? inverterData.p_eps : 0}
              unit=" W"
            />
          )}
          <div className="description">{t('eps.backupPower')}</div>
        </div>
      </div>
    </div>
  );
}
