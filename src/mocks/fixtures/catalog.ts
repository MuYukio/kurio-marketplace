import type { NFT, Network } from '@/shared/contracts';
const categories = [
  'Arte digital',
  'Fotografia',
  'Música',
  'Arte 3D',
  'Colecionáveis',
  'Generativa',
];
const names = [
  'Emerald Ape',
  'Sage Nomad',
  'Neon Vessel',
  'Cosmic Bloom',
  'Violet Nomad',
  'Ivory Baron',
  'Golden Beat',
  'Golden Signal',
];
const featuredNumbers = ['042', '009', '552', '118', '314', '088', '207', '160'];
const featuredImages = [
  '/assets/nft-emerald-ape-042.webp',
  '/assets/nft-sage-nomad-009.jpg',
  '/assets/nft-ivory-baron-088.png',
  '/assets/nft-sage-nomad-009.jpg',
  '/assets/nft-sage-nomad-009.jpg',
  '/assets/nft-ivory-baron-088.png',
  '/assets/nft-golden-beat-207.png',
  '/assets/nft-golden-beat-207.png',
];
export const catalogFixture: NFT[] = Array.from({ length: 24 }, (_, i) => ({
  id: `nft-${i + 1}`,
  tokenId: `#${String(42 + i * 7).padStart(4, '0')}`,
  name: `${names[i % 8]} #${featuredNumbers[i] ?? String(42 + i * 7).padStart(3, '0')}`,
  collection: i === 0 ? 'Kurio Apes' : ['Future Forms', 'Quiet Objects', 'Digital Nature'][i % 3],
  category: categories[i % 6],
  network: (['Ethereum', 'Polygon', 'Solana'] as Network[])[i % 3],
  image: featuredImages[i % featuredImages.length],
  images: Array.from({ length: 4 }, (_, imageIndex) => ({
    src: featuredImages[i % featuredImages.length],
    alt: `${names[i % 8]}, vista ${imageIndex + 1}`,
  })),
  description:
    i === 0
      ? 'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.'
      : 'Uma composição sobre forma, memória e os pequenos universos que colecionamos. Obra demonstrativa da coleção Kurio com asset local.',
  shortDescription:
    i === 0
      ? 'Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na Ethereum.'
      : 'Uma obra digital de edição limitada da coleção Kurio.',
  creator: ['Studio Kurio', 'Ana Forma', 'Noah Digital'][i % 3],
  rating: { average: i === 0 ? 4.8 : 4.6, count: i === 0 ? 19 : 12 },
  attributes: i === 0 ? ['Óculos', 'Esmeralda', 'Raro'] : ['Digital', 'Curado'],
  details: {
    contract: '0x7A42...19E8 · Contrato inteligente ERC-721 verificado.',
    royalties: '5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.',
  },
  reviews: [
    {
      id: `review-${i + 1}-1`,
      author: 'Colecionador verificado',
      rating: 5,
      text: 'A obra chegou à carteira com todos os detalhes apresentados na coleção.',
    },
  ],
  version: 1,
  editions: [
    {
      id: 'standard',
      name: '1/50',
      available: i === 23 ? 0 : 8,
      priceEth: ['1.19', '1.29', '1.39', '1.79', '0.99', '0.39', '1.69', '1.99'][i % 8],
    },
    {
      id: 'limited',
      name: '1/10',
      available: i === 22 ? 0 : 3,
      priceEth: ['2.19', '2.69', '2.99', '2.29'][i % 4],
    },
    {
      id: 'unique',
      name: '1/1',
      available: i === 21 ? 0 : 1,
      priceEth: ['3.19', '3.69', '3.99', '3.29'][i % 4],
    },
  ],
  featured: i < 3,
  createdAt: new Date(Date.UTC(2026, 9, 19 - i)).toISOString(),
}));
