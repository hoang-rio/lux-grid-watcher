import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";

export default function EPS({ inverterData, isSocketConnected }: ICProps) {
  return (
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
          {inverterData.p_eps === 0 ? (
            <strong className="show-small eps-status">Standby</strong>
          ) : (
            <GeneralValue
              className="show-small"
              value={isSocketConnected ? inverterData.p_eps : 0}
              unit=" W"
            />
          )}
        </div>
        <div className="eps-texts">
          {inverterData.p_eps === 0 ? (
            <strong className="eps-status">Standby</strong>
          ) : (
            <GeneralValue
              value={isSocketConnected ? inverterData.p_eps : 0}
              unit=" W"
            />
          )}
          <div className="description">Backup Power(EPS)</div>
        </div>
      </div>
    </div>
  );
}
