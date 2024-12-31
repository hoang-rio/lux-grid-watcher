import {
  ForwardedRef,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Chart from "react-apexcharts";
import { IFetchChart, SeriesItem } from "../Intefaces";
import Loading from "./Loading";
import { roundTo } from "./utils";

const SOLAR_PV_SERIE_NAME = "Solar production";

const DailyChart = forwardRef((_, ref: ForwardedRef<IFetchChart>) => {
  const [chartData, setChartData] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const isFetchingRef = useRef<boolean>(false);
  const series = useMemo(() => {
    const solarSeries: SeriesItem[] = [];
    const batteryChargedSeries: SeriesItem[] = [];
    const batterDischargedSeries: SeriesItem[] = [];
    const gridImportSeries: SeriesItem[] = [];
    const gridExportSeries: SeriesItem[] = [];
    const consumptionSeries: SeriesItem[] = [];

    chartData.forEach((item) => {
      const time = new Date(item[3]).getTime();
      solarSeries.push({ x: time, y: roundTo(item[4]) });
      batteryChargedSeries.push({ x: time, y: roundTo(item[5]) });
      batterDischargedSeries.push({ x: time, y: roundTo(item[6]) });
      gridImportSeries.push({ x: time, y: roundTo(item[7]) });
      gridExportSeries.push({ x: time, y: roundTo(item[8]) });
      consumptionSeries.push({ x: time, y: roundTo(item[9]) });
    });
    return [
      {
        name: SOLAR_PV_SERIE_NAME,
        data: solarSeries,
      },
      {
        name: "Battery discharged",
        data: batterDischargedSeries,
      },
      {
        name: "Battery charged",
        data: batteryChargedSeries,
      },
      {
        name: "Export to grid",
        data: gridExportSeries,
      },
      {
        name: "Import to user",
        data: gridImportSeries,
      },
      {
        name: "Comsumption",
        data: consumptionSeries,
      },
    ];
  }, [chartData]);

  const fetchChart = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/daily-chart`);
    const json = await res.json();
    setChartData(json);
    isFetchingRef.current = false;
  }, [setChartData]);

  useImperativeHandle(
    ref,
    (): IFetchChart => ({
      fetchChart: fetchChart,
    })
  );

  const onVisiblityChange = useCallback(() => {
    if (!document.hidden) {
      fetchChart();
    }
  }, [fetchChart]);

  useEffect(() => {
    fetchChart();
    document.addEventListener("visibilitychange", onVisiblityChange);
    return () => document.removeEventListener("visibilitychange", onVisiblityChange);
  }, [fetchChart, onVisiblityChange]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    if (mq.matches) {
      setIsDark(true);
    }

    // This callback will fire if the perferred color scheme changes without a reload
    mq.addEventListener("change", (evt) => setIsDark(evt.matches));
  }, []);

  if (chartData.length)
    return (
      <Chart
        type="bar"
        height={400}
        series={series.reverse()}
        options={{
          chart: {
            toolbar: {
              show: false,
            },
            zoom: {
              allowMouseWheelZoom: false,
            },
          },
          colors: [
            "rgb(112, 173, 70)",
            "rgb(90, 155, 213)",
            "rgb(64, 38, 198)",
            "rgb(246, 104, 103)",
            "rgb(153, 107, 31)",
            "rgb(255, 164, 97)",
          ].reverse(),
          theme: {
            mode: isDark ? "dark" : "light",
          },
          dataLabels: {
            enabled: false,
          },
          xaxis: {
            type: "datetime",
            labels: {
              datetimeUTC: false,
              format: "dd",
            },
          },
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
          ].reverse(),
        }}
      />
    );
  return <Loading />;
});

DailyChart.displayName = "DailyChart";

export default memo(DailyChart);
