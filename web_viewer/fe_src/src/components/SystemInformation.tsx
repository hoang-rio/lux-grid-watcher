import { IInverterData } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import PVPowerValue from "./PVPowerValue";
import "./SystemInformation.css";
interface Props {
  inverterData: IInverterData;
  isSocketConnected: boolean;
  onReconnect: () => void;
}
function SystemInformation({ inverterData, isSocketConnected, onReconnect }: Props) {
  return (
    <div className="card system-information">
      <div className="system-title">
        <span className="system-title-text">System Information</span>
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
            title="Reconnect to socket server"
            disabled={isSocketConnected}
          >
            Reconnect
          </button>
        </div>
        <div className="row">
          <div className="flex-1"></div>
          <div className="pv flex-1">
            <div className="icon col align-center">
              <img src="/assets/icon_solor_yielding.png" />
              <div
                className={`y-arrow ${
                  inverterData.p_pv == 0 || !isSocketConnected ? "none" : ""
                }`}
              ></div>
            </div>
            <div className="power">
              <PVPowerValue
                label="PV1"
                pValue={isSocketConnected ? inverterData.p_pv_1 : 0}
                vValue={isSocketConnected ? inverterData.v_pv_1 : 0}
              />
              <PVPowerValue
                label="PV2"
                pValue={isSocketConnected ? inverterData.p_pv_2 : 0}
                vValue={isSocketConnected ? inverterData.v_pv_2 : 0}
              />
              <PVPowerValue
                label="Total PV"
                pValue={isSocketConnected ? inverterData.p_pv : 0}
              />
            </div>
          </div>
          <div className="flex-1"></div>
        </div>
        <div className="row">
          <div className="battery flex-1">
            <div className="row align-center">
              <div className="battery-texts">
                <GeneralValue
                  value={
                    isSocketConnected
                      ? inverterData.p_discharge || inverterData.p_charge
                      : 0
                  }
                  unit=" W"
                />
                <GeneralValue
                  value={isSocketConnected ? inverterData.soc : 0}
                  unit="%"
                />
                <GeneralValue
                  value={isSocketConnected ? inverterData.v_bat : 0}
                  unit=" Vdc"
                />
              </div>
              <img
                className="battery-icon"
                src={`/assets/icon_battery_${
                  isSocketConnected ? Math.round(inverterData.soc / 2 / 10) : 0
                }_green.png`}
              />
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={'batter-arrow-' + index}
                  className={`x-arrow ${
                    isSocketConnected
                      ? inverterData.p_discharge > 0
                        ? "right"
                        : inverterData.p_charge > 0
                        ? "left"
                        : "none"
                      : "none"
                  }`}
                ></div>
              ))}
            </div>
            <div className="battery-type hidden">
              Lead-acid battery: <strong>300</strong> Ah
            </div>
          </div>
          <div className="inverter flex-1">
            <div className="row align-center">
              <img src="/assets/inverter_off_grid_20231003.png" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={'inverter-arrow-' + index}
                  className={`x-arrow ${
                    isSocketConnected
                      ? inverterData.p_inv > 0
                        ? "right"
                        : "none"
                      : "none"
                  }`}
                ></div>
              ))}
            </div>
          </div>
          <div className="grid flex-1">
            <div className="row align-center">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={'grid-arrow-' + index}
                  className={`x-arrow ${
                    isSocketConnected
                      ? inverterData.p_to_grid > 0
                        ? "right"
                        : inverterData.p_to_user > 0
                        ? "left"
                        : "none"
                      : "none"
                  }`}
                ></div>
              ))}
              <img src="/assets/icon_grid.png" />
              <div className="grid-texts">
                <GeneralValue
                  value={
                    isSocketConnected
                      ? inverterData.p_to_user || inverterData.p_to_grid
                      : 0
                  }
                  unit=" W"
                />
                <GeneralValue
                  value={
                    isSocketConnected
                      ? (inverterData.vacr ||
                          inverterData.vacs ||
                          inverterData.vact) / 10
                      : 0
                  }
                  unit=" Vac"
                />
                <GeneralValue
                  value={isSocketConnected ? inverterData.fac / 100 : 0}
                  unit=" Hz"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="flex-1"></div>
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
              </div>
              <div className="eps-texts">
                {inverterData.p_eps === 0 ? (
                  <strong className="eps-status">Standby</strong>
                ) : (
                  <GeneralValue value={inverterData.p_eps} unit=" W" />
                )}
                <div className="description">Backup Power(EPS)</div>
              </div>
            </div>
          </div>
          <div className="consumption flex-1">
            <div className="row">
              <div className="col align-center consumption-icon">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={"comsumption-arrow-" + index}
                    className={`y-arrow ${
                      isSocketConnected
                        ? inverterData.p_inv > 0
                          ? "down"
                          : "none"
                        : "none"
                    }`}
                  ></div>
                ))}
                <img src="/assets/icon_consumption.png" />
              </div>
              <div className="consumption-texts">
                <GeneralValue
                  value={isSocketConnected ? inverterData.p_inv : 0}
                  unit=" W"
                />
                <div className="description">Consumption Power</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemInformation;
