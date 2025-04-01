import { useMemo } from "react";
import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";

export default function Grid({ inverterData, isSocketConnected }: ICProps) {
  // Destructure inverterData for cleaner access
  const { vacr, vacs, vact, p_to_user, p_to_grid, fac } = inverterData;

  // Compute vac with refactored logic
  const vac = useMemo(() => {
    if (!isSocketConnected) return 0;
    const computedVac = (vacr || vacs || vact) / 10;
    return computedVac > 300 ? 0 : computedVac;
  }, [isSocketConnected, vacr, vacs, vact]);

  // Compute power and frequency values
  const powerValue = useMemo(() => (isSocketConnected ? (p_to_user || p_to_grid) : 0), [isSocketConnected, p_to_user, p_to_grid]);
  const frequencyValue = useMemo(() => (isSocketConnected ? fac / 100 : 0), [fac, isSocketConnected]);

  // Determine arrow direction based on inverterData
  const arrowDirection = useMemo(() => {
    if (!isSocketConnected) return "none";
    return p_to_grid > 0 ? "right" : (p_to_user > 0 ? "left" : "none");
  }, [isSocketConnected, p_to_grid, p_to_user]);

  return (
    <div className="grid flex-1 row align-center justify-flex-end">
      <div className="row arrows">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={"grid-arrow-" + index}
            className={`x-arrow ${arrowDirection}`}
          ></div>
        ))}
      </div>
      <div className="col align-center">
        <GeneralValue
          className="show-small"
          value={powerValue}
          unit=" W"
        />
        <img src="/assets/icon_grid.png" />
        <GeneralValue
          className="show-small"
          value={vac}
          unit=" Vac"
        />
        <GeneralValue
          className="show-small"
          value={frequencyValue}
          unit=" Hz"
        />
      </div>
      <div className="grid-texts">
        <GeneralValue
          value={powerValue}
          unit=" W"
        />
        <GeneralValue
          value={vac}
          unit=" Vac"
        />
        <GeneralValue
          value={frequencyValue}
          unit=" Hz"
        />
      </div>
    </div>
  );
}
