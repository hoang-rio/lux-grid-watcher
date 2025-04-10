import { memo, useCallback, useEffect, useRef, useState } from "react";
import { IInverterData, ITotal } from "../Intefaces";
import GeneralValue from "./GeneralValue";
import "./Summary.css";
import DisplayYield from "./DisplayYield";
import YieldChart from "./YieldChart";
import { fixedIfNeed } from "./utils";
import { useTranslation } from 'react-i18next';

interface IProps {
  invertData: IInverterData;
}
enum YieldDisplay {
  YIELD,
  CHART_TODAY,
  CHART_TOTAL,
}
function Summary({ invertData }: IProps) {
  const { i18n, t } = useTranslation();
  const [isShowCharged, setIsShowCharged] = useState(false);
  const [isShowFeed, setIsShowFeed] = useState(false);
  const isFetchingRef = useRef(false);
  const [total, setTotal] = useState<ITotal>();
  const [yieldDisplay, setYieldDisplay] = useState<YieldDisplay>(
    YieldDisplay.YIELD
  );

  const switchYieldDisplay = useCallback(() => {
    switch (yieldDisplay) {
      case YieldDisplay.YIELD:
        setYieldDisplay(YieldDisplay.CHART_TODAY);
        break;
      case YieldDisplay.CHART_TODAY:
        setYieldDisplay(YieldDisplay.CHART_TOTAL);
        break;
      default:
        setYieldDisplay(YieldDisplay.YIELD);
        break;
    }
  }, [yieldDisplay]);

  const fetchTotal = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    try {
      console.log(i18n.t('fetchingTotal'));
      isFetchingRef.current = true;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/total`);
      const json = await res.json();
      setTotal(json);
    } catch (err) {
      console.error(i18n.t('fetchTotalError'), err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [i18n]);

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

  // Extract yield content rendering
  const renderYieldContent = () => {
    switch (yieldDisplay) {
      case YieldDisplay.YIELD:
        return <DisplayYield total={total} ePVDay={invertData.e_pv_day} />;
      case YieldDisplay.CHART_TODAY:
        return (
          <YieldChart
            label="today"
            totalYield={invertData.e_pv_day}
            charge={invertData.e_chg_day}
            gridExport={invertData.e_to_grid_day}
          />
        );
      case YieldDisplay.CHART_TOTAL:
        return (
          <YieldChart
            label="total"
            totalYield={total?.pv || 0}
            charge={total?.battery_charged || 0}
            gridExport={total?.grid_export || 0}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="summary row">
      <div
        className="yield summary-item flex-1 col"
        onClick={switchYieldDisplay}
      >
        <div className="summary-item-title">{t('solarYield')}</div>
        <div className="summary-item-content col flex-1">
          {renderYieldContent()}
        </div>
      </div>
      <div
        className="battery summary-item flex-1"
        onClick={() => setIsShowCharged(!isShowCharged)}
      >
        <div className="summary-item-title">
          {isShowCharged ? t('batteryCharged') : t('batteryDischarge')}
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
                {isShowCharged ? t('chargedToday') : t('dischargedToday')}
              </div>
              {total && (
                <>
                  <GeneralValue
                    value={fixedIfNeed(
                      isShowCharged ? total.battery_charged : total.battery_discharged
                    )}
                    unit=" kWh"
                  />
                  <div className="description">
                    {t('total', { context: isShowCharged ? 'charged' : 'discharged' })}
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
          {isShowFeed ? t('feedInEnergy') : t('import')}
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
                    isShowFeed ? invertData.e_to_grid_day : invertData.e_to_user_day
                  }
                  unit=" kWh"
                />
                <div className="description">
                  {isShowFeed ? t('todayExport') : t('todayImport')}
                </div>
                {total && (
                  <>
                    <GeneralValue
                      value={fixedIfNeed(
                        isShowFeed ? total.grid_export : total.grid_import
                      )}
                      unit=" kWh"
                    />
                    <div className="description">
                      {t('total', { context: isShowFeed ? 'export' : 'import' })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="comsumption summary-item flex-1">
        <div className="summary-item-title ">{t('consumption')}</div>
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
              <div className="description">{t('todayUsed')}</div>
              {total && (
                <>
                  <GeneralValue value={fixedIfNeed(total.consumption)} unit=" kWh" />
                  <div className="description">{t('totalUsed')}</div>
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
