import { useMemo } from "react";
import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";

function Battery({ inverterData, isSSEConnected }: ICProps) {
  const iconColor = useMemo(() => {
    if (inverterData.soc < 10 || inverterData.v_bat < 40) return "red";
    if (inverterData.soc < 50) return "yellow";
    return "green";
  }, [inverterData.soc, inverterData.v_bat]);

  return (
    <div className="battery flex-1">
      <div className="row align-center">
        <div className="battery-texts">
          <GeneralValue
            value={
              isSSEConnected
                ? inverterData.p_discharge || inverterData.p_charge
                : 0
            }
            unit=" W"
          />
          <GeneralValue
            value={isSSEConnected ? inverterData.soc : 0}
            unit="%"
          />
          <GeneralValue
            value={isSSEConnected ? inverterData.v_bat : 0}
            unit=" Vdc"
          />
        </div>
        <div className="col align-center">
          <GeneralValue
            className="show-small"
            value={
              isSSEConnected
                ? inverterData.p_discharge || inverterData.p_charge
                : 0
            }
            unit=" W"
          />
          <img
            className="battery-icon"
            src={`/assets/icon_battery_${
              isSSEConnected ? Math.round(inverterData.soc / 2 / 10) : 0
            }_${iconColor}.png`}
          />
          <GeneralValue
            className="show-small"
            value={isSSEConnected ? inverterData.soc : 0}
            unit="%"
          />
          <GeneralValue
            className="show-small"
            value={isSSEConnected ? inverterData.v_bat : 0}
            unit=" Vdc"
          />
        </div>
        <div className="arrows row">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={"batter-arrow-" + index}
              className={`x-arrow ${
                isSSEConnected
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
