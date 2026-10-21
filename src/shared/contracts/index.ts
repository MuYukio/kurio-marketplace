import { z } from 'zod';
export const ethSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor ETH inválido');
export const networkSchema = z.enum(['Ethereum', 'Polygon', 'Solana']);
export type Network = z.infer<typeof networkSchema>;
export const networks = networkSchema.options;
export type Eth = string;
export type Edition = { id: string; name: string; available: number; priceEth: Eth };
export type NFT = {
  id: string;
  tokenId: string;
  name: string;
  collection: string;
  category: string;
  network: Network;
  image: string;
  images: Array<{ src: string; alt: string }>;
  description: string;
  shortDescription: string;
  creator: string;
  rating: { average: number; count: number };
  attributes: string[];
  details: { contract: string; royalties: string };
  reviews: Array<{ id: string; author: string; rating: number; text: string }>;
  version: number;
  editions: Edition[];
  featured: boolean;
  createdAt: string;
};
export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  ensName: string;
  walletNickname: string;
  bio: string;
  avatar: string;
};
export type Session = { user: User; token: string; expiresAt: number };
export type Wallet = {
  id: string;
  name: string;
  address: string;
  network: Network;
  role: 'primary' | 'secondary';
  displayName?: string;
  profileName?: string;
  email?: string;
  ensName?: string;
  referralCode?: string;
  secondaryWallet?: string;
};
export type CartItem = { id: string; nftId: string; editionId: string; quantity: number };
export type Cart = { version: number; items: CartItem[] };
export type CartView = Cart & { lines: Array<CartItem & { nft: NFT; edition: Edition }> };
export type QuoteLine = {
  nftId: string;
  tokenId: string;
  editionId: string;
  name: string;
  editionName: string;
  image: string;
  quantity: number;
  unitPriceEth: Eth;
  lineTotalEth: Eth;
  nftVersion: number;
};
export const walletProviderSchema = z.enum(['walletconnect', 'metamask', 'coinbase']);
export type WalletProvider = z.infer<typeof walletProviderSchema>;
export type Collector = {
  displayName: string;
  username: string;
  profileName: string;
  email: string;
  ensName: string;
  referralCode: string;
  walletAddress: string;
  walletType: 'primary' | 'secondary' | 'other';
  secondaryWallet?: string;
  note?: string;
};
export type Quote = {
  id: string;
  owner: string;
  cartVersion: number;
  lines: QuoteLine[];
  coupon: string;
  network: Network;
  subtotalEth: Eth;
  discountEth: Eth;
  networkFeeEth: Eth;
  totalEth: Eth;
  expiresAt: number;
};
export type Order = {
  id: string;
  userId: string;
  status: 'pending' | 'confirmed' | 'declined';
  version: number;
  quote: Quote;
  collector: Collector;
  wallet: Wallet;
  provider: WalletProvider;
  transaction: string | null;
  createdAt: number;
  resolveAt: number;
  outcome: 'confirmed' | 'declined';
  cartApplied: boolean;
};
export type ApiErrorBody = {
  error: { code: string; message: string; fieldErrors?: Record<string, string> };
};
export type EventData = {
  eventId: string;
  resourceId: string;
  version: number;
  userId?: string;
  occurredAt: number;
};
export const catalogSchema = z.object({
  q: z.string().catch(''),
  category: z.string().catch(''),
  network: z.string().catch(''),
  sort: z.enum(['recent', 'price-asc', 'price-desc', 'name']).catch('recent'),
  page: z.coerce.number().int().min(1).catch(1),
  min: z.string().catch(''),
  max: z.string().catch(''),
  tab: z.enum(['all', 'new', 'popular']).catch('all'),
});
export type CatalogSearch = z.infer<typeof catalogSchema>;
export type CatalogPage = {
  items: NFT[];
  total: number;
  pages: number;
  page: number;
  categories: string[];
  categoryCounts: Record<string, number>;
};
export const credentialsSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Use pelo menos 8 caracteres'),
});
export const registerSchema = credentialsSchema
  .extend({ name: z.string().trim().min(2, 'Informe seu nome'), confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem',
  });
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  username: z
    .string()
    .trim()
    .min(2, 'Informe o nome de usuário')
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Use apenas letras, números, ponto, hífen ou sublinhado'),
  email: z.string().email('E-mail inválido'),
  ensName: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-zA-Z0-9.-]*$/, 'Nome ENS inválido'),
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(50),
  bio: z.string().max(280, 'Máximo de 280 caracteres'),
  avatar: z.string().max(400000, 'Avatar muito grande'),
});
export const passwordSchema = z
  .object({
    current: z.string().min(1, 'Informe a senha atual'),
    password: z.string().min(8, 'Use pelo menos 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem',
  });
export const walletSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe um nome'),
    displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(80),
    profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(80),
    email: z.string().email('E-mail inválido'),
    ensName: z
      .string()
      .trim()
      .max(60)
      .regex(/^[a-zA-Z0-9.-]*$/, 'Nome ENS inválido'),
    referralCode: z.string().trim().min(2, 'Informe o código de indicação').max(40),
    secondaryWallet: z.string().trim().max(100).optional(),
    network: networkSchema,
    role: z.enum(['primary', 'secondary']),
    address: z.string(),
  })
  .superRefine((v, ctx) => {
    const valid =
      v.network === 'Solana'
        ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v.address)
        : /^0x[a-fA-F0-9]{40}$/.test(v.address);
    if (!valid)
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Endereço inválido para esta rede',
      });
  });
const checkoutWalletAddressSchema = z
  .string()
  .trim()
  .refine(
    (value) => /^0x[a-fA-F0-9]{40}$/.test(value) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value),
    'Informe um endereço de carteira válido',
  );
export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(80),
  username: z.string().trim().min(2, 'Informe o nome de usuário').max(40),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(80),
  email: z.string().email('E-mail inválido'),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.eth$/i, 'Use um nome ENS terminado em .eth'),
  referralCode: z.string().trim().min(2, 'Informe o código de indicação').max(40),
  walletAddress: checkoutWalletAddressSchema,
  walletType: z.enum(['primary', 'secondary', 'other']),
  secondaryWallet: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500, 'Máximo de 500 caracteres').optional(),
});
