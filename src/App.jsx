import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PANEL_CONFIG } from './config';
import { fetchHistory, getRecentAverageThreshold } from './history';
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
  const alertedRef = useRef(false);

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
        fetchHistory().then((rows) => setHistory(rows)).catch(() => {});
      },
    });

    return () => {
      stop();
    };
  }, []);

  useEffect(() => {
    fetchHistory()
      .then((next) => setHistory(next))
      .catch((err) => setError(err.message || '历史加载失败'));
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
  const alertThreshold = dynamicThreshold ?? 6;

  useEffect(() => {
    const spread = snapshot?.spreads?.shortBrentLongCl;
    if (spread == null) return;
    const crossed = spread > alertThreshold;
    if (crossed && !alertedRef.current) {
      alertedRef.current = true;
      if (alertEnabled) {
        new Notification('价差提醒', {
          body: `BRENTOIL 做空现价 - CL 做多现价 = ${spread.toFixed(3)}，已超过阈值 ${alertThreshold.toFixed(3)}`,
        });
      }
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = 880;
        gain.gain.value = 0.03;
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 250);
      } catch {}
    }
    if (!crossed) alertedRef.current = false;
  }, [snapshot, alertEnabled, alertThreshold]);
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
          <div>提醒阈值：{fmtPrice(alertThreshold)}（前3小时均值）</div>
          <div>历史窗口：{PANEL_CONFIG.historyHours} 小时</div>
          <div>最后更新：{fmtTime(snapshot?.ts)}</div>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <section className="grid grid-3">
        <StatCard
          title="BRENTOIL 做空现价 - CL 做多现价"
          value={fmtPrice(latest.shortBrentLongCl)}
          hint="= BRENTOIL bid - CL ask"
          highlight={latest.shortBrentLongCl > alertThreshold}
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
            <li>条件：BRENTOIL 的做空现价减去 CL 的做多现价 &gt; 最近 3 小时均值</li>
            <li>现价定义：做空现价取 bid，做多现价取 ask</li>
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
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="spreadFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="hour" minTickGap={24} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={["auto", "auto"]} padding={{ top: 12, bottom: 12 }} />
              <Tooltip
                formatter={(value, name) => [fmtPrice(value), name === 'maxValue' ? '小时最大价差' : '小时最小价差']}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.label ?? label}
              />
              <Area type="monotone" dataKey="maxValue" name="maxValue" stroke="#22c55e" fill="url(#spreadFill)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="minValue" name="minValue" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
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
