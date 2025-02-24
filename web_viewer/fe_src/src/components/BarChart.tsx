import Chart from "react-apexcharts";
const SOLAR_PV_SERIE_NAME = "Solar production";

import { ApexOptions } from "apexcharts";
import { memo } from "react";

interface BarChartProps {
  series: ApexOptions["series"];
  isDark: boolean;
  xaxis?: ApexOptions["xaxis"];
}

function BarChart({ series, isDark, xaxis }: BarChartProps) {
  return (
    <Chart
      type="bar"
      height={400}
      series={series}
      options={{
        chart: {
          toolbar: {
            show: false,
          },
          zoom: {
            allowMouseWheelZoom: false,
          },
        },
        legend: {
          show: true,
          position: "top",
          horizontalAlign: "left",
        },
        colors: [
          "rgb(112, 173, 70)",
          "rgb(90, 155, 213)",
          "rgb(64, 38, 198)",
          "rgb(246, 104, 103)",
          "rgb(153, 107, 31)",
          "rgb(255, 164, 97)",
        ],
        theme: {
          mode: isDark ? "dark" : "light",
        },
        dataLabels: {
          enabled: false,
        },
        xaxis: xaxis || { type: "category" },
        tooltip: {
          x: {
            format: "dd/MM/yyyy",
          },
          y: {
            formatter(val) {
              return `${val} kWh`;
            },
          },
        },
        yaxis: [
          {
            seriesName: SOLAR_PV_SERIE_NAME,
            title: { text: "Energy (kWh)" },
          },
          { seriesName: SOLAR_PV_SERIE_NAME, show: false },
          { seriesName: SOLAR_PV_SERIE_NAME, show: false },
          { seriesName: SOLAR_PV_SERIE_NAME, show: false },
          { seriesName: SOLAR_PV_SERIE_NAME, show: false },
          { seriesName: SOLAR_PV_SERIE_NAME, show: false },
        ],
      }}
    />
  );
}

export default memo(BarChart);