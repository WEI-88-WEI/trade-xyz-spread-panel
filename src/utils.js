export function fmtPrice(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '--';
  return Number(value).toFixed(digits);
}

const DISPLAY_TIME_ZONE = 'Asia/Shanghai';

export function fmtTime(ts) {
  if (!ts) return '--';
  return new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  }) + ' 北京时间';
}

export function fmtHour(ts) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DISPLAY_TIME_ZONE,
  });
}
