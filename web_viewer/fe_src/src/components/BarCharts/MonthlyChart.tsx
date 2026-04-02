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
import { IFetchChart, SeriesItem } from "../../Intefaces";
import Loading from "../Loading";
import { roundTo } from "../utils";
import BarChart from "./BarChart";

interface MonthlyChartProps {
  year?: number;
  onYearsAvailable?: (years: number[]) => void;
  selectedInverterId?: string;
  authToken?: string;
}

const MonthlyChart = forwardRef((props: MonthlyChartProps, ref: ForwardedRef<IFetchChart>) => {
  const { year } = props;
  const { t } = useTranslation();
  const [chartData, setChartData] = useState<[]>([]);
  const [isDark, setIsDark] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
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

  const firstYearsReported = useRef(false);

  const fetchChart = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const useYear = year ?? new Date().getFullYear();
      const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/monthly-chart`);
      url.searchParams.set("year", String(useYear));
      if (props.selectedInverterId) {
        url.searchParams.set("inverter_id", props.selectedInverterId);
      }
      const headers: Record<string, string> = {};
      if (props.authToken) {
        headers.Authorization = `Bearer ${props.authToken}`;
      }
      const res = await fetch(url.toString(), { headers });
      const json = await res.json();
      setChartData(json && json.chart ? json.chart : json || []);
      // report available years to parent once on first successful fetch
      if (
        !firstYearsReported.current &&
        json &&
        Array.isArray(json.years) &&
        json.years.length
      ) {
        try {
          const yearsNums = json.years
            .map((y: unknown) => Number(y))
            .filter(Boolean);
          if (
            yearsNums.length &&
            typeof props.onYearsAvailable === "function"
          ) {
            props.onYearsAvailable(
              yearsNums.sort((a: number, b: number) => b - a),
            );
            firstYearsReported.current = true;
          }
        } catch {
          // ignore parsing errors
        }
      }
    } catch {
      // swallow, component will show empty chart
      setChartData([]);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.authToken, props.selectedInverterId, year]);

  useImperativeHandle(ref, (): IFetchChart => ({ fetchChart }));

  const onVisiblityChange = useCallback(() => {
    if (!document.hidden) fetchChart();
  }, [fetchChart]);

  useEffect(() => {
    const doFetch = async () => {
      await fetchChart();
    };
    doFetch();
    document.addEventListener("visibilitychange", onVisiblityChange);
    return () => document.removeEventListener("visibilitychange", onVisiblityChange);
  }, [fetchChart, onVisiblityChange]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (evt: MediaQueryListEvent) => setIsDark(evt.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isLoading || !chartData) return <Loading />;
  return <BarChart series={series} isDark={isDark} />;
});

MonthlyChart.displayName = "MonthlyChart";

export default memo(MonthlyChart);
