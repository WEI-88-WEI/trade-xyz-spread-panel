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

export function buildMinuteExtremeDistribution(history) {
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
    const minute = getMinuteOfHour(item?.bucket ?? item?.ts);
    if (minute == null) continue;

    const bucketIndex = Math.floor(minute / 5);
    if (item?.maxShortBrentLongCl != null) {
      maxBuckets[bucketIndex].count += 1;
    }
    if (item?.minShortBrentLongCl != null) {
      minBuckets[bucketIndex].count += 1;
    }
  }

  return {
    maxBuckets,
    minBuckets,
    maxTopBuckets: getTopBuckets(maxBuckets),
    minTopBuckets: getTopBuckets(minBuckets),
  };
}
