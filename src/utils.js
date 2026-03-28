export function fmtPrice(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '--';
  return Number(value).toFixed(digits);
}

export function fmtTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    timeZone: 'UTC',
  }) + ' UTC';
}

export function fmtHour(ts) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}
