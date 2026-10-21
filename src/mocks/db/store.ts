import type { User, Wallet, NFT, Cart, Quote, Order } from '@/shared/contracts';
import { catalogFixture } from '../fixtures/catalog';
import { passwordRecord } from './password';
export const DB_KEY = 'kurio.mock.v4';
export type Scenario =
  | 'default'
  | 'slow'
  | 'offline-once'
  | 'server-error-once'
  | 'favorite-error'
  | 'out-of-order'
  | 'declined'
  | 'timeout';
type Account = User & { salt: string; hash: string };
export type Database = {
  schema: 4;
  users: Account[];
  sessions: Record<string, { userId: string; expiresAt: number }>;
  nfts: NFT[];
  carts: Record<string, Cart>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  quotes: Record<string, Quote>;
  orders: Record<string, Order>;
  attempts: Record<string, { payload: string; orderId: string }>;
  merged: string[];
  scenario: Scenario;
  usedFailures: string[];
};
export let db: Database;
export function persist() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
export function publicUser(u: Account): User {
  return {
    id: u.id,
    name: u.name,
    username: u.username || u.email.split('@')[0],
    email: u.email,
    ensName: u.ensName || '',
    walletNickname: u.walletNickname || 'Carteira principal',
    bio: u.bio,
    avatar: u.avatar,
  };
}
export async function resetDb() {
  const password = await passwordRecord('Kurio123!');
  db = {
    schema: 4,
    users: [
      {
        id: 'user-ana',
        name: 'Ana Colecionadora',
        username: 'ana',
        email: 'ana@kurio.test',
        ensName: 'ana.kurio',
        walletNickname: 'Minha carteira',
        bio: 'Colecionando novos olhares.',
        avatar: '',
        ...password,
      },
      {
        id: 'user-bruno',
        name: 'Bruno Colecionador',
        username: 'bruno',
        email: 'bruno@kurio.test',
        ensName: 'bruno.kurio',
        walletNickname: 'Carteira Bruno',
        bio: '',
        avatar: '',
        ...(await passwordRecord('Kurio123!')),
      },
    ],
    sessions: {},
    nfts: structuredClone(catalogFixture),
    carts: {},
    favorites: { 'user-ana': [], 'user-bruno': [] },
    wallets: {
      'user-ana': [
        {
          id: 'wallet-ana',
          name: 'Principal',
          network: 'Ethereum',
          role: 'primary',
          address: '0x1111111111111111111111111111111111111111',
        },
        {
          id: 'wallet-ana-reserva',
          name: 'nova.kurio.eth',
          network: 'Polygon',
          role: 'secondary',
          address: '0x3333333333333333333333333333333333333333',
        },
      ],
      'user-bruno': [
        {
          id: 'wallet-bruno',
          name: 'Carteira Bruno',
          network: 'Ethereum',
          role: 'primary',
          address: '0x2222222222222222222222222222222222222222',
        },
      ],
    },
    quotes: {},
    orders: {},
    attempts: {},
    merged: [],
    scenario: 'default',
    usedFailures: [],
  };
  persist();
}
export async function initializeDb() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY) || 'null') as Database | null;
    if (saved?.schema === 4) {
      db = saved;
      return;
    }
  } catch {
    /* Invalid demo data is reset deterministically. */
  }
  await resetDb();
}
export function cart(owner: string): Cart {
  return db.carts[owner] ?? (db.carts[owner] = { version: 1, items: [] });
}
