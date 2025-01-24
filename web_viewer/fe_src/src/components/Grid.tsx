import { useMemo } from "react";
import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";

export default function Grid({ inverterData, isSocketConnected }: ICProps) {
  const vac = useMemo(() => {
    if (isSocketConnected) {
      const vac = (inverterData.vacr || inverterData.vacs || inverterData.vact) / 10;
      if (vac > 300) {
        return 0;
      }
      return vac;
    }
    return 0;
  }, [inverterData.vacr, inverterData.vacs, inverterData.vact, isSocketConnected]);
  return (
    <div className="grid flex-1 row align-center justify-flex-end">
      <div className="row arrows">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={"grid-arrow-" + index}
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
      </div>
      <div className="col align-center">
        <GeneralValue
          className="show-small"
          value={
            isSocketConnected
              ? inverterData.p_to_user || inverterData.p_to_grid
              : 0
          }
          unit=" W"
        />
        <img src="/assets/icon_grid.png" />
        <GeneralValue
          className="show-small"
          value={
            isSocketConnected
              ? (inverterData.vacr || inverterData.vacs || inverterData.vact) /
                10
              : 0
          }
          unit=" Vac"
        />
        <GeneralValue
          className="show-small"
          value={isSocketConnected ? inverterData.fac / 100 : 0}
          unit=" Hz"
        />
      </div>
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
          value={vac}
          unit=" Vac"
        />
        <GeneralValue
          value={isSocketConnected ? inverterData.fac / 100 : 0}
          unit=" Hz"
        />
      </div>
    </div>
  );
}
