import { PANEL_CONFIG } from './config';

export function createPanelWebSocket({ onSnapshot, onStatus }) {
  let socket;
  let retryTimer;

  const connect = () => {
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
      onStatus?.('disconnected');
      retryTimer = setTimeout(connect, 3000);
    });

    socket.addEventListener('error', () => {
      onStatus?.('error');
      socket.close();
    });
  };

  connect();

  return () => {
    clearTimeout(retryTimer);
    if (socket && socket.readyState < 2) socket.close();
  };
}
