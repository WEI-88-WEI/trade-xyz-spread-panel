export async function fetchHistory() {
  const res = await fetch('/history');
  if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.history) ? data.history : [];
}

const DISPLAY_TIME_ZONE = 'Asia/Shanghai';

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

export function buildMinuteDistribution(history) {
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
    };
  }

  for (const item of history) {
    const maxMinute = getMinuteOfHour(item?.maxTime ?? item?.time);
    const minMinute = getMinuteOfHour(item?.minTime ?? item?.time);

    if (maxMinute != null) {
      maxBuckets[Math.floor(maxMinute / 5)].count += 1;
    }

    if (minMinute != null) {
      minBuckets[Math.floor(minMinute / 5)].count += 1;
    }
  }

  return {
    maxBuckets,
    minBuckets,
    maxTopBuckets: getTopBuckets(maxBuckets),
    minTopBuckets: getTopBuckets(minBuckets),
  };
}
