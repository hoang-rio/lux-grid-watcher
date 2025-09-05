import { lazy, memo, Suspense, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [energyChartType, setEnergyChartType] = useState(EnergyChartType.Daily);
  const fetchChartRef = useRef<IFetchChart>(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const years = [currentYear - 1, currentYear];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Month select handler
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = Number(e.target.value);
    setSelectedYear(newYear);
    // If switching to current year and previous month is not valid, select current month
    if (newYear === currentYear && selectedMonth > currentMonth) {
      setSelectedMonth(currentMonth);
    }
    setTimeout(() => fetchChartRef?.current?.fetchChart(), 0);
  };
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(Number(e.target.value));
    setTimeout(() => fetchChartRef?.current?.fetchChart(), 0);
  };

  return (
    <div className={`card col energy-chart ${className}`}>
      <div className="row justify-space-between">
        <div className="energy-chart-title">
          {t("energyChart.title", {
            context: EnergyChartType[energyChartType].toLowerCase(),
          })}
        </div>
        <div className="row energy-chart-buttons">
          <button onClick={() => fetchChartRef?.current?.fetchChart()}>
            {t("energyChart.updateChart")}
          </button>
          <div>{t("energyChart.chartType")}</div>
          <div className="row chart-select">
            <button
              className={
                energyChartType === EnergyChartType.Daily ? "active" : undefined
              }
              onClick={() => setEnergyChartType(EnergyChartType.Daily)}
            >
              {t("energyChart.daily")}
            </button>
            <button
              className={
                energyChartType === EnergyChartType.Monthly
                  ? "active"
                  : undefined
              }
              onClick={() => setEnergyChartType(EnergyChartType.Monthly)}
            >
              {t("energyChart.monthly")}
            </button>
            <button
              className={
                energyChartType === EnergyChartType.Yearly
                  ? "active"
                  : undefined
              }
              onClick={() => setEnergyChartType(EnergyChartType.Yearly)}
            >
              {t("energyChart.yearly")}
            </button>
          </div>
        </div>
      </div>
      {energyChartType === EnergyChartType.Daily && (
        <div className="month-select-row">
          <label className="month-select-label">
            {t("energyChart.selectMonth", "Month:")}
          </label>
          <select
            className="month-select-input"
            value={selectedYear}
            onChange={handleYearChange}
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            className="month-select-input"
            value={selectedMonth}
            onChange={handleMonthChange}
          >
            {months.map((month) => {
              // Only allow months up to current month for current year
              if (selectedYear === currentYear && month > currentMonth) return null;
              return (
                <option key={month} value={month}>{String(month).padStart(2, "0")}</option>
              );
            })}
          </select>
        </div>
      )}
      <div className="energy-chart-content flex-1 col">
        {energyChartType === EnergyChartType.Daily && (
          <Suspense fallback={<Loading />}>
            <DailyChart
              ref={fetchChartRef}
              month={`${selectedYear}-${String(selectedMonth).padStart(2, "0")}`}
            />
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
