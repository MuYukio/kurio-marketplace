import { beforeEach, describe, it, expect, vi } from 'vitest';
import { resetDb, db } from '../db/store';
import { dispatch, settleOrders } from './domain';
import type { Session, Quote, Order, CartView } from '@/shared/contracts';
const call = (method: string, path: string, body?: unknown, token = '', guest = 'test-guest') =>
  dispatch(method, path, new URLSearchParams(), body, token, guest);
async function session(email = 'ana@kurio.test') {
  return (await call('POST', '/auth/login', { email, password: 'Kurio123!' })) as Session;
}
async function intention() {
  const s = await session();
  await call(
    'POST',
    '/cart/items',
    { nftId: 'nft-1', editionId: 'standard', quantity: 2 },
    s.token,
  );
  const q = (await call(
    'POST',
    '/quotes',
    { coupon: 'KURIO10', network: 'Ethereum' },
    s.token,
  )) as Quote;
  return {
    s,
    q,
    payload: {
      quoteId: q.id,
      walletId: 'wallet-ana',
      collector: {
        displayName: 'Ana',
        username: 'ana',
        profileName: 'Ana Kurio',
        email: 'ana@kurio.test',
        ensName: 'ana.kurio.eth',
        referralCode: 'KURIO26',
        walletAddress: '0x1111111111111111111111111111111111111111',
        walletType: 'primary' as const,
        secondaryWallet: '',
        note: '',
      },
      provider: 'coinbase' as const,
      idempotencyKey: crypto.randomUUID(),
    },
  };
}
beforeEach(async () => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
  });
  await resetDb();
});
describe('transações da API simulada', () => {
  it('recupera o mesmo pedido mesmo após a cotação vencer', async () => {
    const { s, q, payload } = await intention();
    const a = (await call('POST', '/orders', payload, s.token)) as Order;
    q.expiresAt = 0;
    const b = (await call('POST', '/orders', payload, s.token)) as Order;
    expect(b.id).toBe(a.id);
    expect(Object.keys(db.orders)).toHaveLength(1);
  });
  it('rejeita a reutilização da chave com conteúdo diferente', async () => {
    const { s, payload } = await intention();
    await call('POST', '/orders', payload, s.token);
    await expect(
      call(
        'POST',
        '/orders',
        { ...payload, collector: { ...payload.collector, displayName: 'Outra pessoa' } },
        s.token,
      ),
    ).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_CONFLICT' });
  });
  it('rejeita cotação depois de mudança de preço', async () => {
    const { s, payload } = await intention();
    await call('POST', '/demo/action', { action: 'price', nftId: 'nft-1' });
    await expect(call('POST', '/orders', payload, s.token)).rejects.toMatchObject({
      code: 'QUOTE_STALE',
    });
    expect(Object.keys(db.orders)).toHaveLength(0);
  });
  it('confirma uma vez, remove apenas os itens comprados e preserva snapshot', async () => {
    const { s, payload } = await intention();
    const o = (await call('POST', '/orders', payload, s.token)) as Order;
    const snapshot = structuredClone(o.quote);
    o.resolveAt = 0;
    settleOrders();
    settleOrders();
    expect(o.status).toBe('confirmed');
    expect(db.nfts[0].editions[0].available).toBe(6);
    expect(((await call('GET', '/cart', undefined, s.token)) as CartView).items).toHaveLength(0);
    await call('POST', '/demo/action', { action: 'price', nftId: 'nft-1' });
    expect(o.quote).toEqual(snapshot);
  });
  it('preserva o carrinho após recusa', async () => {
    const { s, payload } = await intention();
    db.scenario = 'declined';
    const o = (await call('POST', '/orders', payload, s.token)) as Order;
    o.resolveAt = 0;
    settleOrders();
    expect(o.status).toBe('declined');
    expect(((await call('GET', '/cart', undefined, s.token)) as CartView).items[0].quantity).toBe(
      2,
    );
    expect(db.nfts[0].editions[0].available).toBe(8);
  });
  it('bloqueia leitura de pedido por outra conta', async () => {
    const { s, payload } = await intention();
    const o = (await call('POST', '/orders', payload, s.token)) as Order;
    const b = await session('bruno@kurio.test');
    await expect(call('GET', `/orders/${o.id}`, undefined, b.token)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('faz merge visitante uma única vez', async () => {
    await call('POST', '/cart/items', { nftId: 'nft-1', editionId: 'standard', quantity: 2 });
    const s = await session();
    await call('POST', '/cart/merge', {}, s.token);
    await call('POST', '/cart/merge', {}, s.token);
    const c = (await call('GET', '/cart', undefined, s.token)) as CartView;
    expect(c.items[0].quantity).toBe(2);
  });
  it('não guarda senhas em claro', () => {
    expect(JSON.stringify(db)).not.toContain('Kurio123!');
    expect(db.users[0].salt).not.toBe(db.users[1].salt);
  });
});
