import { useEffect, useMemo, useRef, useState } from 'react';
import { PANEL_CONFIG } from './config';
import HistoryChart from './HistoryChart';
import MinuteDistributionSummary from './MinuteDistributionSummary';
import { buildMinuteDistribution, fetchHistory, getRecentAverageMinThreshold, getRecentAverageThreshold } from './history';
import { fmtHour, fmtPrice, fmtTime } from './utils';
import { createPanelWebSocket } from './ws';

const emptySnapshot = null;

function StatCard({ title, value, hint, highlight = false }) {
  return (
    <div className={`card stat-card ${highlight ? 'highlight' : ''}`}>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const upperAlertedRef = useRef(false);
  const lowerAlertedRef = useRef(false);
  const upperAlertCooldownUntilRef = useRef(0);
  const lowerAlertCooldownUntilRef = useRef(0);
  const alertBurstTimeoutsRef = useRef([]);
  const alertBurstActiveRef = useRef(false);
  const audioContextRef = useRef(null);
  const historySignatureRef = useRef('');

  useEffect(() => {
    const enableAlerting = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      setAlertEnabled('Notification' in window && Notification.permission === 'granted');
    };
    enableAlerting();
  }, []);

  useEffect(() => {
    const maybeRefreshHistory = (nextSnapshot) => {
      const nextBucket = nextSnapshot?.historyBucket ?? (nextSnapshot?.ts ? new Date(nextSnapshot.ts).setUTCMinutes(0, 0, 0) : null);
      const currentBucket = history.length ? history[history.length - 1]?.bucket ?? null : null;

      if (nextBucket == null || nextBucket === currentBucket) {
        return;
      }

      fetchHistory()
        .then((rows) => {
          const latest = rows[rows.length - 1];
          const signature = latest
            ? [latest.bucket, latest.maxValue ?? latest.value, latest.minValue ?? latest.value, latest.maxTime ?? latest.time, latest.minTime ?? latest.time].join('|')
            : 'empty';
          if (signature !== historySignatureRef.current) {
            historySignatureRef.current = signature;
            setHistory(rows);
          }
        })
        .catch(() => {});
    };

    const stop = createPanelWebSocket({
      onStatus: (status) => {
        setWsStatus(status);
        if (status === 'connected') setError('');
        if (status === 'error' || status === 'disconnected') {
          setError('WebSocket 已断开，正在重连…');
        }
      },
      onSnapshot: (next) => {
        setSnapshot(next);
        setError('');
        maybeRefreshHistory(next);
      },
    });

    maybeRefreshHistory();

    return () => {
      stop();
    };
  }, []);

  useEffect(() => {
    fetchHistory()
      .then((next) => {
        const latest = next[next.length - 1];
        historySignatureRef.current = latest
          ? [latest.bucket, latest.maxValue ?? latest.value, latest.minValue ?? latest.value, latest.maxTime ?? latest.time, latest.minTime ?? latest.time].join('|')
          : 'empty';
        setHistory(next);
      })
      .catch((err) => setError(err.message || '历史加载失败'));
  }, []);

  useEffect(() => {
    return () => {
      alertBurstTimeoutsRef.current.forEach((id) => clearTimeout(id));
      alertBurstTimeoutsRef.current = [];
      alertBurstActiveRef.current = false;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    };
  }, []);

  const chartData = useMemo(
    () => history.map((item) => ({
      ...item,
      hour: fmtHour(item.bucket),
      maxValue: item.maxValue ?? item.value,
      minValue: item.minValue ?? item.value,
    })),
    [history]
  );

  const dynamicThreshold = useMemo(() => getRecentAverageThreshold(history, 3), [history]);
  const dynamicMinThreshold = useMemo(() => getRecentAverageMinThreshold(history, 3), [history]);
  const minuteDistribution = useMemo(() => buildMinuteDistribution(history), [history]);
  const alertThreshold = dynamicThreshold ?? 6;
  const minAlertThreshold = dynamicMinThreshold ?? 6;

  useEffect(() => {
    const spread = snapshot?.spreads?.shortBrentLongCl;
    if (spread == null) return;

    const crossedUpper = spread > alertThreshold;
    const crossedLower = spread < minAlertThreshold;

    const playBeepBurst = async () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        alertBurstTimeoutsRef.current.forEach((id) => clearTimeout(id));
        alertBurstTimeoutsRef.current = [];
        alertBurstActiveRef.current = true;

        const baseTime = ctx.currentTime + 0.02;
        for (let i = 0; i < 6; i += 1) {
          const startAt = baseTime + i * 1.0;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(0.03, startAt + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
          osc.start(startAt);
          osc.stop(startAt + 0.26);
        }

        const timeoutId = setTimeout(() => {
          alertBurstTimeoutsRef.current = [];
          alertBurstActiveRef.current = false;
        }, 5500);
        alertBurstTimeoutsRef.current.push(timeoutId);
      } catch (err) {
        console.error('beep burst failed', err);
        alertBurstActiveRef.current = false;
      }
    };

    if (crossedUpper && !upperAlertedRef.current && Date.now() >= upperAlertCooldownUntilRef.current) {
      upperAlertedRef.current = true;
      upperAlertCooldownUntilRef.current = Date.now() + 10_000;

      if (alertEnabled) {
        new Notification('价差上穿提醒', {
          body: `BRENTOIL 做空现价 - CL 做多现价 = ${spread.toFixed(3)}，已超过最近 3 小时最大价差均值阈值 ${alertThreshold.toFixed(3)}`,
        });
      }

      if (!alertBurstActiveRef.current) {
        playBeepBurst();
      }
    }

    if (crossedLower && !lowerAlertedRef.current && Date.now() >= lowerAlertCooldownUntilRef.current) {
      lowerAlertedRef.current = true;
      lowerAlertCooldownUntilRef.current = Date.now() + 10_000;

      if (alertEnabled) {
        new Notification('价差下穿提醒', {
          body: `BRENTOIL 做空现价 - CL 做多现价 = ${spread.toFixed(3)}，已低于最近 3 小时最小价差均值阈值 ${minAlertThreshold.toFixed(3)}`,
        });
      }

      if (!alertBurstActiveRef.current) {
        playBeepBurst();
      }
    }

    if (!crossedUpper) {
      upperAlertedRef.current = false;
    }

    if (!crossedLower) {
      lowerAlertedRef.current = false;
    }
  }, [snapshot, alertEnabled, alertThreshold, minAlertThreshold]);
  const latest = snapshot?.spreads ?? {};
  const wsBadge = wsStatus === 'connected' ? 'WS 实时' : wsStatus === 'connecting' ? 'WS 连接中' : 'WS 重连中';

  return (
    <div className="page">
      <header className="hero card">
        <div>
          <div className="eyebrow">Hyperliquid xyz 面板</div>
          <h1>BRENTOIL / CL 价差监控</h1>
          <p>
            仅通过后端 WebSocket 实时推送，并由服务端持续按小时记录近一个月内「该小时出现过的最大价差 / 最小价差」。
          </p>
        </div>
        <div className="hero-meta">
          <div>模式：{wsBadge}</div>
          <div>上穿阈值：{fmtPrice(alertThreshold)}（最近 3 小时最大价差均值）</div>
          <div>下穿阈值：{fmtPrice(minAlertThreshold)}（最近 3 小时最小价差均值）</div>
          <div>历史窗口：{PANEL_CONFIG.historyHours} 小时</div>
          <div>最后更新：{fmtTime(snapshot?.ts)}</div>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="grid grid-3">
        <StatCard
          title="BRENTOIL 做空现价 - CL 做多现价"
          value={fmtPrice(latest.shortBrentLongCl)}
          hint={`= BRENTOIL bid - CL ask｜上穿>${fmtPrice(alertThreshold)} / 下穿<${fmtPrice(minAlertThreshold)}`}
          highlight={latest.shortBrentLongCl > alertThreshold || latest.shortBrentLongCl < minAlertThreshold}
        />
        <StatCard
          title="BRENTOIL 做多现价 - CL 做空现价"
          value={fmtPrice(latest.longBrentShortCl)}
          hint="= BRENTOIL ask - CL bid"
        />
        <StatCard
          title="Mid - Mid 价差"
          value={fmtPrice(latest.midMid)}
          hint="= BRENTOIL mid - CL mid"
        />
      </section>

      <section className="grid grid-2">
        <div className="card">
          <h2>盘口</h2>
          <div className="book-grid">
            <div>
              <div className="subtle">BRENTOIL</div>
              <div>Bid: {fmtPrice(snapshot?.brent?.bid)}</div>
              <div>Ask: {fmtPrice(snapshot?.brent?.ask)}</div>
              <div>Mid: {fmtPrice(snapshot?.brent?.mid)}</div>
            </div>
            <div>
              <div className="subtle">CL</div>
              <div>Bid: {fmtPrice(snapshot?.cl?.bid)}</div>
              <div>Ask: {fmtPrice(snapshot?.cl?.ask)}</div>
              <div>Mid: {fmtPrice(snapshot?.cl?.mid)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>提醒逻辑</h2>
          <ul className="list">
            <li>上穿提醒：BRENTOIL 的做空现价减去 CL 的做多现价 &gt; 最近 3 个小时桶最大价差均值</li>
            <li>下穿提醒：BRENTOIL 的做空现价减去 CL 的做多现价 &lt; 最近 3 个小时桶最小价差均值</li>
            <li>现价定义：做空现价取 bid，做多现价取 ask</li>
            <li>上下穿都采用一次触发 + 10 秒冷却；回到阈值另一侧后重新复位</li>
            <li>仅使用 WebSocket；若连接中断，页面会持续自动重连</li>
          </ul>
        </div>
      </section>

      <section className="card chart-card">
        <div className="chart-head">
          <h2>近一个月小时级最大 / 最小价差</h2>
          <span>记录维度：每小时保留该小时出现过的最大 / 最小「BRENTOIL bid - CL ask」</span>
          <span>当前已记录 {history.length} 个小时桶</span>
        </div>
        <div className="chart-wrap chart-wrap-echarts">
          <HistoryChart history={chartData} />
        </div>
      </section>

      <section className="card chart-card">
        <div className="chart-head">
          <h2>小时极值时间段总结</h2>
          <span>直接看 Top3 时间段，并用横向条形图比较 12 个 5 分钟段的出现次数</span>
          <span>样本数：{history.length} 个小时桶</span>
        </div>
        <MinuteDistributionSummary distribution={minuteDistribution} />
      </section>

      <section className="card">
        <h2>小时记录</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>小时桶 (北京时间)</th>
                <th>该小时最大价差出现时刻</th>
                <th>最大值</th>
                <th>该小时最小价差出现时刻</th>
                <th>最小值</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-row">暂无历史记录</td>
                </tr>
              ) : (
                [...history].reverse().slice(0, 48).map((item) => (
                  <tr key={item.bucket}>
                    <td>{fmtHour(item.bucket)}</td>
                    <td>{fmtTime(item.maxTime ?? item.time)}</td>
                    <td>{fmtPrice(item.maxValue ?? item.value)}</td>
                    <td>{fmtTime(item.minTime ?? item.time)}</td>
                    <td>{fmtPrice(item.minValue ?? item.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
