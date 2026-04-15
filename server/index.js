import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  loadHistory,
  loadMinuteHistory,
  saveHistory,
  saveMinuteHistory,
  updateHourlyHistory,
  updateMinuteHistory,
} from './historyStore.js';

const PORT = Number(process.env.PORT || 8787);
const HL_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const COINS = ['xyz:BRENTOIL', 'xyz:CL'];

const app = express();
app.get('/health', (_req, res) => {
  res.json({ ok: true, latest: state.latest });
});
app.get('/history', (_req, res) => {
  res.json({ ok: true, history: state.history });
});
app.get('/minute-history', (_req, res) => {
  res.json({ ok: true, history: state.minuteHistory });
});
app.listen(PORT, () => {
  console.log(`[server] health endpoint on http://localhost:${PORT}/health`);
});

const clientWss = new WebSocketServer({ port: PORT + 1 });
console.log(`[server] client websocket on ws://localhost:${PORT + 1}`);

const initialHistory = loadHistory();
const initialMinuteHistory = loadMinuteHistory();

const state = {
  books: {},
  mids: {},
  latest: null,
  history: initialHistory,
  minuteHistory: initialMinuteHistory,
  lastSavedHistorySignature: '',
  lastSavedMinuteHistorySignature: '',
};

state.lastSavedHistorySignature = getHistorySignature(state.history);
state.lastSavedMinuteHistorySignature = getMinuteHistorySignature(state.minuteHistory);

function topOfBook(book) {
  const bids = book?.levels?.[0] ?? [];
  const asks = book?.levels?.[1] ?? [];
  const bid = bids.length ? Number(bids[0].px) : null;
  const ask = asks.length ? Number(asks[0].px) : null;
  const mid = bid != null && ask != null ? (bid + ask) / 2 : null;
  return { bid, ask, mid, time: book?.time ?? Date.now(), spread: book?.spread ?? null };
}

function getHistorySignature(history) {
  const latest = history[history.length - 1];
  if (!latest) return 'empty';
  return [
    history.length,
    latest.bucket,
    latest.maxValue ?? latest.value ?? 'na',
    latest.minValue ?? latest.value ?? 'na',
    latest.maxTime ?? latest.time ?? 'na',
    latest.minTime ?? latest.time ?? 'na',
  ].join('|');
}

function getMinuteHistorySignature(history) {
  const latest = history[history.length - 1];
  if (!latest) return 'empty';
  return [
    history.length,
    latest.bucket,
    latest.brentBid ?? 'na',
    latest.brentAsk ?? 'na',
    latest.clBid ?? 'na',
    latest.clAsk ?? 'na',
    latest.maxShortBrentLongCl ?? 'na',
    latest.minShortBrentLongCl ?? 'na',
  ].join('|');
}

function buildSnapshot() {
  const brent = topOfBook(state.books['xyz:BRENTOIL']);
  const cl = topOfBook(state.books['xyz:CL']);
  if (brent.mid == null && Number.isFinite(state.mids['xyz:BRENTOIL'])) brent.mid = state.mids['xyz:BRENTOIL'];
  if (cl.mid == null && Number.isFinite(state.mids['xyz:CL'])) cl.mid = state.mids['xyz:CL'];

  const snapshot = {
    ts: Date.now(),
    source: 'ws',
    historyBucket: new Date().setUTCMinutes(0, 0, 0),
    brent,
    cl,
    spreads: {
      shortBrentLongCl: brent.bid != null && cl.ask != null ? brent.bid - cl.ask : null,
      longBrentShortCl: brent.ask != null && cl.bid != null ? brent.ask - cl.bid : null,
      midMid: brent.mid != null && cl.mid != null ? brent.mid - cl.mid : null,
    },
  };

  state.latest = snapshot;
  state.history = updateHourlyHistory(state.history, snapshot);
  state.minuteHistory = updateMinuteHistory(state.minuteHistory, snapshot);

  const nextHistorySignature = getHistorySignature(state.history);
  if (nextHistorySignature !== state.lastSavedHistorySignature) {
    saveHistory(state.history);
    state.lastSavedHistorySignature = nextHistorySignature;
  }

  const nextMinuteHistorySignature = getMinuteHistorySignature(state.minuteHistory);
  if (nextMinuteHistorySignature !== state.lastSavedMinuteHistorySignature) {
    saveMinuteHistory(state.minuteHistory);
    state.lastSavedMinuteHistorySignature = nextMinuteHistorySignature;
  }

  return snapshot;
}

function broadcast(payload) {
  const raw = JSON.stringify(payload);
  for (const client of clientWss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(raw);
  }
}

clientWss.on('connection', (socket) => {
  if (state.latest) {
    socket.send(JSON.stringify({ type: 'snapshot', data: state.latest }));
  }
});

function connectUpstream() {
  const ws = new WebSocket(HL_WS_URL);

  ws.on('open', () => {
    console.log('[server] connected to Hyperliquid ws');
    for (const coin of COINS) {
      ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'l2Book', coin } }));
    }
    ws.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids', dex: 'xyz' } }));
  });

  ws.on('message', (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      if (msg.channel === 'l2Book' && msg.data?.coin) {
        state.books[msg.data.coin] = msg.data;
        if (state.books['xyz:BRENTOIL'] && state.books['xyz:CL']) {
          broadcast({ type: 'snapshot', data: buildSnapshot() });
        }
      }
      if (msg.channel === 'allMids' && msg.data?.mids) {
        state.mids = Object.fromEntries(
          Object.entries(msg.data.mids).map(([k, v]) => [k, Number(v)])
        );
        if (state.books['xyz:BRENTOIL'] && state.books['xyz:CL']) {
          broadcast({ type: 'snapshot', data: buildSnapshot() });
        }
      }
    } catch (err) {
      console.error('[server] message parse failed', err);
    }
  });

  ws.on('close', () => {
    console.log('[server] upstream closed, reconnecting in 3s');
    setTimeout(connectUpstream, 3000);
  });

  ws.on('error', (err) => {
    console.error('[server] upstream error', err.message);
    ws.close();
  });
}

connectUpstream();
