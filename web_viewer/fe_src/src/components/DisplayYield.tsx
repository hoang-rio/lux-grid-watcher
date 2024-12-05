import { memo } from "react";
import { ITotal } from "../Intefaces";
import GeneralValue from "./GeneralValue";

interface IProps {
  total?: ITotal;
  ePVDay: number;
}
function DisplayYield({ total, ePVDay }: IProps) {
  return (
    <div className="row justify-space-between">
      <img src="/assets/icon_consumption.png" />
      <div className="yield-texts text-right">
        <GeneralValue value={ePVDay} unit=" kWh" />
        <div className="description">Yield today</div>
        {total && (
          <>
            <GeneralValue value={total.pv.toFixed(1)} unit=" kWh" />
            <div className="description">Total Yield</div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(DisplayYield);
