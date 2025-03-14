import { IInverterData } from "../Intefaces";
import "./SystemInformation.css";
import SolarPV from "./SolarPV";
import Battery from "./Battery";
import Inverter from "./Inverter";
import Grid from "./Grid";
import Consumption from "./Consumption";
import EPS from "./EPS";
import { useTranslation } from 'react-i18next';

interface Props {
  inverterData: IInverterData;
  isSocketConnected: boolean;
  onReconnect: () => void;
}

function SystemInformation({
  inverterData,
  isSocketConnected,
  onReconnect,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="card system-information">
      <div className="system-title">
        <span className="system-title-text">{t('systemInformation')}</span>
        <span>{inverterData.deviceTime}</span>
      </div>
      <div className="system-graph">
        <div className="system-status row">
          <div
            className="system-status-display"
            title={inverterData.status_text}
          >
            <div
              className={`system-status-icon ${
                !isSocketConnected
                  ? "offline"
                  : inverterData.status !== 0
                  ? "normal"
                  : "fault"
              }`}
            ></div>
            <div>
              {!isSocketConnected
                ? "Offline"
                : inverterData.status !== 0
                ? "Normal"
                : "Fault"}
            </div>
          </div>
          <button
            className="system-status-reconnect"
            onClick={onReconnect}
            title={t('reconnect')}
            disabled={isSocketConnected}
          >
            {t('reconnect')}
          </button>
        </div>
        <div className="row">
          <div className="flex-1"></div>
          <SolarPV
            inverterData={inverterData}
            isSocketConnected={isSocketConnected}
          />
          <div className="flex-1"></div>
        </div>
        <div className="row">
          <Battery
            inverterData={inverterData}
            isSocketConnected={isSocketConnected}
          />
          <Inverter
            inverterData={inverterData}
            isSocketConnected={isSocketConnected}
          />
          <Grid
            inverterData={inverterData}
            isSocketConnected={isSocketConnected}
          />
        </div>
        <div className="row">
          <div className="flex-1"></div>
          <EPS
            inverterData={inverterData}
            isSocketConnected={isSocketConnected}
          />
          <Consumption
            inverterData={inverterData}
            isSocketConnected={isSocketConnected}
          />
        </div>
      </div>
    </div>
  );
}

export default SystemInformation;
