function defaultWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export const PANEL_CONFIG = {
  pollIntervalMs: Number(window.__PANEL_CONFIG__?.pollIntervalMs ?? 5000),
  historyHours: Number(window.__PANEL_CONFIG__?.historyHours ?? 24 * 30),
  historyStorageKey: window.__PANEL_CONFIG__?.historyStorageKey ?? 'hl-oil-spread-history-v1',
  wsUrl: window.__PANEL_CONFIG__?.wsUrl ?? defaultWsUrl(),
};

export const HL_API_URL = 'https://api.hyperliquid.xyz/info';
export const BRENT = 'xyz:BRENTOIL';
export const CL = 'xyz:CL';
