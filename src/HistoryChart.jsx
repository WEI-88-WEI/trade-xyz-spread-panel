import { useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { fmtPrice, fmtTime } from './utils';

export default function HistoryChart({ history, freezeWhileHover = false, onHoverChange }) {
  const chartRef = useRef(null);

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
      alwaysShowContent: !!freezeWhileHover,
      confine: true,
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
        start: data.length > 120 ? 100 - (120 / data.length) * 100 : 0,
        end: 100,
      },
      {
        type: 'slider',
        height: 22,
        bottom: 24,
        borderColor: 'rgba(148,163,184,0.2)',
        fillerColor: 'rgba(56,189,248,0.18)',
        backgroundColor: 'rgba(15,23,42,0.68)',
        textStyle: { color: '#94a3b8' },
        start: data.length > 120 ? 100 - (120 / data.length) * 100 : 0,
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
  }), [data, freezeWhileHover]);

  const onEvents = {
    mouseover: () => onHoverChange?.(true),
    globalout: () => onHoverChange?.(false),
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
