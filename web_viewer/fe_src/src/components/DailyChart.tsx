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
// ...existing code...
import { useTranslation } from "react-i18next";
import { IFetchChart, SeriesItem } from "../Intefaces";
import Loading from "./Loading";
import { roundTo } from "./utils";
import BarChart from "./BarChart";

interface DailyChartProps {
  month?: string;
}

const DailyChart = forwardRef((props: DailyChartProps, ref: ForwardedRef<IFetchChart>) => {
  const { t } = useTranslation();
  const [chartData, setChartData] = useState([]);
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const isFetchingRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Accept month prop
  const month = props.month || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

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
    let url = `${import.meta.env.VITE_API_BASE_URL}/daily-chart`;
    if (month) {
      url += `?month=${month}`;
    }
    const res = await fetch(url);
    const json = await res.json();
    setChartData(json);
    isFetchingRef.current = false;
    setIsLoading(false);
  }, [month]);

  useImperativeHandle(
    ref,
    (): IFetchChart => ({
      fetchChart: fetchChart,
    })
  );

  const onVisiblityChange = useCallback(() => {
    if (!document.hidden) {
      // Only fetch if selected month is current month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const [selectedYear, selectedMonth] = month.split("-").map(Number);
      if (selectedYear === currentYear && selectedMonth === currentMonth) {
        fetchChart();
      }
    }
  }, [fetchChart, month]);

  useEffect(() => {
    const doFetchChart = async () => {
      await fetchChart();
    };
    doFetchChart();
    document.addEventListener("visibilitychange", onVisiblityChange);
    return () => document.removeEventListener("visibilitychange", onVisiblityChange);
  }, [fetchChart, onVisiblityChange]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // This callback will fire if the preferred color scheme changes without a reload
    mq.addEventListener("change", (evt) => setIsDark(evt.matches));
    return () => mq.removeEventListener("change", (evt) => setIsDark(evt.matches));
  }, []);

  if (isLoading || !chartData) {
    return <Loading />;
  }

  const [year, monthNum] = month.split("-").map(Number);
  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0);
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
