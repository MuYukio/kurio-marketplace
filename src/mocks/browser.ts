import { setupWorker } from 'msw/browser';
import { restHandler } from './handlers/rest';
import { realtimeHandler } from './handlers/realtime';
import { initializeDb } from './db/store';
import { settleOrders } from './services/domain';
export async function startMocks() {
  const worker = setupWorker(restHandler, realtimeHandler);
  await Promise.all([
    initializeDb(),
    worker.start({ onUnhandledRequest: 'bypass', quiet: true }),
  ]);
  const timer = window.setInterval(settleOrders, 500);
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      clearInterval(timer);
      worker.stop();
    });
}
