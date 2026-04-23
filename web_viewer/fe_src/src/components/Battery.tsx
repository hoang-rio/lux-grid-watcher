import { useMemo, useEffect } from "react";
import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import { useTranslation } from "react-i18next";

function Battery({ inverterData, isSSEConnected }: ICProps) {
  const { t } = useTranslation();

  useEffect(() => {
    // Preload image to save on cache to make image display able when server hit offline or error
    ["red", "yellow", "green"].forEach((color) => {
      const img = new Image();
      img.src = `/assets/icon_battery_0_${color}.png`;
    });
  }, []);

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
          <div className="battery-icon-container">
            <img
              className="battery-icon"
              src={`/assets/icon_battery_${
                isSSEConnected ? Math.round(inverterData.soc / 2 / 10) : 0
              }_${iconColor}.png`}
            />
<<<<<<< HEAD
            {!!inverterData.bat_capacity && (
>>>>>>> a3b4912 (fix: resolve bat_capacity zeroing in DONGLE mode and FE rendering)
              <div className="battery-type-info">
                <span>{inverterData.soh > 0 ? t("batteryTypeLithium") : t("batteryTypeLeadAcid")}: </span>
                <span className="battery-cap-bold">{inverterData.bat_capacity}</span>
                <span>Ah</span>
              </div>
            )}
          </div>
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
