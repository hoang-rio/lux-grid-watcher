import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import { useTranslation } from "react-i18next";

export default function Consumption({
  inverterData,
  displayInverterData,
  isSSEConnected,
}: ICProps) {
  const { t } = useTranslation();
  const data = displayInverterData ?? inverterData!;
  const pConsumption =
    data.p_inv + data.p_to_user - data.p_rec;
  return (
    <div className="consumption flex-1">
      <div className="row">
        <div className="col align-center consumption-icon">
          <div className="arrows col">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={"comsumption-arrow-" + index}
                className={`y-arrow ${
                  isSSEConnected
                    ? pConsumption > 0
                      ? "down"
                      : "none"
                    : "none"
                }`}
              ></div>
            ))}
          </div>
          <img src="/assets/icon_consumption.png" />
          <GeneralValue
            className="show-small"
            value={isSSEConnected ? pConsumption : 0}
            unit=" W"
          />
        </div>
        <div className="consumption-texts">
          <GeneralValue
            value={isSSEConnected ? pConsumption : 0}
            unit=" W"
          />
          <div className="description">{t("consumptionPower")}</div>
        </div>
      </div>
    </div>
  );
}
