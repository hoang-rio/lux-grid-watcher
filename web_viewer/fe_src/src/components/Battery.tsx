import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";

function Battery({ inverterData, isSocketConnected }: ICProps) {
  return (
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
        <div className="col align-center">
          <GeneralValue
            className="show-small"
            value={
              isSocketConnected
                ? inverterData.p_discharge || inverterData.p_charge
                : 0
            }
            unit=" W"
          />
          <img
            className="battery-icon"
            src={`/assets/icon_battery_${
              isSocketConnected ? Math.round(inverterData.soc / 2 / 10) : 0
            }_green.png`}
          />
          <GeneralValue
            className="show-small"
            value={isSocketConnected ? inverterData.soc : 0}
            unit="%"
          />
          <GeneralValue
            className="show-small"
            value={isSocketConnected ? inverterData.v_bat : 0}
            unit=" Vdc"
          />
        </div>
        <div className="arrows row">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={"batter-arrow-" + index}
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
      </div>
    </div>
  );
}

export default Battery;
