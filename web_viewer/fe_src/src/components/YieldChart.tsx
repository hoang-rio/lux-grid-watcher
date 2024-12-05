import { memo, useEffect, useState } from "react";
import "./YieldChart.css";

import Chart from "react-apexcharts";
const fixDisplay = (num: number) => {
    return Math.round(num * 10) / 10;
}

interface IProps {
  label: "Today" | "Total";
  totalYield: number;
  charge: number;
  gridExport: number;
}
function YieldChart({ totalYield, charge, gridExport, label }: IProps) {
  const [isDark, setIsDark] = useState(false);
  const load = totalYield - charge - gridExport;
  const loadPercent = ((load / totalYield) * 100).toFixed(1);
  const chargePercent = ((charge / totalYield) * 100).toFixed(1);
  const exportPercent = ((gridExport / totalYield) * 100).toFixed(1);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    if (mq.matches) {
      setIsDark(true);
    }

    // This callback will fire if the perferred color scheme changes without a reload
    mq.addEventListener("change", (evt) => setIsDark(evt.matches));
  }, []);
  return (
    <div className="yield-chart row flex-1">
      <div className="texts col flex-1 align-start justify-space-between">
        <div className="yield-chart-load">
          {loadPercent}% Load {label}
        </div>
        <div className="yield-chart-charge">
          {chargePercent}% Charge {label}
        </div>
        <div className="yield-chart-export">
          {exportPercent}% Export {label}
        </div>
        <div className="yield-chart-total">
          <strong>
            {label} {fixDisplay(totalYield)} kWh
          </strong>
        </div>
      </div>
      <div className="chart row align-center">
        <Chart
          type="pie"
          series={[
            fixDisplay(load),
            fixDisplay(charge),
            fixDisplay(gridExport),
          ]}
          options={{
            chart: {
              width: 100,
              type: "pie"
            },
            colors: ["#FF718F", "#5CC9A0", "#F2A474"],
            theme: {
              mode: isDark ? "dark" : "light",
            },
            labels: [
              `Load ${label} PV`,
              `Charge ${label} PV`,
              `Export ${label} PV`,
            ],
            legend: {
              show: false,
            },
          }}
        />
      </div>
    </div>
  );
}

export default memo(YieldChart);
