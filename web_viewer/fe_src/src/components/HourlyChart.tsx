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

const BATTERY_SERIE_NAME = "Battery";

const HourlyChart = forwardRef(
  ({ className }: IClassNameProps, ref: ForwardedRef<IUpdateChart>) => {
    const [chartData, setChartData] = useState<never[][]>([]);
    const [isDark, setIsDark] = useState(false);
    const isFetchingRef = useRef<boolean>(false);
    const [isAutoUpdate, setIsAutoUpdate] = useState(true);

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
          name: BATTERY_SERIE_NAME,
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
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/hourly-chart`
      );
      const json = await res.json();
      setChartData(json);
      isFetchingRef.current = false;
    }, [setChartData]);

    useImperativeHandle(
      ref,
      (): IUpdateChart => ({
        updateItem(hourlyItem) {
          if (!isAutoUpdate) {
            return;
          }
          const lastItem = chartData[chartData.length - 1];
          if (JSON.stringify(lastItem) === JSON.stringify(hourlyItem)) {
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
       if (!document.hidden && isAutoUpdate) {
         fetchChart();
       }
    }, [fetchChart, isAutoUpdate]);

    useEffect(() => {
      fetchChart();
      document.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    }, [fetchChart, isAutoUpdate, onVisibilityChange]);

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
      <div className={`card hourly-chart ${className || ""}`}>
        <div className="row justify-space-between">
          <div className="hourly-chart-title">Hourly Chart</div>
          <div className="row hourly-chart-buttons">
            <button onClick={toggleAutoUpdate}>
              {!isAutoUpdate ? "Allow auto update" : "Pause auto update"}
            </button>
            <button disabled={!isAutoUpdate} onClick={() => fetchChart()}>
              Update
            </button>
          </div>
        </div>
        <div className="hourly-chart-content">
          <Chart
            type="line"
            series={series}
            options={{
              chart: {
                toolbar: {
                  show: false,
                },
                height: 300,
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
                labels: {
                  datetimeUTC: false,
                },
              },
              yaxis: [
                { seriesName: "PV", title: { text: "Power (W)" } },
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
              tooltip: {
                x: {
                  format: "HH:mm:ss",
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
                        if (batteryValue < 0) {
                          return `${seriesName} charge:`;
                        }
                        return `${seriesName} discharge:`;
                      }
                      return `${seriesName}:`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>
    );
  }
);

HourlyChart.displayName = "HourlyChart";

export default memo(HourlyChart);
