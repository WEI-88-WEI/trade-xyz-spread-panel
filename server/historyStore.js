import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const HISTORY_HOURS = 24 * 30;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hourBucket(ts) {
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d.getTime();
}

export function loadHistory() {
  try {
    ensureDataDir();
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(history) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function updateHourlyHistory(history, snapshot) {
  const maxAgeMs = HISTORY_HOURS * 60 * 60 * 1000;
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
