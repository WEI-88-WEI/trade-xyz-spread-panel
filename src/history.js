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
    maxTime: snapshot.ts,
    minTime: snapshot.ts,
    label: new Date(snapshot.ts).toISOString(),
    maxValue: value,
    minValue: value,
    value,
    time: snapshot.ts,
  };

  if (index === -1) {
    next.push(candidate);
  } else {
    const current = next[index];
    const updated = { ...current };

    if (updated.maxValue == null || value > updated.maxValue) {
      updated.maxValue = value;
      updated.time = snapshot.ts;
      updated.maxTime = snapshot.ts;
      updated.value = value;
    }

    if (updated.minValue == null || value < updated.minValue) {
      updated.minValue = value;
      updated.minTime = snapshot.ts;
    }

    next[index] = updated;
  }

  return next
    .filter((item) => now - item.bucket <= maxAgeMs)
    .sort((a, b) => a.bucket - b.bucket);
}

export function getRecentAverageThreshold(history, hours = 3) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const recent = [...history]
    .filter((item) => item?.maxValue != null || item?.value != null)
    .sort((a, b) => b.bucket - a.bucket)
    .slice(0, hours);

  if (recent.length === 0) return null;
  const sum = recent.reduce((acc, item) => acc + Number(item.maxValue ?? item.value), 0);
  return sum / recent.length;
}
