import { http, HttpResponse, delay } from 'msw';
import { db, persist } from '../db/store';
import { dispatch, Fault } from '../services/domain';
import { disconnectMock } from './realtime';
// Serialize mock transactions: request parsing/latency is outside this critical section.
let tail: Promise<unknown> = Promise.resolve();
export const restHandler = http.all('/api/*', async ({ request }) => {
  const url = new URL(request.url),
    path = url.pathname.slice(4),
    method = request.method;
  let body = method === 'GET' ? undefined : await request.json().catch(() => undefined);
  if (path === '/orders' && method === 'POST') {
    body = {
      ...(body && typeof body === 'object' ? body : {}),
      idempotencyKey: request.headers.get('Idempotency-Key') || '',
    };
  }
  if (path === '/demo/disconnect') {
    disconnectMock();
    return HttpResponse.json({ ok: true });
  }
  const scenario = db.scenario,
    isControl = path.startsWith('/demo');
  if (!isControl) {
    if (scenario === 'slow') await delay(1400);
    else if (scenario === 'out-of-order' && path === '/nfts')
      await delay(url.searchParams.get('q') === 'Emerald' ? 1200 : 80);
    else await delay(100);
    const failureKey =
      scenario === 'favorite-error'
        ? path.includes('/favorites') && method !== 'GET'
          ? 'favorite'
          : null
        : scenario === 'offline-once' || scenario === 'server-error-once'
          ? 'network'
          : null;
    if (failureKey && !db.usedFailures.includes(failureKey)) {
      db.usedFailures.push(failureKey);
      persist();
      return scenario === 'offline-once'
        ? HttpResponse.error()
        : HttpResponse.json(
            { error: { code: 'TRANSIENT', message: 'Falha simulada. Tente novamente.' } },
            { status: 503 },
          );
    }
  }
  const work = tail.then(async () => {
    try {
      const data = await dispatch(
        method,
        path,
        url.searchParams,
        body,
        request.headers.get('Authorization')?.replace('Bearer ', '') || '',
        request.headers.get('X-Guest-Id') || 'anonymous',
      );
      persist();
      return new HttpResponse(JSON.stringify(data), {
        status: method === 'POST' && path === '/orders' ? 201 : 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      persist();
      if (error instanceof Fault)
        return HttpResponse.json(
          { error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } },
          { status: error.status },
        );
      console.error(error);
      return HttpResponse.json(
        { error: { code: 'INTERNAL', message: 'Falha inesperada na simulação.' } },
        { status: 500 },
      );
    }
  });
  tail = work.catch(() => undefined);
  const response = await work;
  if (
    path === '/orders' &&
    method === 'POST' &&
    scenario === 'timeout' &&
    !db.usedFailures.includes('order-timeout')
  ) {
    db.usedFailures.push('order-timeout');
    persist();
    await delay(6500);
  }
  return response;
});
