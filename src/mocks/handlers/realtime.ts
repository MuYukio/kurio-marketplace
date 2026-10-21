import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import { subscribeMock } from '../services/events';
import { sessionUser } from '../services/domain';
const channel = ws.link('wss://kurio.mock/');
const closers = new Set<() => void>();
export function disconnectMock() {
  for (const close of closers) close();
}
export const realtimeHandler = channel.addEventListener('connection', (connection) => {
  const { client } = toSocketIo(connection);
  let token = '';
  client.on('authenticate', (_event, input: unknown) => {
    token = typeof input === 'string' ? input : '';
    client.emit('ready', { authenticated: !!sessionUser(token) });
  });
  const unsubscribe = subscribeMock((name, event) => {
    if (name === 'order.updated' && sessionUser(token)?.id !== event.userId) return;
    client.emit(name, event);
  });
  // The 0.2 binding implements the handshake; provide Engine.IO heartbeat here.
  const heartbeat = window.setInterval(() => connection.client.send('2'), 15000);
  const close = () => connection.client.close();
  closers.add(close);
  connection.client.addEventListener('close', () => {
    window.clearInterval(heartbeat);
    unsubscribe();
    closers.delete(close);
  });
});
