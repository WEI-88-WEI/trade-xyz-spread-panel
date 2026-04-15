import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { fmtPrice, fmtTime } from './utils';

export default function MinuteTrendChart({ history, alertThreshold, minAlertThreshold }) {
  const data = useMemo(() => history
    .map((item) => {
      const spread = item?.brentBid != null && item?.clAsk != null ? item.brentBid - item.clAsk : null;
      if (spread == null) return null;
      return {
        ...item,
        spread,
      };
    })
    .filter(Boolean), [history]);

  const currentHourBucket = data.length ? new Date(data[data.length - 1].bucket).setUTCMinutes(0, 0, 0) : null;
  const currentHourRows = currentHourBucket == null ? [] : data.filter((item) => new Date(item.bucket).setUTCMinutes(0, 0, 0) === currentHourBucket);
  const recentHigh = data.length ? Math.max(...data.map((item) => item.spread)) : null;
  const recentLow = data.length ? Math.min(...data.map((item) => item.spread)) : null;
  const currentHourHigh = currentHourRows.length ? Math.max(...currentHourRows.map((item) => item.spread)) : null;
  const currentHourLow = currentHourRows.length ? Math.min(...currentHourRows.map((item) => item.spread)) : null;

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    animation: false,
    grid: {
      left: 24,
      right: 24,
      top: 32,
      bottom: 72,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      triggerOn: 'mousemove|click',
      confine: true,
      axisPointer: { type: 'cross', snap: true },
      backgroundColor: 'rgba(15,23,42,0.96)',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: '#e2e8f0' },
      formatter(params) {
        const row = params?.[0]?.data;
        if (!row) return '';
        return [
          `<div>${fmtTime(row.bucket)}</div>`,
          `<div style="margin-top:6px;color:#38bdf8;">主价差：${fmtPrice(row.spread)}</div>`,
          `<div>BRENTOIL bid / ask：${fmtPrice(row.brentBid)} / ${fmtPrice(row.brentAsk)}</div>`,
          `<div>CL bid / ask：${fmtPrice(row.clBid)} / ${fmtPrice(row.clAsk)}</div>`,
          `<div>该分钟 max / min：${fmtPrice(row.maxShortBrentLongCl)} / ${fmtPrice(row.minShortBrentLongCl)}</div>`,
        ].join('');
      },
    },
    legend: {
      top: 0,
      textStyle: { color: '#cbd5e1' },
      data: ['分钟主价差', '近3小时高点', '近3小时低点', '当前小时高点', '当前小时低点', '上穿阈值', '下穿阈值'],
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: {
        color: '#94a3b8',
        formatter(value) {
          return value.slice(11, 16);
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
        moveOnMouseMove: false,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 24,
        bottom: 16,
        borderColor: 'rgba(148,163,184,0.2)',
        fillerColor: 'rgba(56,189,248,0.24)',
        backgroundColor: 'rgba(15,23,42,0.78)',
        textStyle: { color: '#94a3b8' },
      },
    ],
    series: [
      {
        name: '分钟主价差',
        type: 'line',
        smooth: false,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: '#38bdf8' },
        lineStyle: { width: 2, color: '#38bdf8' },
        areaStyle: { color: 'rgba(56,189,248,0.10)' },
        data: data.map((item) => ({ value: item.spread, ...item })),
      },
      {
        name: '近3小时高点',
        type: 'line',
        symbol: 'none',
        lineStyle: { width: 1, type: 'dashed', color: '#22c55e' },
        data: data.map(() => recentHigh),
      },
      {
        name: '近3小时低点',
        type: 'line',
        symbol: 'none',
        lineStyle: { width: 1, type: 'dashed', color: '#f59e0b' },
        data: data.map(() => recentLow),
      },
      {
        name: '当前小时高点',
        type: 'line',
        symbol: 'none',
        lineStyle: { width: 1, type: 'dotted', color: '#4ade80' },
        data: data.map(() => currentHourHigh),
      },
      {
        name: '当前小时低点',
        type: 'line',
        symbol: 'none',
        lineStyle: { width: 1, type: 'dotted', color: '#fbbf24' },
        data: data.map(() => currentHourLow),
      },
      {
        name: '上穿阈值',
        type: 'line',
        symbol: 'none',
        lineStyle: { width: 1, type: 'dashed', color: '#ef4444' },
        data: data.map(() => alertThreshold),
      },
      {
        name: '下穿阈值',
        type: 'line',
        symbol: 'none',
        lineStyle: { width: 1, type: 'dashed', color: '#a855f7' },
        data: data.map(() => minAlertThreshold),
      },
    ],
  }), [data, recentHigh, recentLow, currentHourHigh, currentHourLow, alertThreshold, minAlertThreshold]);

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height: 360 }}
      notMerge={false}
      lazyUpdate={false}
    />
  );
}
