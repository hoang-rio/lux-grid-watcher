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
import { useTranslation } from "react-i18next";
import { IFetchChart, SeriesItem } from "../Intefaces";
import Loading from "./Loading";
import { roundTo } from "./utils";
import BarChart from "./BarChart";

const DailyChart = forwardRef((_, ref: ForwardedRef<IFetchChart>) => {
  const { t } = useTranslation();
  const [chartData, setChartData] = useState([]);
  const [isDark, setIsDark] = useState(false);
  const isFetchingRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

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
        name: t("chart.solarProduction"),
        data: solarSeries,
      },
      {
        name: t("chart.batteryDischarged"),
        data: batterDischargedSeries,
      },
      {
        name: t("chart.batteryCharged"),
        data: batteryChargedSeries,
      },
      {
        name: t("chart.exportToGrid"),
        data: gridExportSeries,
      },
      {
        name: t("chart.importToUser"),
        data: gridImportSeries,
      },
      {
        name: t("chart.consumption"),
        data: consumptionSeries,
      },
    ];
  }, [chartData, t]);

  const fetchChart = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    setIsLoading(true);
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/daily-chart`);
    const json = await res.json();
    setChartData(json);
    isFetchingRef.current = false;
    setIsLoading(false);
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

  if (isLoading || !chartData) {
    return <Loading />;
  }

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
});

DailyChart.displayName = "DailyChart";

export default memo(DailyChart);
