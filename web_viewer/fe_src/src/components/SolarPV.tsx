import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import PVPowerValue from "./PVPowerValue";

function SolarPV({ inverterData, isSocketConnected }: ICProps) {
  return (
    <div className="pv flex-1">
      <div className="icon col align-center">
        <div className="col align-center">
          <GeneralValue
            className="show-small"
            value={isSocketConnected ? inverterData.p_pv : 0}
            unit=" W"
          />
          <img src="/assets/icon_solor_yielding.png" />
        </div>
        <div
          className={`y-arrow ${
            inverterData.p_pv == 0 || !isSocketConnected ? "none" : ""
          }`}
        ></div>
      </div>
      <div className="pv-texts power flex-1">
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
  );
}

export default SolarPV;
