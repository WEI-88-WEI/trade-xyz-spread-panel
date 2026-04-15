import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

function SummaryList({ title, items, tone }) {
  return (
    <div className="distribution-summary-block">
      <div className={`distribution-summary-title ${tone}`}>{title}</div>
      <ol className="distribution-summary-list">
        {items.map((item, index) => (
          <li key={`${title}-${item.label}-${index}`}>
            <span className="distribution-summary-rank">Top {index + 1}</span>
            <span className="distribution-summary-label">{item.label} 分钟段</span>
            <span className="distribution-summary-count">{item.count} 次突破</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function MinuteExtremesSummary({ distribution }) {
  const option = useMemo(() => {
    const maxBuckets = distribution?.maxBuckets ?? [];
    const minBuckets = distribution?.minBuckets ?? [];

    return {
      backgroundColor: 'transparent',
      animation: false,
      grid: [
        { left: 72, right: 20, top: 8, height: 104 },
        { left: 72, right: 20, top: 136, height: 104 },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15,23,42,0.96)',
        borderColor: 'rgba(148,163,184,0.2)',
        textStyle: { color: '#e2e8f0' },
      },
      xAxis: [
        {
          type: 'value',
          minInterval: 1,
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
          axisLabel: { color: '#94a3b8' },
          gridIndex: 0,
        },
        {
          type: 'value',
          minInterval: 1,
          axisLine: { lineStyle: { color: '#475569' } },
          splitLine: { lineStyle: { color: 'rgba(148,163,184,0.12)' } },
          axisLabel: { color: '#94a3b8' },
          gridIndex: 1,
        },
      ],
      yAxis: [
        {
          type: 'category',
          inverse: true,
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94a3b8' },
          data: maxBuckets.map((item) => item.label),
          gridIndex: 0,
        },
        {
          type: 'category',
          inverse: true,
          axisLine: { lineStyle: { color: '#475569' } },
          axisLabel: { color: '#94a3b8' },
          data: minBuckets.map((item) => item.label),
          gridIndex: 1,
        },
      ],
      series: [
        {
          name: '分钟级向上突破分布',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: { color: 'rgba(56,189,248,0.82)' },
          label: { show: true, position: 'right', color: '#e2e8f0' },
          data: maxBuckets.map((item) => item.count),
        },
        {
          name: '分钟级向下突破分布',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          itemStyle: { color: 'rgba(168,85,247,0.82)' },
          label: { show: true, position: 'right', color: '#e2e8f0' },
          data: minBuckets.map((item) => item.count),
        },
      ],
    };
  }, [distribution]);

  const maxTopBuckets = distribution?.maxTopBuckets ?? [];
  const minTopBuckets = distribution?.minTopBuckets ?? [];
  const lookbackMinutes = distribution?.lookbackMinutes ?? 60;
  const maxEventCount = distribution?.maxEventCount ?? 0;
  const minEventCount = distribution?.minEventCount ?? 0;

  return (
    <div className="distribution-summary-layout distribution-summary-layout-3col">
      <SummaryList title={`分钟级向上突破最常出现时间段（近 ${lookbackMinutes} 分钟窗口）`} items={maxTopBuckets} tone="tone-green" />
      <SummaryList title={`分钟级向下突破最常出现时间段（近 ${lookbackMinutes} 分钟窗口）`} items={minTopBuckets} tone="tone-amber" />
      <div className="distribution-summary-chart">
        <ReactECharts option={option} style={{ width: '100%', height: 248 }} notMerge={false} lazyUpdate={false} />
        <div className="distribution-summary-meta">
          <span>向上突破：{maxEventCount} 次</span>
          <span>向下突破：{minEventCount} 次</span>
        </div>
      </div>
    </div>
  );
}
