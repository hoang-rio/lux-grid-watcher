import { memo, useCallback, useEffect, useRef, useState } from "react";
import { IInverterData, ITotal } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import "./Summary.css";
import DisplayYield from "./DisplayYield";
import YieldChart from "./YieldChart";

interface IProps {
  invertData: IInverterData;
}
enum YieldDisplay {
  YEILD,
  CHART_TODAY,
  CHART_TOTAL,
}
function Summary({ invertData }: IProps) {
  const [isShowCharged, setIsShowCharnged] = useState(false);
  const [isShowFeed, setIsShowFeed] = useState(false);
  const isFetchingRef = useRef(false);
  const [total, setTotal] = useState<ITotal>();
  const [yieldDisplay, setYieldDisplay] = useState<YieldDisplay>(
    YieldDisplay.YEILD
  );

  const switchYieldDisplay = useCallback(() => {
    switch (yieldDisplay) {
      case YieldDisplay.YEILD:
        setYieldDisplay(YieldDisplay.CHART_TODAY);
        break;
      case YieldDisplay.CHART_TODAY:
        setYieldDisplay(YieldDisplay.CHART_TOTAL);
        break;
      default:
        setYieldDisplay(YieldDisplay.YEILD);
        break;
    }
  }, [yieldDisplay]);

  const fetchTotal = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    try {
      console.log("Fetching total...");
      isFetchingRef.current = true;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/total`);
      const json = await res.json();
      setTotal(json);
    } catch (err) {
      console.error("Fetch total error", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const onVisibilityChange = useCallback(() => {
    if (!document.hidden) {
      fetchTotal();
    }
  }, [fetchTotal]);

  useEffect(() => {
    fetchTotal();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchTotal, onVisibilityChange]);

  return (
    <div className="summary row">
      <div
        className="yield summary-item flex-1 col"
        onClick={switchYieldDisplay}
      >
        <div className="summary-item-title">Solar Yield</div>
        <div className="summary-item-content col flex-1">
          {yieldDisplay === YieldDisplay.YEILD && (
            <DisplayYield total={total} ePVDay={invertData.e_pv_day} />
          )}
          {yieldDisplay === YieldDisplay.CHART_TODAY && (
            <YieldChart
              label="Today"
              totalYield={invertData.e_pv_day}
              charge={invertData.e_chg_day}
              gridExport={invertData.e_to_grid_day}
            />
          )}
          {yieldDisplay === YieldDisplay.CHART_TOTAL && (
            <YieldChart
              label="Total"
              totalYield={total?.pv || 0}
              charge={total?.battery_charged || 0}
              gridExport={total?.grid_export || 0}
            />
          )}
        </div>
      </div>
      <div
        className="battery summary-item flex-1"
        onClick={() => setIsShowCharnged(!isShowCharged)}
      >
        <div className="summary-item-title">
          {isShowCharged ? "Battery Charged" : "Battery Discharge"}
        </div>
        <div className="summary-item-content">
          <div className="row justify-space-between align-center">
            <img src="/assets/icon_battery_discharging.png" />
            <div className="summary-item-content-texts">
              <GeneralValue
                value={
                  isShowCharged ? invertData.e_chg_day : invertData.e_dischg_day
                }
                unit=" kWh"
              />
              <div className="description">
                {isShowCharged ? "Charged today" : "Discharged today"}
              </div>
              {total && (
                <>
                  <GeneralValue
                    value={(isShowCharged
                      ? total.battery_charged
                      : total.battery_discharged
                    ).toFixed(1)}
                    unit=" kWh"
                  />
                  <div className="description">
                    Total {isShowCharged ? "Charged" : "Discharged"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div
        className="feed summary-item flex-1"
        onClick={() => setIsShowFeed(!isShowFeed)}
      >
        <div className="summary-item-title ">
          {isShowFeed ? "Feed-in Energy" : "Import"}
        </div>
        <div className="summary-item-content">
          <div className="row justify-space-between align-center">
            <img
              src={
                isShowFeed
                  ? "/assets/icon_feed_in_energy.png"
                  : "/assets/icon_import.png"
              }
            />
            <div className="feed-texts summary-item-content-texts">
              <div className="col">
                <GeneralValue
                  value={
                    isShowFeed
                      ? invertData.e_to_grid_day
                      : invertData.e_to_user_day
                  }
                  unit=" kWh"
                />
                <div className="description">
                  {isShowFeed ? "Today Export" : "Today Import"}
                </div>
                {total && (
                  <>
                    <GeneralValue
                      value={(isShowFeed
                        ? total.grid_export
                        : total.grid_import
                      ).toFixed(1)}
                      unit=" kWh"
                    />
                    <div className="description">
                      Total {isShowFeed ? "Export" : "Import"}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="comsumption summary-item flex-1">
        <div className="summary-item-title ">Comsumption</div>
        <div className="summary-item-content">
          <div className="row justify-space-between align-center">
            <img src="/assets/icon_consumption.png" />
            <div className="feed-texts summary-item-content-texts">
              <GeneralValue
                value={(
                  invertData.e_inv_day +
                  invertData.e_to_user_day +
                  invertData.e_eps_day -
                  invertData.e_rec_day
                ).toFixed(1)}
                unit=" kWh"
              />
              <div className="description">Today Used</div>
              {total && (
                <>
                  <GeneralValue
                    value={total.consumption.toFixed(1)}
                    unit=" kWh"
                  />
                  <div className="description">Total Used</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default memo(Summary);
