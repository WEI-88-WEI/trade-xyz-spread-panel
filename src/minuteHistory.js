const DISPLAY_TIME_ZONE = 'Asia/Shanghai';

export async function fetchMinuteHistory() {
  const res = await fetch('/minute-history');
  if (!res.ok) throw new Error(`minute history fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.history) ? data.history : [];
}

function getMinuteOfHour(ts) {
  if (!ts) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    minute: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }).formatToParts(new Date(ts));
  const minutePart = parts.find((part) => part.type === 'minute')?.value;
  const minute = Number(minutePart);
  return Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : null;
}

function fmtBucketLabel(startMinute, endMinute) {
  return `${String(startMinute).padStart(2, '0')}-${String(endMinute).padStart(2, '0')}`;
}

function getTopBuckets(buckets, topN = 3) {
  return [...buckets]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.index - b.index;
    })
    .slice(0, topN)
    .map((item) => ({
      ...item,
      label: fmtBucketLabel(item.startMinute, item.endMinute),
    }));
}

export function buildMinuteExtremeDistribution(history, lookbackMinutes = 60) {
  const maxBuckets = Array.from({ length: 12 }, (_, index) => ({
    index,
    startMinute: index * 5,
    endMinute: index * 5 + 4,
    count: 0,
    label: fmtBucketLabel(index * 5, index * 5 + 4),
  }));
  const minBuckets = Array.from({ length: 12 }, (_, index) => ({
    index,
    startMinute: index * 5,
    endMinute: index * 5 + 4,
    count: 0,
    label: fmtBucketLabel(index * 5, index * 5 + 4),
  }));

  if (!Array.isArray(history) || history.length === 0) {
    return {
      maxBuckets,
      minBuckets,
      maxTopBuckets: getTopBuckets(maxBuckets),
      minTopBuckets: getTopBuckets(minBuckets),
      maxEventCount: 0,
      minEventCount: 0,
      lookbackMinutes,
    };
  }

  const sorted = [...history]
    .filter((item) => item?.bucket != null)
    .sort((a, b) => a.bucket - b.bucket);

  let maxEventCount = 0;
  let minEventCount = 0;

  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i];
    const minute = getMinuteOfHour(item?.bucket ?? item?.ts);
    if (minute == null) continue;

    const currentMax = item?.maxShortBrentLongCl;
    const currentMin = item?.minShortBrentLongCl;

    const windowStart = item.bucket - lookbackMinutes * 60 * 1000;
    const prior = sorted.slice(0, i).filter((row) => row.bucket >= windowStart);

    const priorHigh = prior.reduce((acc, row) => {
      const value = row?.maxShortBrentLongCl;
      return value != null && (acc == null || value > acc) ? value : acc;
    }, null);

    const priorLow = prior.reduce((acc, row) => {
      const value = row?.minShortBrentLongCl;
      return value != null && (acc == null || value < acc) ? value : acc;
    }, null);

    const bucketIndex = Math.floor(minute / 5);

    if (currentMax != null && priorHigh != null && currentMax > priorHigh) {
      maxBuckets[bucketIndex].count += 1;
      maxEventCount += 1;
    }

    if (currentMin != null && priorLow != null && currentMin < priorLow) {
      minBuckets[bucketIndex].count += 1;
      minEventCount += 1;
    }
  }

  return {
    maxBuckets,
    minBuckets,
    maxTopBuckets: getTopBuckets(maxBuckets),
    minTopBuckets: getTopBuckets(minBuckets),
    maxEventCount,
    minEventCount,
    lookbackMinutes,
  };
}
