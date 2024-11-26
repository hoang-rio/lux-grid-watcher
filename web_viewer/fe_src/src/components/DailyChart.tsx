import { useCallback, useEffect, useMemo, useState } from "react";
import "./DailyChart.css";
import Chart from "react-apexcharts";

interface SeriesItem {
  x: number | string;
  y: never;
}
export default function DailyChart() {
  const [chartData, setChartData] = useState([]);

  const series = useMemo(() => {
    const pvSeries: SeriesItem[] = [];
    const batterySeries: SeriesItem[] = [];
    const gridSeries: SeriesItem[] = [];
    const consumptionSeries: SeriesItem[] = [];
    const socSeries: SeriesItem[] = [];

    chartData.forEach((item) => {
      const time = new Date(item[1]).getTime();
      pvSeries.push({ x: time, y: item[2] });
      batterySeries.push({ x: time, y: item[3] });
      gridSeries.push({ x: time, y: item[4] });
      consumptionSeries.push({ x: time, y: item[5] });
      socSeries.push({ x: time, y: item[6] });
    });
    return [
      {
        name: "PV",
        data: pvSeries,
      },
      {
        name: "Battery",
        data: batterySeries,
      },
      {
        name: "Grid",
        data: gridSeries,
      },
      {
        name: "Consumption",
        data: consumptionSeries,
      },
      {
        name: "SOC",
        data: socSeries,
      },
    ];
  }, [chartData]);

  const fetchChart = useCallback(async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/daily-chart`);
    const json = await res.json();
    setChartData(json);
  }, [setChartData]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  return (
    <div className="card daily-chart">
      <div className="daily-chart-title">Daily Chart</div>
      <div className="daily-chart-content">
        <Chart
          type="line"
          series={series}
          options={{
            chart: {
              toolbar: {
                show: false,
              },
            },
            theme: {
              mode: window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light",
            },
            xaxis: {
              type: 'datetime',
              labels: {
                datetimeUTC: false,
              }
            },
            yaxis: [
              { seriesName: "PV", title: { text: "W" } },
              { seriesName: "PV", show: false },
              { seriesName: "PV", show: false },
              { seriesName: "PV", show: false },
              {
                seriesName: "SOC",
                opposite: true,
                tickAmount: 10,
                min: 0,
                max: 100,
                title: {
                  text: "SOC (%)",
                },
              },
            ],
          }}
        />
      </div>
    </div>
  );
}
