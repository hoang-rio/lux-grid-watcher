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
import { IFetchChart, SeriesItem } from "../Intefaces";
import Loading from "./Loading";
import { roundTo } from "./utils";
import BarChart from "./BarChart";

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
  }, []);

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

    // This callback will fire if the preferred color scheme changes without a reload
    mq.addEventListener("change", (evt) => setIsDark(evt.matches));
    return () => mq.removeEventListener("change", (evt) => setIsDark(evt.matches));
  }, []);

  if (chartData.length) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return (
      <BarChart
        series={series}
        isDark={isDark}
        xaxis={{
          type: "datetime",
          labels: {
            datetimeUTC: false,
            format: "d",
          },
          min: startOfMonth.getTime(),
          max: endOfMonth.getTime(),
          stepSize: 1,
        }}
      />
    );
  }
  return <Loading />;
});

DailyChart.displayName = "DailyChart";

export default memo(DailyChart);
