import { ICProps } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import PVPowerValue from "./PVPowerValue";
import { useTranslation } from 'react-i18next';

function SolarPV({ inverterData, isSSEConnected }: ICProps) {
  const { t } = useTranslation();
  return (
    <div className="pv flex-1">
      <div className="icon col align-center">
        <div className="col align-center">
          <GeneralValue
            className="show-small"
            value={isSSEConnected ? inverterData.p_pv : 0}
            unit=" W"
          />
          <img src="/assets/icon_solor_yielding.png" />
        </div>
        <div
          className={`y-arrow ${
            inverterData.p_pv == 0 || !isSSEConnected ? "none" : ""
          }`}
        ></div>
      </div>
      <div className="pv-texts power flex-1">
        <PVPowerValue
          label={t('PV1')}
          pValue={isSSEConnected ? inverterData.p_pv_1 : 0}
          vValue={isSSEConnected ? inverterData.v_pv_1 : 0}
        />
        <PVPowerValue
          label={t('PV2')}
          pValue={isSSEConnected ? inverterData.p_pv_2 : 0}
          vValue={isSSEConnected ? inverterData.v_pv_2 : 0}
        />
        <PVPowerValue
          label={t('totalPV')}
          pValue={isSSEConnected ? inverterData.p_pv : 0}
        />
      </div>
    </div>
  );
}

export default SolarPV;
