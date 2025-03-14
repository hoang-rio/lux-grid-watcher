import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ITotal } from "../Intefaces";
import GeneralValue from "./GeneralValue";

interface IProps {
  total?: ITotal;
  ePVDay: number;
}
function DisplayYield({ total, ePVDay }: IProps) {
  const { t } = useTranslation();
  return (
    <div className="row justify-space-between align-center">
      <img src="/assets/icon_solor_yielding.png" />
      <div className="yield-texts summary-item-content-texts ">
        <GeneralValue value={ePVDay} unit=" kWh" />
        <div className="description">{t('yield.today')}</div>
        {total && (
          <>
            <GeneralValue value={total.pv.toFixed(1)} unit=" kWh" />
            <div className="description">{t('yield.total')}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(DisplayYield);
