import { PANEL_CONFIG } from './config';

export function createPanelWebSocket({ onSnapshot, onStatus }) {
  let socket;
  let retryTimer;
  let stopped = false;

  const scheduleReconnect = () => {
    if (stopped || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, 3000);
  };

  const connect = () => {
    if (stopped) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    onStatus?.('connecting');
    socket = new WebSocket(PANEL_CONFIG.wsUrl);

    socket.addEventListener('open', () => {
      onStatus?.('connected');
    });

    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'snapshot') {
          onSnapshot?.(msg.data);
        }
      } catch (err) {
        console.error('ws parse failed', err);
      }
    });

    socket.addEventListener('close', () => {
      if (stopped) return;
      onStatus?.('disconnected');
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      if (stopped) return;
      onStatus?.('error');
    });
  };

  connect();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    retryTimer = null;
    if (socket && socket.readyState < 2) socket.close();
  };
}
