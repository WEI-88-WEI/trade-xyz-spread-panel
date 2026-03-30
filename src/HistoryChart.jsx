import { useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { fmtPrice, fmtTime } from './utils';

export default function HistoryChart({ history }) {
  const chartRef = useRef(null);
  const hoveredIndexRef = useRef(null);

  const data = useMemo(
    () => history.map((item) => ({
      bucket: item.bucket,
      label: item.label,
      maxTime: item.maxTime ?? item.time,
      minTime: item.minTime ?? item.time,
      maxValue: item.maxValue ?? item.value,
      minValue: item.minValue ?? item.value,
    })),
    [history]
  );

  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance?.();
    if (!chart) return;
    if (hoveredIndexRef.current == null) return;
    if (hoveredIndexRef.current >= data.length) return;

    chart.dispatchAction({
      type: 'showTip',
      seriesIndex: 0,
      dataIndex: hoveredIndexRef.current,
    });
  }, [data]);

  const zoomStart = data.length > 120 ? Math.max(0, 100 - (120 / data.length) * 100) : 0;

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    grid: {
      left: 24,
      right: 24,
      top: 24,
      bottom: 88,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      triggerOn: 'mousemove|click',
      enterable: true,
      confine: true,
      axisPointer: {
        type: 'cross',
        snap: true,
      },
      backgroundColor: 'rgba(15,23,42,0.96)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: '#e2e8f0' },
      formatter(params) {
        const row = params?.[0]?.data;
        if (!row) return '';
        return [
          `<div>${fmtTime(row.bucket)}</div>`,
          `<div style="margin-top:6px;color:#22c55e;">最大值：${fmtPrice(row.maxValue)} (${fmtTime(row.maxTime)})</div>`,
          `<div style="color:#f59e0b;">最小值：${fmtPrice(row.minValue)} (${fmtTime(row.minTime)})</div>`,
        ].join('');
      },
    },
    legend: {
      top: 0,
      textStyle: { color: '#cbd5e1' },
      data: ['小时最大价差', '小时最小价差'],
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#94a3b8',
        formatter(value) {
          return value.slice(5, 16);
        },
      },
      data: data.map((item) => fmtTime(item.bucket)),
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#475569' } },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
      axisLabel: {
        color: '#94a3b8',
        formatter(value) {
          return Number(value).toFixed(2);
        },
      },
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: false,
        start: zoomStart,
        end: 100,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 22,
        bottom: 24,
        borderColor: 'rgba(148,163,184,0.2)',
        fillerColor: 'rgba(56,189,248,0.18)',
        backgroundColor: 'rgba(15,23,42,0.68)',
        textStyle: { color: '#94a3b8' },
        start: zoomStart,
        end: 100,
      },
    ],
    series: [
      {
        name: '小时最大价差',
        type: 'line',
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#22c55e' },
        lineStyle: { width: 2, color: '#22c55e' },
        areaStyle: { color: 'rgba(34,197,94,0.10)' },
        emphasis: { focus: 'series' },
        data: data.map((item) => ({ value: item.maxValue, ...item })),
      },
      {
        name: '小时最小价差',
        type: 'line',
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#f59e0b' },
        lineStyle: { width: 2, color: '#f59e0b' },
        emphasis: { focus: 'series' },
        data: data.map((item) => ({ value: item.minValue, ...item })),
      },
    ],
  }), [data, zoomStart]);

  const onEvents = {
    updateAxisPointer: (event) => {
      const axisInfo = event?.axesInfo?.[0];
      if (axisInfo?.value != null) {
        hoveredIndexRef.current = axisInfo.value;
      }
    },
    globalout: () => {
      hoveredIndexRef.current = null;
    },
  };

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ width: '100%', height: 360 }}
      notMerge={false}
      lazyUpdate={false}
      onEvents={onEvents}
    />
  );
}
