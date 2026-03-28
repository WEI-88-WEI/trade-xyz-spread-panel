export const PANEL_CONFIG = {
  alertThreshold: Number(window.__PANEL_CONFIG__?.alertThreshold ?? 6),
  pollIntervalMs: Number(window.__PANEL_CONFIG__?.pollIntervalMs ?? 5000),
  historyHours: Number(window.__PANEL_CONFIG__?.historyHours ?? 24 * 30),
  historyStorageKey: window.__PANEL_CONFIG__?.historyStorageKey ?? 'hl-oil-spread-history-v1',
};

export const HL_API_URL = 'https://api.hyperliquid.xyz/info';
export const BRENT = 'xyz:BRENTOIL';
export const CL = 'xyz:CL';
