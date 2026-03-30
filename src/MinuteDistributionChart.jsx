import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

function fmtMinuteLabel(startMinute, endMinute) {
  return `${String(startMinute).padStart(2, '0')}-${String(endMinute).padStart(2, '0')}`;
}

export default function MinuteDistributionChart({ distribution }) {
  const option = useMemo(() => {
    const maxBuckets = distribution?.maxBuckets ?? [];
    const minBuckets = distribution?.minBuckets ?? [];
    const labels = maxBuckets.map((item) => fmtMinuteLabel(item.startMinute, item.endMinute));

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        left: 24,
        right: 24,
        top: 34,
        bottom: 60,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        backgroundColor: 'rgba(15,23,42,0.96)',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#e2e8f0' },
        formatter(params) {
          const minute = params?.[0]?.axisValueLabel ?? '--';
          const maxCount = params?.[0]?.data ?? 0;
          const minCount = params?.[1]?.data ?? 0;
          return [
            `<div>分钟：${minute}</div>`,
            `<div style="margin-top:6px;color:#22c55e;">该分钟出现小时最高价差：${maxCount} 次</div>`,
            `<div style="color:#f59e0b;">该分钟出现小时最低价差：${minCount} 次</div>`,
          ].join('');
        },
      },
      legend: {
        top: 0,
        textStyle: { color: '#cbd5e1' },
        data: ['小时最高价差出现分钟', '小时最低价差出现分钟'],
      },
      xAxis: {
        type: 'category',
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: {
          color: '#94a3b8',
          interval: 4,
        },
        data: labels,
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
        axisLabel: {
          color: '#94a3b8',
          formatter(value) {
            return Number(value).toFixed(0);
          },
        },
      },
      series: [
        {
          name: '小时最高价差出现分钟',
          type: 'bar',
          barGap: '10%',
          itemStyle: { color: 'rgba(34,197,94,0.78)' },
          emphasis: { itemStyle: { color: '#22c55e' } },
          data: maxBuckets.map((item) => item.count),
        },
        {
          name: '小时最低价差出现分钟',
          type: 'bar',
          itemStyle: { color: 'rgba(245,158,11,0.72)' },
          emphasis: { itemStyle: { color: '#f59e0b' } },
          data: minBuckets.map((item) => item.count),
        },
      ],
    };
  }, [distribution]);

  return <ReactECharts option={option} style={{ width: '100%', height: 320 }} notMerge={false} lazyUpdate={false} />;
}
