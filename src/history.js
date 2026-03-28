import { PANEL_CONFIG } from './config';

function hourBucket(ts) {
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d.getTime();
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(PANEL_CONFIG.historyStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(history) {
  localStorage.setItem(PANEL_CONFIG.historyStorageKey, JSON.stringify(history));
}

export function updateHourlyHistory(history, snapshot) {
  const maxAgeMs = PANEL_CONFIG.historyHours * 60 * 60 * 1000;
  const now = Date.now();
  const bucket = hourBucket(snapshot.ts);
  const value = snapshot?.spreads?.shortBrentLongCl;
  if (value == null) {
    return history.filter((item) => now - item.bucket <= maxAgeMs);
  }

  const next = [...history];
  const index = next.findIndex((item) => item.bucket === bucket);
  const candidate = {
    bucket,
    time: snapshot.ts,
    label: new Date(snapshot.ts).toISOString(),
    value,
  };

  if (index === -1) {
    next.push(candidate);
  } else if (value > next[index].value) {
    next[index] = candidate;
  }

  return next
    .filter((item) => now - item.bucket <= maxAgeMs)
    .sort((a, b) => a.bucket - b.bucket);
}
