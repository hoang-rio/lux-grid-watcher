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

const YearlyChart = forwardRef((_, ref: ForwardedRef<IFetchChart>) => {
  const { t } = useTranslation();
  const [state, setState] = useState({
    isLoading: true,
    chartData: [],
    isDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
  const isFetchingRef = useRef<boolean>(false);
  const series = useMemo(() => {
    const solarSeries: SeriesItem[] = [];
    const batteryChargedSeries: SeriesItem[] = [];
    const batterDischargedSeries: SeriesItem[] = [];
    const gridImportSeries: SeriesItem[] = [];
    const gridExportSeries: SeriesItem[] = [];
    const consumptionSeries: SeriesItem[] = [];

    state.chartData.forEach((item) => {
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
  }, [state.chartData, t]);

  const fetchChart = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    setState((prev) => ({ ...prev, isLoading: true }));
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/yearly-chart`
    );
    const json = await res.json();
    setState((prev) => ({ ...prev, chartData: json }));
    isFetchingRef.current = false;
    setState((prev) => ({ ...prev, isLoading: false }));
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
    const doFetchChart = async () => {
      await fetchChart();
    };
    doFetchChart();
    document.addEventListener("visibilitychange", onVisiblityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisiblityChange);
  }, [fetchChart, onVisiblityChange]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // This callback will fire if the perferred color scheme changes without a reload
    mq.addEventListener("change", (evt) => setState((prev) => ({ ...prev, isDark: evt.matches })));
  }, []);

  if (state.isLoading || !state.chartData) {
    return <Loading />;
  }
  return <BarChart series={series} isDark={state.isDark} />;
});

YearlyChart.displayName = "YearlyChart";

export default memo(YearlyChart);
