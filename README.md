# Kurio — NFT Marketplace

Solução funcional do desafio frontend em React e TypeScript. A aplicação cobre descoberta, compra e conta do colecionador com API e tempo real simulados. A identidade usa os tokens confirmados do Figma: nove cores oficiais e Roboto Mono local.

**Versão 0.12.0.** Nenhuma cobrança, carteira ou operação blockchain real é executada. As quatro artes do catálogo são assets locais otimizados e utilizados nos diferentes NFTs da simulação.

## Começar no VS Code

1. Extraia o ZIP e abra a pasta `kurio-marketplace` no VS Code.
2. Instale Node.js 22.12 ou superior (a versão 24 também é suportada).
3. No terminal, execute:

```bash
npm ci
npm run dev:mock
```

4. Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

Não abra `index.html` por duplo clique ou pela extensão Live Server: React, roteamento e MSW precisam do servidor Vite. Não é necessário backend externo, conta de blockchain ou chave de API.

## Credenciais fictícias

| Conta | E-mail             | Senha       |
| ----- | ------------------ | ----------- |
| Ana   | `ana@kurio.test`   | `Kurio123!` |
| Bruno | `bruno@kurio.test` | `Kurio123!` |

Ambas começam com uma carteira Ethereum fictícia e carrinho vazio. Use somente dados de demonstração. Cadastro adicional, alteração de perfil, avatar, senha e carteiras persistem no navegador. As senhas dos registros são derivadas com PBKDF2/SHA-256, salt individual e 100.000 iterações; nunca são retornadas pela API.

## Comandos

| Comando                      | Finalidade                                          |
| ---------------------------- | --------------------------------------------------- |
| `npm run dev:mock`           | Desenvolvimento com MSW; usa `.env.demo`            |
| `npm run dev`                | Desenvolvimento conforme as variáveis locais        |
| `npm run typecheck`          | Verificação TypeScript estrita                      |
| `npm run lint`               | ESLint                                              |
| `npm run format`             | Formatar código e documentação com Prettier         |
| `npm run test`               | Regras monetárias e transações do domínio simulado  |
| `npm run build:demo`         | Build otimizado com mocks para demonstração         |
| `npm run build`              | Build conforme variáveis do ambiente                |
| `npm run preview`            | Servir o build existente, normalmente na porta 4173 |
| `npm run test:e2e`           | Playwright Chromium desktop e mobile                |
| `npm run test:e2e:ui`        | Interface de depuração Playwright                   |
| `npm run test:visual`        | Comparar snapshots com as baselines                 |
| `npm run test:visual:update` | Atualizar baselines após revisão intencional        |
| `npm run test:report`        | Abrir relatório HTML dos E2E                        |
| `npm run audit:lighthouse`   | Início/detalhe × mobile/desktop × três medições     |
| `npm run check`              | Tipos, lint, testes de domínio e build demo         |

Antes dos testes de navegador:

```bash
npx playwright install chromium
npm run build:demo
npm run test:e2e
npm run test:visual
```

Em Linux/CI, se faltarem bibliotecas de sistema, use a instalação de dependências recomendada pelo Playwright (`npx playwright install --with-deps chromium`). O `webServer` da configuração serve o build automaticamente. Não é necessário iniciar preview manualmente para a suite.

O relatório HTML fica em `playwright-report`; traces e screenshots de falhas ficam em `test-results`. Os diretórios gerados são ignorados no Git. As baselines em `tests/visual.spec.ts-snapshots` devem ser versionadas e revisadas antes de qualquer atualização.

## Configuração

`.env.demo` já contém:

```dotenv
VITE_ENABLE_MOCKS=true
VITE_API_BASE_URL=/api
```

Para `npm run dev`, copie `.env.example` para `.env.local` ou forneça as variáveis. Variáveis `VITE_*` são públicas no bundle. O modo sem mocks espera uma API compatível; esta entrega não inclui backend de produção.

O build de demonstração precisa usar `build:demo`: habilitar mocks só no desenvolvimento deixaria o deploy sem dados e eventos. O bootstrap aguarda MSW antes de importar o aplicativo e o `socket.io-client`.

## O que já pode ser usado

- Catálogo com 24 NFTs, busca, filtro de coleção/preço/rede, abas, ordenação e paginação na URL.
- Detalhe, edição, quantidade, indisponibilidade, favorito otimista com rollback.
- Carrinho visitante/autenticado, refresh, merge no login, quantidades, remoção e cupom.
- Remoção do carrinho com ação acessível de desfazer, recotação bloqueando o avanço e URLs canônicas em português com acesso direto.
- Login/cadastro, recuperação de sessão, rotas privadas, logout e expiração.
- Perfil, avatar local persistente, alteração de senha e duas carteiras por usuário.
- Checkout, conexão/recusa/desconexão simulada de carteira, revisão e cotação.
- Pedido idempotente, estados pendente/confirmado/recusado, recuperação por chave, snapshot de recibo.
- Eventos `nft.updated` e `order.updated` via `socket.io-client` e binding MSW, com versões e reconciliação REST.
- Tokens globais, Header/Footer compartilhados, layouts iniciais desktop/mobile, componentes shadcn/ui adaptados, skeletons e foco visível.

Os componentes shadcn/ui ficam no caminho convencional `src/components/ui`. `components.json` aponta para esse diretório; Button, Dialog e Carousel são efetivamente reutilizados nas telas.

## Cenários de demonstração

No rodapé, abra **Cenários de demonstração**. Os controles enviam REST à camada MSW. Não chamam setters ou QueryClient para fabricar eventos.

| Controle                        | Como testar                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Rede lenta                      | Selecione e abra outra tela; observe skeletons                                 |
| Falha de conexão uma vez        | Próxima chamada REST falha; GET pode se recuperar com o retry configurado      |
| Erro HTTP 503 uma vez           | Próxima chamada devolve falha transitória                                      |
| Favorito falha uma vez          | Autentique, selecione e clique no coração; o estado deve voltar                |
| Busca fora de ordem             | `Emerald` responde mais devagar que outras buscas                              |
| Pagamento recusado              | Selecione antes de confirmar a compra; o carrinho permanece                    |
| Timeout após criar pedido       | Pedido é salvo, mas a resposta demora além do timeout; use Recuperar tentativa |
| Alterar preço                   | Aumenta 0,1 ETH da edição aberta do NFT escolhido e emite evento               |
| Esgotar edição                  | Zera estoque da edição aberta e emite evento                                   |
| Duplicar evento / Evento antigo | Reenvia o último evento de NFT com identidade/versão controlada                |
| Interromper socket              | Fecha conexão no mock; cliente reconecta e consulta REST                       |
| Expirar sessão                  | Invalida sessão; próxima operação privada exige login                          |
| Resolver pendentes              | Antecipa resolução dos pedidos pendentes do cenário                            |
| Resetar demonstração            | Restaura fixtures e limpa contexto local após confirmação                      |

Cupons: `KURIO10` aplica 10%; `EXPIRED` retorna expirado; qualquer outro código não vazio é inválido.

### Roteiro: preço alterado no checkout

1. Entre como Ana, adicione `nft-1` e siga ao pagamento.
2. Conecte a carteira e marque o aceite da cotação.
3. Abra os cenários, selecione `nft-1` e clique em Alterar preço.
4. Feche o diálogo: aviso e total atualizam; o aceite anterior deixa de valer.
5. Revise e marque novamente. A API também revalida no envio.

### Roteiro: timeout sem compra duplicada

1. Monte o carrinho e selecione Timeout após criar pedido.
2. Confirme a compra; aguarde o aviso de demora.
3. Atualize a página e clique em Recuperar tentativa.
4. O mesmo payload/chave recupera o mesmo pedido, inclusive se a cotação já venceu.

### Roteiro: isolamento

1. Com Ana, favorite uma obra, adicione item e edite o perfil.
2. Saia pelo botão de logout.
3. Entre como Bruno; favoritos, carrinho, carteiras e perfil de Ana não devem aparecer.
4. URL de pedido de Ana com Bruno deve retornar falta de permissão.

## Deploy

Incluídas configurações iniciais para Vercel (`vercel.json`) e fallback SPA de Netlify/Cloudflare (`public/_redirects`). Use:

- Build: `npm run build:demo`.
- Diretório de saída: `dist`.
- HTTPS com o arquivo `/mockServiceWorker.js` acessível.

**Nenhum deploy público foi realizado nesta etapa.** Publicar no repositório/conta de hospedagem do candidato e verificar rotas diretas, refresh, mocks e socket na URL final. `wss://kurio.mock` é interceptado pelo MSW no navegador; não é um servidor externo a contratar.

## Antes da submissão

O código, os mocks e os testes automatizados estão prontos para execução local. Ainda é responsabilidade do candidato:

1. executar Playwright e atualizar as baselines no mesmo ambiente usado para revisar o visual;
2. executar as 12 medições do Lighthouse e manter os relatórios HTML/JSON gerados;
3. publicar o build demo e verificar refresh, rotas diretas, MSW e Socket.IO na URL pública;
4. substituir as ilustrações de demonstração pelos exports oficiais, se eles forem disponibilizados;
5. enviar o repositório com o lockfile e a URL pública correspondentes ao mesmo commit.

As decisões técnicas estão em `ARCHITECTURE.md`, os contratos em `docs/API.md` e os tokens em `docs/DESIGN_TOKENS.md`.
