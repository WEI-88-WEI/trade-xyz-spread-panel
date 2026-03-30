import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

function fmtMinuteLabel(startMinute, endMinute) {
  return `${String(startMinute).padStart(2, '0')}-${String(endMinute).padStart(2, '0')}`;
}

export default function MinuteDistributionHeatmap({ distribution }) {
  const option = useMemo(() => {
    const maxBuckets = distribution?.maxBuckets ?? [];
    const minBuckets = distribution?.minBuckets ?? [];
    const xLabels = maxBuckets.map((item) => fmtMinuteLabel(item.startMinute, item.endMinute));
    const yLabels = ['小时最高价差', '小时最低价差'];

    const values = [
      ...maxBuckets.map((item, index) => [index, 0, item.count]),
      ...minBuckets.map((item, index) => [index, 1, item.count]),
    ];

    const maxCount = Math.max(0, ...values.map((item) => item[2]));

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: {
        left: 24,
        right: 80,
        top: 24,
        bottom: 36,
        containLabel: true,
      },
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(15,23,42,0.96)',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#e2e8f0' },
        formatter(params) {
          const timeRange = xLabels[params.data?.[0]] ?? '--';
          const kind = yLabels[params.data?.[1]] ?? '--';
          const count = params.data?.[2] ?? 0;
          return `${kind}<br/>时间段：${timeRange}<br/>出现次数：${count}`;
        },
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        splitArea: { show: false },
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8' },
      },
      visualMap: {
        min: 0,
        max: Math.max(1, maxCount),
        calculable: true,
        orient: 'vertical',
        right: 8,
        top: 'center',
        text: ['多', '少'],
        textStyle: { color: '#94a3b8' },
        inRange: {
          color: ['#0f172a', '#1d4ed8', '#22c55e', '#eab308'],
        },
      },
      series: [
        {
          name: '出现频次',
          type: 'heatmap',
          data: values,
          label: {
            show: true,
            color: '#e2e8f0',
            formatter(params) {
              return params.data?.[2] ?? 0;
            },
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }, [distribution]);

  return <ReactECharts option={option} style={{ width: '100%', height: 220 }} notMerge={false} lazyUpdate={false} />;
}
