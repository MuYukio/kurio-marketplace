import { z } from 'zod';
import { cart, db, persist, publicUser, resetDb, type Scenario } from '../db/store';
import { derive, passwordRecord } from '../db/password';
import { emitResource, replayMock } from './events';
import {
  catalogSchema,
  credentialsSchema,
  registerSchema,
  profileSchema,
  passwordSchema,
  walletSchema,
  collectorSchema,
  walletProviderSchema,
  networkSchema,
  type Quote,
  type Order,
  type CartView,
  type Session,
  type EventData,
} from '@/shared/contracts';
import { toWei, fromWei } from '@/shared/money/eth';
export class Fault extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new Fault(
      422,
      'VALIDATION',
      'Confira os campos indicados.',
      Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] ?? 'form', i.message])),
    );
  return parsed.data;
}
export function sessionUser(token: string) {
  const session = db.sessions[token];
  return session && session.expiresAt > Date.now()
    ? db.users.find((u) => u.id === session.userId)
    : undefined;
}
function auth(token: string) {
  const u = sessionUser(token);
  if (!u)
    throw new Fault(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.');
  return u;
}
function nft(id: string) {
  const n = db.nfts.find((n) => n.id === id);
  if (!n) throw new Fault(404, 'NOT_FOUND', 'NFT não encontrado.');
  return n;
}
function owner(token: string, guest: string) {
  return token ? auth(token).id : `guest:${guest}`;
}
function requireEditable(key: string) {
  if (Object.values(db.orders).some((o) => o.userId === key && o.status === 'pending'))
    throw new Fault(409, 'ORDER_PENDING', 'Aguarde o pedido pendente antes de editar o carrinho.');
}
function available(nftId: string, editionId: string) {
  const edition = nft(nftId).editions.find((e) => e.id === editionId);
  if (!edition) throw new Fault(404, 'EDITION_NOT_FOUND', 'Edição não encontrada.');
  const reserved = Object.values(db.orders)
    .filter((o) => o.status === 'pending')
    .flatMap((o) => o.quote.lines)
    .filter((l) => l.nftId === nftId && l.editionId === editionId)
    .reduce((s, l) => s + l.quantity, 0);
  return { edition, stock: Math.max(0, edition.available - reserved) };
}
function view(key: string): CartView {
  return {
    ...cart(key),
    lines: cart(key).items.map((item) => ({
      ...item,
      nft: nft(item.nftId),
      edition: available(item.nftId, item.editionId).edition,
    })),
  };
}
function calculate(key: string, coupon: string, network: Quote['network']): Quote {
  const c = cart(key);
  if (!c.items.length) throw new Fault(422, 'EMPTY_CART', 'Adicione uma obra ao carrinho.');
  if (coupon && coupon !== 'KURIO10')
    throw new Fault(
      422,
      coupon === 'EXPIRED' ? 'COUPON_EXPIRED' : 'COUPON_INVALID',
      coupon === 'EXPIRED' ? 'Este cupom expirou.' : 'Cupom inválido.',
      { coupon: 'Use KURIO10 para testar 10% de desconto.' },
    );
  const lines = c.items.map((item) => {
    const n = nft(item.nftId);
    const { edition, stock } = available(item.nftId, item.editionId);
    if (item.quantity > stock)
      throw new Fault(
        409,
        'STOCK_CONFLICT',
        `${n.name}: quantidade indisponível. Ajuste o carrinho.`,
      );
    return {
      nftId: n.id,
      tokenId: n.tokenId,
      editionId: edition.id,
      name: n.name,
      editionName: edition.name,
      image: n.image,
      quantity: item.quantity,
      unitPriceEth: edition.priceEth,
      lineTotalEth: fromWei(toWei(edition.priceEth) * BigInt(item.quantity)),
      nftVersion: n.version,
    };
  });
  const subtotal = lines.reduce((s, l) => s + toWei(l.lineTotalEth), 0n),
    discount = coupon ? subtotal / 10n : 0n,
    fee = toWei(network === 'Ethereum' ? '0.003' : network === 'Polygon' ? '0.001' : '0.0005');
  return {
    id: crypto.randomUUID(),
    owner: key,
    cartVersion: c.version,
    lines,
    coupon,
    network,
    subtotalEth: fromWei(subtotal),
    discountEth: fromWei(discount),
    networkFeeEth: fromWei(fee),
    totalEth: fromWei(subtotal - discount + fee),
    expiresAt: Date.now() + 120000,
  };
}
export function settleOrders() {
  if (!db) return;
  for (const o of Object.values(db.orders)) {
    if (o.status !== 'pending' || o.resolveAt > Date.now()) continue;
    o.status = o.outcome;
    o.version++;
    if (o.status === 'confirmed' && !o.cartApplied) {
      const c = cart(o.userId);
      for (const line of o.quote.lines) {
        const item = c.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId);
        if (item) item.quantity = Math.max(0, item.quantity - line.quantity);
        const n = nft(line.nftId);
        const e = n.editions.find((e) => e.id === line.editionId)!;
        e.available -= line.quantity;
        n.version++;
        emitResource('nft.updated', n.id, n.version);
      }
      c.items = c.items.filter((i) => i.quantity > 0);
      c.version++;
      o.cartApplied = true;
      o.transaction = `sim-${o.id}`;
    }
    persist();
    emitResource('order.updated', o.id, o.version, o.userId);
  }
}
function newSession(u: ReturnType<typeof auth>): Session {
  const token = crypto.randomUUID(),
    expiresAt = Date.now() + 3600000;
  db.sessions[token] = { userId: u.id, expiresAt };
  return { user: publicUser(u), token, expiresAt };
}
let previousEvent: EventData | undefined;
export async function dispatch(
  method: string,
  path: string,
  query: URLSearchParams,
  body: unknown,
  token: string,
  guest: string,
): Promise<unknown> {
  settleOrders();
  if (path === '/demo/reset' && method === 'POST') {
    await resetDb();
    return { ok: true };
  }
  if (path === '/demo/state') return { scenario: db.scenario };
  if (path === '/demo/scenario' && method === 'POST') {
    const v = validate(
      z.object({
        scenario: z.enum([
          'default',
          'slow',
          'offline-once',
          'server-error-once',
          'favorite-error',
          'out-of-order',
          'declined',
          'timeout',
        ]),
      }),
      body,
    );
    db.scenario = v.scenario as Scenario;
    db.usedFailures = [];
    return { ok: true };
  }
  if (path === '/demo/action' && method === 'POST') {
    const v = validate(
      z.object({
        action: z.enum(['price', 'sold-out', 'expire', 'duplicate', 'old-event', 'resolve']),
        nftId: z.string().optional(),
      }),
      body,
    );
    if (v.action === 'expire') {
      if (token && db.sessions[token]) db.sessions[token].expiresAt = 0;
      return { ok: true };
    }
    if (v.action === 'resolve') {
      for (const o of Object.values(db.orders)) if (o.status === 'pending') o.resolveAt = 0;
      settleOrders();
      return { ok: true };
    }
    if (v.action === 'duplicate' || v.action === 'old-event') {
      if (previousEvent)
        replayMock(
          'nft.updated',
          v.action === 'duplicate'
            ? previousEvent
            : {
                ...previousEvent,
                eventId: crypto.randomUUID(),
                version: Math.max(0, previousEvent.version - 1),
              },
        );
      return { ok: true };
    }
    const n = nft(v.nftId || 'nft-1');
    if (v.action === 'price')
      n.editions[0].priceEth = fromWei(toWei(n.editions[0].priceEth) + toWei('0.1'));
    else n.editions[0].available = 0;
    n.version++;
    previousEvent = emitResource('nft.updated', n.id, n.version);
    return { ok: true };
  }
  if (path === '/auth/register' && method === 'POST') {
    const v = validate(registerSchema, body);
    if (db.users.some((u) => u.email === v.email.toLowerCase()))
      throw new Fault(409, 'EMAIL_CONFLICT', 'Este e-mail já está cadastrado.', {
        email: 'E-mail já cadastrado',
      });
    const u = {
      id: crypto.randomUUID(),
      name: v.name,
      username: v.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, '-'),
      email: v.email.toLowerCase(),
      ensName: '',
      walletNickname: 'Carteira principal',
      bio: '',
      avatar: '',
      ...(await passwordRecord(v.password)),
    };
    db.users.push(u);
    db.wallets[u.id] = [];
    db.favorites[u.id] = [];
    return newSession(u);
  }
  if (path === '/auth/login' && method === 'POST') {
    const v = validate(credentialsSchema, body);
    const u = db.users.find((u) => u.email === v.email.toLowerCase());
    if (!u || (await derive(v.password, u.salt)) !== u.hash)
      throw new Fault(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
    return newSession(u);
  }
  if (path === '/session') {
    const u = auth(token);
    return { user: publicUser(u), token, expiresAt: db.sessions[token].expiresAt };
  }
  if (path === '/auth/logout' && method === 'POST') {
    delete db.sessions[token];
    return { ok: true };
  }
  if (path === '/nfts') {
    const s = catalogSchema.parse(Object.fromEntries(query));
    let items = db.nfts.filter(
      (n) =>
        (!s.q ||
          `${n.name} ${n.collection} ${n.creator}`.toLowerCase().includes(s.q.toLowerCase())) &&
        (!s.category || n.category === s.category) &&
        (!s.network || n.network === s.network) &&
        (s.tab !== 'popular' || n.featured) &&
        (s.tab !== 'new' || n.createdAt >= '2026-10-10'),
    );
    if (s.min && /^\d+(\.\d{1,18})?$/.test(s.min))
      items = items.filter((n) => toWei(n.editions[0].priceEth) >= toWei(s.min));
    if (s.max && /^\d+(\.\d{1,18})?$/.test(s.max))
      items = items.filter((n) => toWei(n.editions[0].priceEth) <= toWei(s.max));
    items.sort((a, b) =>
      s.sort === 'name'
        ? a.name.localeCompare(b.name)
        : s.sort === 'recent'
          ? b.createdAt.localeCompare(a.createdAt)
          : (toWei(a.editions[0].priceEth) < toWei(b.editions[0].priceEth)
              ? -1
              : toWei(a.editions[0].priceEth) > toWei(b.editions[0].priceEth)
                ? 1
                : 0) * (s.sort === 'price-desc' ? -1 : 1),
    );
    return {
      items: items.slice((s.page - 1) * 9, s.page * 9),
      total: items.length,
      pages: Math.ceil(items.length / 9),
      page: s.page,
      categories: [...new Set(db.nfts.map((n) => n.category))],
      categoryCounts: Object.fromEntries(
        [...new Set(db.nfts.map((n) => n.category))].map((category) => [
          category,
          db.nfts.filter((n) => n.category === category).length,
        ]),
      ),
    };
  }
  if (path.startsWith('/nfts/')) return nft(path.split('/')[2]);
  if (path.startsWith('/favorites')) {
    const u = auth(token);
    const list = (db.favorites[u.id] ??= []);
    if (method === 'GET') return list;
    const id = path.split('/')[2];
    nft(id);
    if (method === 'PUT' && !list.includes(id)) list.push(id);
    if (method === 'DELETE') db.favorites[u.id] = list.filter((i) => i !== id);
    return db.favorites[u.id];
  }
  if (path === '/cart/merge' && method === 'POST') {
    const u = auth(token),
      source = `guest:${guest}`;
    if (db.merged.includes(source)) return view(u.id);
    requireEditable(u.id);
    const dest = cart(u.id),
      messages: string[] = [];
    for (const item of cart(source).items) {
      const target = dest.items.find(
          (i) => i.nftId === item.nftId && i.editionId === item.editionId,
        ),
        sum = item.quantity + (target?.quantity || 0),
        quantity = Math.min(sum, available(item.nftId, item.editionId).stock);
      if (quantity < sum)
        messages.push('Uma quantidade foi ajustada à disponibilidade. Revise o carrinho.');
      if (target) target.quantity = quantity;
      else if (quantity) dest.items.push({ ...item, quantity });
    }
    dest.items = dest.items.filter((i) => i.quantity > 0);
    dest.version++;
    db.merged.push(source);
    db.carts[source] = { items: [], version: 1 };
    return { ...view(u.id), messages };
  }
  if (path === '/cart' && method === 'GET') return view(owner(token, guest));
  if (path.startsWith('/cart/items')) {
    const key = owner(token, guest);
    requireEditable(key);
    const c = cart(key);
    if (method === 'POST') {
      const v = validate(
        z.object({
          nftId: z.string(),
          editionId: z.string(),
          quantity: z.number().int().min(1).max(99),
        }),
        body,
      );
      const existing = c.items.find((i) => i.nftId === v.nftId && i.editionId === v.editionId);
      if (v.quantity + (existing?.quantity || 0) > available(v.nftId, v.editionId).stock)
        throw new Fault(409, 'STOCK_CONFLICT', 'Quantidade indisponível para esta edição.');
      if (existing) existing.quantity += v.quantity;
      else c.items.push({ ...v, id: crypto.randomUUID() });
    } else {
      const id = path.split('/')[3],
        item = c.items.find((i) => i.id === id);
      if (!item) throw new Fault(404, 'NOT_FOUND', 'Item não encontrado.');
      if (method === 'DELETE') c.items = c.items.filter((i) => i.id !== id);
      else {
        const v = validate(z.object({ quantity: z.number().int().min(1).max(99) }), body);
        if (v.quantity > available(item.nftId, item.editionId).stock)
          throw new Fault(409, 'STOCK_CONFLICT', 'Quantidade indisponível.');
        item.quantity = v.quantity;
      }
    }
    c.version++;
    return view(key);
  }
  if (path === '/quotes' && method === 'POST') {
    const v = validate(z.object({ coupon: z.string().default(''), network: networkSchema }), body);
    const quote = calculate(owner(token, guest), v.coupon.trim().toUpperCase(), v.network);
    db.quotes[quote.id] = quote;
    return quote;
  }
  if (path === '/orders' && method === 'POST') {
    const u = auth(token);
    const v = validate(
        z.object({
          quoteId: z.string(),
          walletId: z.string(),
          collector: collectorSchema,
          provider: walletProviderSchema,
          idempotencyKey: z.string().uuid(),
        }),
        body,
      ),
      attemptKey = `${u.id}:${v.idempotencyKey}`,
      payload = JSON.stringify({
        quoteId: v.quoteId,
        walletId: v.walletId,
        collector: v.collector,
        provider: v.provider,
      });
    const prior = db.attempts[attemptKey];
    if (prior) {
      if (prior.payload !== payload)
        throw new Fault(
          409,
          'IDEMPOTENCY_CONFLICT',
          'Esta tentativa já foi usada com outros dados.',
        );
      return db.orders[prior.orderId];
    }
    if (Object.values(db.orders).some((o) => o.userId === u.id && o.status === 'pending'))
      throw new Fault(409, 'ORDER_PENDING', 'Você já possui um pedido pendente.');
    const quote = db.quotes[v.quoteId];
    if (!quote || quote.owner !== u.id)
      throw new Fault(409, 'QUOTE_STALE', 'Solicite uma nova cotação.');
    const fresh = calculate(u.id, quote.coupon, quote.network);
    if (
      quote.expiresAt < Date.now() ||
      quote.cartVersion !== fresh.cartVersion ||
      JSON.stringify(quote.lines) !== JSON.stringify(fresh.lines) ||
      quote.totalEth !== fresh.totalEth
    )
      throw new Fault(409, 'QUOTE_STALE', 'Os valores mudaram. Revise e confirme a nova cotação.');
    const wallet = (db.wallets[u.id] || []).find((w) => w.id === v.walletId);
    if (!wallet || wallet.network !== quote.network)
      throw new Fault(422, 'WALLET_INVALID', 'Escolha uma carteira compatível com a rede.');
    const o: Order = {
      id: crypto.randomUUID(),
      userId: u.id,
      status: 'pending',
      version: 1,
      quote: structuredClone(quote),
      collector: v.collector,
      wallet: structuredClone(wallet),
      provider: v.provider,
      transaction: null,
      createdAt: Date.now(),
      resolveAt: Date.now() + 5000,
      outcome: db.scenario === 'declined' ? 'declined' : 'confirmed',
      cartApplied: false,
    };
    db.orders[o.id] = o;
    db.attempts[attemptKey] = { payload, orderId: o.id };
    return o;
  }
  if (path.startsWith('/orders/')) {
    const u = auth(token),
      o = db.orders[path.split('/')[2]];
    if (!o) throw new Fault(404, 'NOT_FOUND', 'Pedido não encontrado.');
    if (o.userId !== u.id) throw new Fault(403, 'FORBIDDEN', 'Você não tem acesso a este pedido.');
    return o;
  }
  if (path === '/profile') {
    const u = auth(token);
    if (method === 'PATCH') {
      const v = validate(profileSchema, body);
      if (db.users.some((other) => other.id !== u.id && other.email === v.email.toLowerCase()))
        throw new Fault(409, 'EMAIL_CONFLICT', 'E-mail já utilizado.', {
          email: 'Este e-mail pertence a outra conta',
        });
      if (
        db.users.some(
          (other) =>
            other.id !== u.id && other.username?.toLowerCase() === v.username.toLowerCase(),
        )
      )
        throw new Fault(409, 'USERNAME_CONFLICT', 'Nome de usuário indisponível.', {
          username: 'Este nome de usuário já está em uso',
        });
      if (v.avatar && !/^data:image\/(png|jpeg|webp);base64,/.test(v.avatar))
        throw new Fault(422, 'VALIDATION', 'Formato de avatar inválido.', {
          avatar: 'Use PNG, JPEG ou WebP',
        });
      Object.assign(u, v, { email: v.email.toLowerCase() });
    }
    return publicUser(u);
  }
  if (path === '/profile/password' && method === 'POST') {
    const u = auth(token),
      v = validate(passwordSchema, body);
    if ((await derive(v.current, u.salt)) !== u.hash)
      throw new Fault(422, 'VALIDATION', 'Senha atual incorreta.', {
        current: 'Senha atual incorreta',
      });
    Object.assign(u, await passwordRecord(v.password));
    return { ok: true };
  }
  if (path.startsWith('/wallets')) {
    const u = auth(token);
    const list = (db.wallets[u.id] ??= []);
    if (method === 'GET') return list;
    const v = validate(walletSchema, body),
      id = path.split('/')[2];
    if (
      list.some(
        (w) =>
          w.id !== id && (w.role === v.role || w.address.toLowerCase() === v.address.toLowerCase()),
      )
    )
      throw new Fault(409, 'WALLET_CONFLICT', 'Já existe uma carteira com este papel ou endereço.');
    if (method === 'PATCH') {
      const w = list.find((w) => w.id === id);
      if (!w) throw new Fault(404, 'NOT_FOUND', 'Carteira não encontrada.');
      Object.assign(w, v);
    } else list.push({ ...v, id: crypto.randomUUID() });
    return list;
  }
  throw new Fault(404, 'NOT_FOUND', 'Recurso não encontrado.');
}
