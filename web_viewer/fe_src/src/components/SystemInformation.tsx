import { IInverterData } from "../Intefaces";
import "./SystemInformation.css";
interface Props {
  inverterData: IInverterData;
}
function SystemInformation({ inverterData }: Props) {
  return (
    <div className="card system-information">
      <div className="system-title">
        <span className="system-title-text">System Information</span>
        <span>{inverterData.deviceTime}</span>
      </div>
      <div className="system-graph">
        <div className="pv">
          <div className="icon">
            <img src="/assets/icon_solor_yielding.png" />
            <div
              className={`arrow ${inverterData.p_pv == 0 ? "none" : ""}`}
            ></div>
          </div>
          <div className="power">
            <div className="power-item">
              <span className="power-title">PV1</span>
              <span className="power-value">
                <strong>{inverterData.p_pv_1}</strong> W
              </span>
              <span className="power-value">
                <strong>{inverterData.v_pv_1}</strong> V
              </span>
            </div>
            <div className="power-item">
              <span className="power-title">PV2</span>
              <span className="power-value">
                <strong>{inverterData.p_pv_2}</strong> W
              </span>
              <span className="power-value">
                <strong>{inverterData.v_pv_2}</strong> V
              </span>
            </div>
            <div className="power-item">
              <span className="power-title" title="Total PV">
                Total PV
              </span>
              <span className="power-value">
                <strong>{inverterData.p_pv}</strong> W
              </span>
            </div>
          </div>
        </div>
        <div className="system-status" title={inverterData.status_text}>
          <div
            className={`system-status-icon ${
              inverterData.status !== 0 ? "normal" : "fault"
            }`}
          ></div>
          <div>{inverterData.status !== 0 ? "Normal" : "Fault"}</div>
        </div>
        <div className="battery">
          <div className="battery-row">
            <div className="battery-texts">
              <div>
                <strong>{inverterData.p_discharge || inverterData.p_charge}</strong> W
              </div>
              <div>
                <strong>{inverterData.soc}</strong>%
              </div>
              <div>
                <strong>{inverterData.v_bat}</strong> Vdc
              </div>
            </div>
            <img
              className="battery-icon"
              src={`/assets/icon_battery_${Math.floor(
                inverterData.soc / 2 / 10
              )}_green.png`}
            />
            <div
              className={`battery-arrow ${
                inverterData.p_discharge > 0
                  ? "discharge"
                  : inverterData.p_charge > 0
                  ? "charge"
                  : "none"
              }`}
            ></div>
            <div
              className={`battery-arrow ${
                inverterData.p_discharge > 0
                  ? "discharge"
                  : inverterData.p_charge > 0
                  ? "charge"
                  : "none"
              }`}
            ></div>
          </div>
          <div className="battery-type">Lead-acid battery: 300 Ah</div>
        </div>
      </div>
    </div>
  );
}

export default SystemInformation;
