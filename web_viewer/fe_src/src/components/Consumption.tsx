import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import { useTranslation } from "react-i18next";

export default function Consumption({
  inverterData,
  isSocketConnected,
}: ICProps) {
  const { t } = useTranslation();
  const pConsumption =
    inverterData.p_inv + inverterData.p_to_user - inverterData.p_rec;
  return (
    <div className="consumption flex-1">
      <div className="row">
        <div className="col align-center consumption-icon">
          <div className="arrows col">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={"comsumption-arrow-" + index}
                className={`y-arrow ${
                  isSocketConnected
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
            value={isSocketConnected ? pConsumption : 0}
            unit=" W"
          />
        </div>
        <div className="consumption-texts">
          <GeneralValue
            value={isSocketConnected ? pConsumption : 0}
            unit=" W"
          />
          <div className="description">{t("consumptionPower")}</div>
        </div>
      </div>
    </div>
  );
}
