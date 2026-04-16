import { useMemo } from "react";
import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import { useTranslation } from "react-i18next";

function Battery({ inverterData, displayInverterData, isSSEConnected }: ICProps) {
  const { t } = useTranslation();
  const data = displayInverterData ?? inverterData!;
  const iconColor = useMemo(() => {
    if (data.soc < 10 || data.v_bat < 40) return "red";
    if (data.soc < 50) return "yellow";
    return "green";
  }, [data.soc, data.v_bat]);

  return (
    <div className="battery flex-1">
      <div className="row align-center">
        <div className="battery-texts">
          <GeneralValue
            value={
              isSSEConnected
                ? data.p_discharge || data.p_charge
                : 0
            }
            unit=" W"
          />
          <GeneralValue
            value={isSSEConnected ? data.soc : 0}
            unit="%"
          />
          <GeneralValue
            value={isSSEConnected ? data.v_bat : 0}
            unit=" Vdc"
          />
        </div>
        <div className="col align-center">
          <GeneralValue
            className="show-small"
            value={
              isSSEConnected
                ? data.p_discharge || data.p_charge
                : 0
            }
            unit=" W"
          />
          <div className="battery-icon-container">
            <img
              className="battery-icon"
              src={`/assets/icon_battery_${
                isSSEConnected ? Math.round(data.soc / 2 / 10) : 0
              }_${iconColor}.png`}
            />
            {data.bat_capacity && (
              <div className="battery-type-info">
                <span>{data.soh > 0 ? t("batteryTypeLithium") : t("batteryTypeLeadAcid")}: </span>
                <span className="battery-cap-bold">{data.bat_capacity}</span>
                <span>Ah</span>
              </div>
            )}
          </div>
          <GeneralValue
            className="show-small"
            value={isSSEConnected ? data.soc : 0}
            unit="%"
          />
          <GeneralValue
            className="show-small"
            value={isSSEConnected ? data.v_bat : 0}
            unit=" Vdc"
          />
        </div>
        <div className="arrows row">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={"batter-arrow-" + index}
              className={`x-arrow ${
                isSSEConnected
                  ? data.p_discharge > 0
                    ? "right"
                    : data.p_charge > 0
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
