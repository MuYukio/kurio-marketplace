# Contratos REST e eventos

Base `/api`. Headers: `Authorization: Bearer <token>` para sessão, `X-Guest-Id` para carrinho visitante e `Idempotency-Key` obrigatório em criação/recuperação de pedido. O cliente inclui geração local de sessão para descartar respostas antigas; o servidor não usa esse header como autorização.

Valores ETH: strings decimais não negativas, até 18 casas; quantidades: inteiros positivos. Datas: timestamps em milissegundos nesta implementação (catálogo usa ISO). Esse detalhe difere da sugestão inicial do plano e é consistente nos DTOs.

## Recursos

| Método       | Endpoint            | Entrada                                                                                               | Resposta                                             |
| ------------ | ------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| POST         | `/auth/register`    | name, email, password, confirm                                                                        | Session                                              |
| POST         | `/auth/login`       | email, password                                                                                       | Session                                              |
| GET          | `/session`          | credencial                                                                                            | Session                                              |
| POST         | `/auth/logout`      | credencial                                                                                            | `{ok:true}`                                          |
| GET          | `/nfts`             | q, category, network, min, max, sort, page, tab                                                       | `{items,total,pages,page,categories,categoryCounts}` |
| GET          | `/nfts/:id`         | identificador                                                                                         | NFT                                                  |
| GET          | `/favorites`        | sessão                                                                                                | string[] de IDs                                      |
| PUT / DELETE | `/favorites/:nftId` | sessão                                                                                                | string[] atualizado                                  |
| GET          | `/cart`             | sessão ou visitante                                                                                   | CartView                                             |
| POST         | `/cart/items`       | nftId, editionId, quantity                                                                            | CartView                                             |
| PATCH        | `/cart/items/:id`   | quantity                                                                                              | CartView                                             |
| DELETE       | `/cart/items/:id`   | identificador da linha                                                                                | CartView                                             |
| POST         | `/cart/merge`       | sessão + visitante nos headers                                                                        | CartView + messages opcionais                        |
| POST         | `/quotes`           | coupon, network                                                                                       | Quote                                                |
| POST         | `/orders`           | quoteId, walletId, provider, collector e Idempotency-Key                                              | Order; 201 inclusive na recuperação                  |
| GET          | `/orders/:id`       | sessão dona                                                                                           | Order                                                |
| GET          | `/profile`          | sessão                                                                                                | User público                                         |
| PATCH        | `/profile`          | name, username, email, ensName, walletNickname, bio, avatar                                           | User público                                         |
| POST         | `/profile/password` | current, password, confirm                                                                            | `{ok:true}`                                          |
| GET          | `/wallets`          | sessão                                                                                                | Wallet[]                                             |
| POST         | `/wallets`          | name, displayName, profileName, email, ensName, referralCode, secondaryWallet, role, network, address | Wallet[]                                             |
| PATCH        | `/wallets/:id`      | mesmos campos                                                                                         | Wallet[]                                             |

O catálogo usa nove itens por página. Sort: `recent`, `price-asc`, `price-desc`, `name`. Tab: `all`, `new`, `popular`. Filtros de dimensões distintas se combinam; esta versão seleciona uma categoria e uma rede por vez.

Pagamento é expresso em ETH na simulação, inclusive ao escolher taxa de Polygon/Solana. A escolha de rede governa a carteira e a taxa fictícia; não há transferência cross-chain ou validação blockchain. Revisar a regra de rede por NFT com o Figma antes da entrega final.

## Formatos essenciais

Os tipos completos e schemas vivem em `src/shared/contracts/index.ts`.

```ts
type Session = {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    ensName: string;
    walletNickname: string;
    bio: string;
    avatar: string;
  };
  token: string;
  expiresAt: number;
};

type Quote = {
  id: string;
  owner: string;
  cartVersion: number;
  lines: Array<{
    nftId: string;
    tokenId: string;
    editionId: string;
    name: string;
    editionName: string;
    image: string;
    quantity: number;
    unitPriceEth: string;
    lineTotalEth: string;
    nftVersion: number;
  }>;
  coupon: string;
  network: 'Ethereum' | 'Polygon' | 'Solana';
  subtotalEth: string;
  discountEth: string;
  networkFeeEth: string;
  totalEth: string;
  expiresAt: number;
};

type Collector = {
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
```

`Order` contém ID, userId, status, version, snapshot Quote, collector, provider (`walletconnect`, `metamask` ou `coinbase`), snapshot Wallet, referência de transação simulada e datas. `outcome`, `resolveAt` e `cartApplied` ainda são campos de simulação presentes no DTO desta base; uma evolução deve separar o modelo interno de pedido do DTO público para não expor detalhes de implementação desnecessários.

## Erros

```json
{
  "error": {
    "code": "VALIDATION",
    "message": "Confira os campos indicados.",
    "fieldErrors": { "email": "E-mail inválido" }
  }
}
```

- 401 `INVALID_CREDENTIALS` ou `SESSION_EXPIRED`.
- 403 `FORBIDDEN` ao consultar pedido de outra conta.
- 404 `NOT_FOUND`/`EDITION_NOT_FOUND`.
- 409 `EMAIL_CONFLICT`, `STOCK_CONFLICT`, `QUOTE_STALE`, `IDEMPOTENCY_CONFLICT`, `ORDER_PENDING`, `WALLET_CONFLICT`.
- 422 `VALIDATION`, `COUPON_INVALID`, `COUPON_EXPIRED`, `EMPTY_CART`, `WALLET_INVALID`.
- 503 `TRANSIENT` e falha de conexão sem resposta HTTP nos cenários respectivos.

As senhas não são retornadas. Avatar exige data URL PNG/JPEG/WebP e limite de conteúdo. Endereços EVM usam `0x` + 40 hexadecimais; Solana usa formato base58 com 32–44 caracteres, sem validar existência on-chain.

## Idempotência

Escopo: usuário + chave. O fingerprint inclui quoteId, walletId, provider e collector normalizado pelo schema. Mesma tentativa recupera o pedido persistido antes de verificar validade da cotação. Conteúdo diferente gera conflito. Apenas uma criação em andamento por usuário; o mock serializa transações dos handlers numa aba.

## Controle de cenários (apenas quando mocks estão habilitados)

- `GET /demo/state`: cenário atual.
- `POST /demo/scenario`: `{scenario}`.
- `POST /demo/action`: `{action,nftId?}`; ações: price, sold-out, expire, duplicate, old-event, resolve.
- `POST /demo/disconnect`: encerra sockets do mock para testar reconexão real do cliente.
- `POST /demo/reset`: restaura banco; o painel limpa também contexto cliente e recarrega.

Esses endpoints não são uma proposta de API administrativa de produção. Os cenários têm atrasos fixos e sequência de falha única; não usam aleatoriedade temporal não controlada.

## Eventos

`nft.updated` e `order.updated` usam `{eventId,resourceId,version,occurredAt,userId?}`. Os eventos sinalizam mudança; o cliente refaz REST para obter snapshot autorizado atualizado. Mensagens privadas só são enviadas ao proprietário autenticado. O estado persistido muda antes do envio; após perder um evento, a consulta REST ainda recupera o resultado.
