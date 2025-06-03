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
import "./HourlyChart.css";
import Chart from "react-apexcharts";
import { IClassNameProps, IUpdateChart, SeriesItem } from "../Intefaces";
import Loading from "./Loading";
import { useTranslation } from "react-i18next";
import React from "react";

const HourlyChart = forwardRef(
  ({ className }: IClassNameProps, ref: ForwardedRef<IUpdateChart>) => {
    const { t, i18n } = useTranslation();
    const SOLAR_PV_SERIE_NAME = t("chart.solarPV");
    const BATTERY_SERIE_NAME = t("chart.battery");
    const GRID_SERIE_NAME = t("chart.grid");

    const [chartData, setChartData] = useState<never[][]>([]);
    const [isDark, setIsDark] = useState(false);
    const isFetchingRef = useRef<boolean>(false);
    const [isAutoUpdate, setIsAutoUpdate] = useState(true);
    const [startOfDay, setStartOfDay] = useState(() => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return now;
    });
    // Use string for selectedDate to avoid timezone issues
    const [selectedDate, setSelectedDate] = useState(() => {
      const now = new Date();
      return now.toISOString().slice(0, 10);
    });
    const [isLoading, setIsLoading] = useState(false);

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
          name: SOLAR_PV_SERIE_NAME,
          data: pvSeries,
        },
        {
          name: BATTERY_SERIE_NAME,
          data: batterySeries,
        },
        {
          name: GRID_SERIE_NAME,
          data: gridSeries,
        },
        {
          name: i18n.t("chart.consumption"),
          data: consumptionSeries,
        },
        {
          name: i18n.t("chart.soc"),
          data: socSeries,
        },
      ];
    }, [
      BATTERY_SERIE_NAME,
      GRID_SERIE_NAME,
      SOLAR_PV_SERIE_NAME,
      chartData,
      i18n,
    ]);

    const fetchChart = useCallback(async (dateStr?: string) => {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      setIsLoading(true);
      const dStr = dateStr || selectedDate;
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/hourly-chart?date=${dStr}`
      );
      const json = await res.json();
      setChartData(json);
      setIsLoading(false);
      isFetchingRef.current = false;
    }, [selectedDate]);

    useImperativeHandle(
      ref,
      (): IUpdateChart => ({
        updateItem(hourlyItem) {
          if (!isAutoUpdate) {
            return;
          }
          const lastItem = chartData[chartData.length - 1];
          if (!lastItem || JSON.stringify(lastItem) === JSON.stringify(hourlyItem)) {
            return;
          }
          const newChartData = [...chartData];
          if (lastItem[0] === hourlyItem[0]) {
            newChartData.splice(chartData.length - 1, 1, hourlyItem);
          } else {
            newChartData.push(hourlyItem);
          }
          setChartData(newChartData);
        },
      })
    );

    const onVisibilityChange = useCallback(() => {
      if (!document.hidden) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today.getTime() !== startOfDay.getTime()) {
          setStartOfDay(today);
        }
        if (isAutoUpdate) {
          fetchChart();
        }
      }
    }, [isAutoUpdate, fetchChart, startOfDay]);

    useEffect(() => {
      fetchChart(selectedDate);
      document.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }, [fetchChart, onVisibilityChange, selectedDate]);

    useEffect(() => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");

      if (mq.matches) {
        setIsDark(true);
      }

      // This callback will fire if the perferred color scheme changes without a reload
      mq.addEventListener("change", (evt) => setIsDark(evt.matches));
    }, []);

    const toggleAutoUpdate = useCallback(() => {
      if (!isAutoUpdate) {
        fetchChart();
      }
      setIsAutoUpdate(!isAutoUpdate);
    }, [isAutoUpdate, fetchChart]);

    return (
      <div className={`card hourly-chart col ${className || ""}`}>
        <div className="row justify-space-between">
          <div className="hourly-chart-title">{t("hourlyChart.title")}</div>
          <div className="row hourly-chart-buttons">
            <input
              type="date"
              value={selectedDate}
              min={(() => {
                const minDate = new Date();
                minDate.setDate(minDate.getDate() - 29);
                return minDate.toISOString().slice(0, 10);
              })()}
              max={(() => {
                const maxDate = new Date();
                return maxDate.toISOString().slice(0, 10);
              })()}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setStartOfDay(new Date(e.target.value + "T00:00:00"));
                fetchChart(e.target.value);
              }}
              style={{ marginRight: 10 }}
            />
            <button onClick={toggleAutoUpdate}>
              {!isAutoUpdate ? t("allowAutoUpdate") : t("pauseAutoUpdate")}
            </button>
            <button
              disabled={!isAutoUpdate}
              onClick={() => fetchChart(selectedDate)}
            >
              {t("updateChart")}
            </button>
          </div>
        </div>
        <div className="hourly-chart-content col flex-1">
          {isLoading ? (
            <Loading />
          ) : chartData.length ? (
            <Chart
              type="line"
              height={400}
              series={series}
              options={{
                chart: {
                  toolbar: {
                    show: false,
                  },
                  zoom: {
                    enabled: false,
                  },
                },
                legend: {
                  show: true,
                  position: "top",
                  horizontalAlign: "right",
                  clusterGroupedSeries: false,
                },
                colors: [
                  "rgb(112, 173, 70)",
                  "rgb(90, 155, 213)",
                  "rgb(246, 104, 103)",
                  "rgb(255, 164, 97)",
                  "rgb(128, 0, 128)",
                ],
                stroke: {
                  width: 3,
                },
                theme: {
                  mode: isDark ? "dark" : "light",
                },
                xaxis: {
                  type: "datetime",
                  min: startOfDay.getTime(),
                  labels: {
                    datetimeUTC: false,
                    format: "HH:mm",
                  },
                },
                yaxis: [
                  {
                    seriesName: SOLAR_PV_SERIE_NAME,
                    title: { text: t("chart.power") },
                  },
                  { seriesName: SOLAR_PV_SERIE_NAME, show: false },
                  { seriesName: SOLAR_PV_SERIE_NAME, show: false },
                  { seriesName: SOLAR_PV_SERIE_NAME, show: false },
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
                tooltip: {
                  x: {
                    format: "HH:mm",
                  },
                  y: {
                    formatter(val, opts) {
                      if (opts.seriesIndex === 4) {
                        return `${val}%`;
                      }
                      return `${Math.abs(val)} W`;
                    },
                    title: {
                      formatter(seriesName, opts) {
                        if (seriesName === BATTERY_SERIE_NAME) {
                          const batteryValue =
                            opts.series[1][opts.dataPointIndex];
                          if (batteryValue === 0) {
                            return `${seriesName}:`;
                          }
                          if (batteryValue < 0) {
                            return i18n.t("chart.batteryCharging", {
                              seriesName,
                            });
                          }
                          return i18n.t("chart.batteryDischarging", {
                            seriesName,
                          });
                        }
                        if (seriesName === GRID_SERIE_NAME) {
                          const gridValue = opts.series[2][opts.dataPointIndex];
                          if (gridValue === 0) {
                            return `${seriesName}:`;
                          }
                          if (gridValue < 0) {
                            return `${i18n.t("chart.importGridPower")}:`;
                          }
                          return `${i18n.t("chart.exportGridPower")}:`;
                        }
                        return `${seriesName}:`;
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <div className="col flex-1 justify-center align-center">
              {t("hourlyChart.noData")}
            </div>
          )}
        </div>
      </div>
    );
  }
);

HourlyChart.displayName = "HourlyChart";

export default memo(HourlyChart);
