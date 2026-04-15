import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const MINUTE_HISTORY_FILE = path.join(DATA_DIR, 'minute-history.json');
const HISTORY_HOURS = 24 * 30;
const MINUTE_HISTORY_HOURS = 3;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hourBucket(ts) {
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d.getTime();
}

function minuteBucket(ts) {
  const d = new Date(ts);
  d.setUTCSeconds(0, 0);
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

export function loadMinuteHistory() {
  try {
    ensureDataDir();
    if (!fs.existsSync(MINUTE_HISTORY_FILE)) return [];
    const raw = fs.readFileSync(MINUTE_HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMinuteHistory(history) {
  ensureDataDir();
  fs.writeFileSync(MINUTE_HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function updateMinuteHistory(history, snapshot) {
  const maxAgeMs = MINUTE_HISTORY_HOURS * 60 * 60 * 1000;
  const now = Date.now();
  const bucket = minuteBucket(snapshot.ts);
  const brentBid = snapshot?.brent?.bid ?? null;
  const brentAsk = snapshot?.brent?.ask ?? null;
  const clBid = snapshot?.cl?.bid ?? null;
  const clAsk = snapshot?.cl?.ask ?? null;
  const shortSpread = snapshot?.spreads?.shortBrentLongCl ?? null;

  const filtered = Array.isArray(history) ? history.filter((item) => now - item.bucket <= maxAgeMs) : [];

  if (brentBid == null && brentAsk == null && clBid == null && clAsk == null && shortSpread == null) {
    return filtered;
  }

  const next = [...filtered];
  const index = next.findIndex((item) => item.bucket === bucket);
  const candidate = {
    bucket,
    ts: snapshot.ts,
    brentBid,
    brentAsk,
    clBid,
    clAsk,
    maxShortBrentLongCl: shortSpread,
    minShortBrentLongCl: shortSpread,
  };

  if (index === -1) {
    next.push(candidate);
  } else {
    const current = next[index];
    const updated = {
      ...current,
      ts: snapshot.ts,
      brentBid,
      brentAsk,
      clBid,
      clAsk,
    };

    if (shortSpread != null) {
      if (updated.maxShortBrentLongCl == null || shortSpread > updated.maxShortBrentLongCl) {
        updated.maxShortBrentLongCl = shortSpread;
      }
      if (updated.minShortBrentLongCl == null || shortSpread < updated.minShortBrentLongCl) {
        updated.minShortBrentLongCl = shortSpread;
      }
    }

    next[index] = updated;
  }

  return next
    .filter((item) => now - item.bucket <= maxAgeMs)
    .sort((a, b) => a.bucket - b.bucket);
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
