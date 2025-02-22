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

const MonthlyChart = forwardRef((_, ref: ForwardedRef<IFetchChart>) => {
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
      const time = item[3];
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
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/monthly-chart`
    );
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
    return () =>
      document.removeEventListener("visibilitychange", onVisiblityChange);
  }, [fetchChart, onVisiblityChange]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    if (mq.matches) {
      setIsDark(true);
    }

    // This callback will fire if the perferred color scheme changes without a reload
    mq.addEventListener("change", (evt) => setIsDark(evt.matches));
  }, []);

  if (chartData.length) {
    return <BarChart series={series} isDark={isDark} />;
  }
  return <Loading />;
});

MonthlyChart.displayName = "MonthlyChart";

export default memo(MonthlyChart);
