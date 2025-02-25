import { lazy, memo, Suspense, useRef, useState } from "react";
import { IClassNameProps, IFetchChart } from "../Intefaces";
import "./EnergyChart.css";
import Loading from "./Loading";

const DailyChart = lazy(() => import( "./DailyChart"));
const MonthlyChart = lazy(() => import("./MonthlyChart"));
const YearlyChart = lazy(() => import("./YearlyChart"));

enum EnergyChartType {
  Daily,
  Monthly,
  Yearly,
}
function EnergyChart({ className }: IClassNameProps) {
  const [energyChartType, setEnergyChartType] = useState(EnergyChartType.Daily);
  const fetchChartRef = useRef<IFetchChart>(null);
  return (
    <div className={`card col energy-chart ${className}`}>
      <div className="row justify-space-between">
        <div className="energy-chart-title">
          {EnergyChartType[energyChartType]} chart
        </div>
        <div className="row energy-chart-buttons">
          <button onClick={() => fetchChartRef?.current?.fetchChart()}>
            Update chart
          </button>
          <div>Chart type:</div>
          <div className="row chart-select">
            <button
              className={
                energyChartType === EnergyChartType.Daily ? "active" : undefined
              }
              onClick={() => setEnergyChartType(EnergyChartType.Daily)}
            >
              Daily
            </button>
            <button
              className={
                energyChartType === EnergyChartType.Monthly
                  ? "active"
                  : undefined
              }
              onClick={() => setEnergyChartType(EnergyChartType.Monthly)}
            >
              Monthly
            </button>
            <button
              className={
                energyChartType === EnergyChartType.Yearly
                  ? "active"
                  : undefined
              }
              onClick={() => setEnergyChartType(EnergyChartType.Yearly)}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>
      <div className="energy-chart-content flex-1 col">
        {energyChartType === EnergyChartType.Daily && (
          <Suspense fallback={<Loading />}>
            <DailyChart ref={fetchChartRef} />
          </Suspense>
        )}
        {energyChartType === EnergyChartType.Monthly && (
          <Suspense fallback={<Loading />}>
            <MonthlyChart ref={fetchChartRef} />
          </Suspense>
        )}
        {energyChartType === EnergyChartType.Yearly && (
          <Suspense fallback={<Loading />}>
            <YearlyChart ref={fetchChartRef} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default memo(EnergyChart);
