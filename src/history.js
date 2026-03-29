export async function fetchHistory() {
  const res = await fetch('/history');
  if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.history) ? data.history : [];
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
