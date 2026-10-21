# Arquitetura — Kurio

## Objetivo e fronteiras

SPA React/TypeScript com TanStack Router, TanStack Query, Axios, REST, Socket.IO, Tailwind, componentes shadcn/ui adaptados sobre Radix, MSW e Playwright. Vite é o build. Lighthouse possui runner versionado. A arquitetura não inclui backend real, blockchain, extensão de carteira nem pagamentos reais.

O README distingue o que faz parte da aplicação e as verificações externas necessárias antes da submissão.

## Pastas

- `src/app`: bootstrap, providers, Router, QueryClient, shell e CSS global.
- `src/features`: telas/hooks agrupados por auth, catalog, favorites, cart, checkout, orders, profile, wallets e demo.
- `src/shared/contracts`: contratos e schemas Zod compartilhados.
- `src/shared/api`: Axios, erros, credenciais de simulação e geração da sessão.
- `src/shared/money`: aritmética exata em ETH/wei.
- `src/shared/realtime`: cliente Socket.IO e reconciliação.
- `src/shared/layout`: cabeçalho e rodapé globais reutilizados pelo Shell.
- `src/components/ui`: componentes shadcn/ui instalados e adaptados (Button, Dialog e Carousel).
- `src/shared/ui`: campos, feedbacks e componentes de interface específicos da aplicação.
- `src/mocks`: fixtures, persistência, serviços de negócio, handlers REST e Socket.IO.
- `tests`: fluxos E2E e regressão visual.
- `scripts`: auditoria automatizada.
- `public/assets`: quatro artes locais do catálogo em WebP, JPEG e PNG, além do favicon e worker MSW.

A estrutura contém diretórios reservados para evolução. O serviço `mocks/services/domain.ts` concentra os casos de uso nesta versão; separar por recurso é uma melhoria de manutenção, sem duplicar regras nos componentes.

## REST e estado

UI → Query/mutation → funções API → Axios → MSW → serviço → banco mock → resposta. Componentes não importam fixtures ou bancos. Todas as chamadas REST da aplicação usam Axios. A UI do laboratório também chama endpoints mock; não altera cache diretamente para simular eventos.

Contratos detalhados em `docs/API.md`. Zod valida entradas; respostas são tipadas por DTOs. Validação de runtime das respostas ainda é uma melhoria pendente. REST retorna códigos 401/403/404/409/422/503 coerentes com os cenários.

## Persistência e segurança da simulação

O banco serializado `kurio.mock.v3` em localStorage contém catálogo, contas, sessões, carrinhos, favoritos, carteiras, cotações e pedidos. É uma **simulação local por navegador e origem**. Um usuário com DevTools pode inspecionar todo o banco mock, como em qualquer fixture entregue ao cliente; a separação avaliada é a autorização dos handlers e o isolamento da interface/cache/eventos. Não apresentar isso como arquitetura segura de produção.

Senhas são armazenadas como PBKDF2/SHA-256 com salt aleatório de 16 bytes por usuário e 100.000 iterações. Os DTOs públicos omitem hash e salt. Credenciais fictícias são documentadas para avaliação. Avatar aceita PNG/JPEG/WebP até 250 KB e persiste como data URL; essa decisão simplifica refresh sem persistir URLs blob inválidas.

O banco é versionado em schema 4. Reset recria fixtures, sessões, pedidos, chaves e contexto local, e recarrega a página para liberar timers/subscriptions. A versão inicial assume uma aba ativa; coordenação transacional entre várias abas ainda não é oferecida.

## Sessão e autorização

- Token opaco da simulação persiste em `kurio.session`; o servidor mock mantém a expiração de uma hora.
- `GET /session` recupera usuário após refresh. Router verifica sessão em `beforeLoad`; os handlers autorizam toda operação privada.
- Dados privados incluem usuário na query key. Carrinho usa proprietário autenticado ou identidade visitante.
- Logout revoga sessão, incrementa geração, cancela queries, limpa cache e troca identidade visitante.
- Respostas Axios de gerações anteriores são descartadas; callbacks de favorito e carrinho verificam geração antes de alterar cache.
- Socket é recriado por sessão; mensagens privadas exigem destinatário e sessão válidos no mock e no cliente.
- 401 de expiração limpa contexto privado e encaminha ao login pela proteção da tela. A intenção pendente fica segregada por usuário para recuperação.
- `returnTo` aceita somente caminho interno começando com uma barra e rejeita `//`.

Todos os campos do pagamento, carteira, rede e provedor são preservados em sessionStorage por usuário para retomada. Ainda revisar recuperação de erros transitórios do próprio bootstrap de sessão. Não persistir senhas.

### Decisões das telas de autenticação

- Login e cadastro usam o mesmo componente e as mesmas primitivas de formulário; as rotas alteram somente o modo e o contrato enviado à API.
- As URLs canônicas do enunciado (`/carrinho`, `/cadastro`, `/perfil`, `/perfil/carteiras` e `/pedido/:id`) funcionam em acesso direto; aliases históricos em inglês permanecem por compatibilidade com links e testes anteriores.
- Em desktop, a autenticação aparece como modal sobre o shell compartilhado. Em até 700 px, torna-se uma tela dedicada e oculta o cabeçalho e o rodapé globais, conforme os frames.
- A URL interna de retorno é validada antes de navegar, preservando o fluxo interrompido sem permitir redirecionamento externo.
- Mostrar/ocultar senha é um controle acessível e não altera o valor do campo. Recuperação e provedores sociais são ações explicitamente indisponíveis na simulação e não aparentam autenticar.
- No cadastro, o valor inicial informado gera tanto o nome de exibição quanto um nome de usuário normalizado; ambos podem ser ajustados depois no perfil.

### Decisões do perfil do colecionador

- O perfil público do mock agora inclui nome de usuário, ENS e apelido da carteira. Esses campos passam pelos mesmos contratos, validação REST e persistência dos demais dados.
- Atualização do perfil e alteração opcional de senha são apresentadas como um formulário único, conforme o frame. A senha só é enviada ao endpoint específico quando algum de seus campos é preenchido.
- Login, cadastro e perfil compartilham a mesma primitiva acessível de senha visível/oculta.
- Alterar avatar aceita somente PNG/JPEG/WebP dentro do limite existente; remover grava string vazia e persiste após refresh.
- As áreas editoriais da lateral continuam explicitamente indisponíveis. Carteiras e logout são funcionais e não foram duplicados dentro da tela.
- Como não há frame mobile, o formulário usa uma coluna em até 700 px e a lateral vira uma faixa de navegação horizontal. Essa composição é uma adaptação documentada, não uma reprodução oficial do Figma.

### Decisões de carteiras

- Perfil e Carteiras reutilizam `AccountNavigation`; rotas, logout e indisponibilidade das páginas fora do escopo não são duplicados.
- A carteira mantém `name`, `network`, `role` e `address` usados pelo checkout e acrescenta os campos editoriais exigidos pelo frame. Todos passam pela API e persistência MSW.
- A carteira principal é editada no corpo da página. A secundária usa diálogo para manter a tela legível e conservar controle/restauração de foco.
- “Igual à carteira principal” reaproveita dados de perfil da principal; endereço, papel e rede continuam sujeitos às regras de conflito e validação.
- Como não existe frame mobile oficial, os campos usam uma coluna em até 700 px e preservam a mesma marcação, contratos e mutations do desktop.

## Carrinho e dinheiro

NFT+edição identifica a linha. Quantidades são inteiras. APIs entregam ETH como string decimal de até 18 casas. Cálculos usam BigInt em wei; nada de soma monetária com float. Desconto de 10% trunca frações menores que um wei na simulação. Interface formata o valor exato, e os totais vêm de `/quotes`.

Carrinho visitante é unido ao autenticado por operação idempotente. A origem é consumida e registrada para impedir dupla importação; eventuais ajustes de estoque retornam mensagens. O merge conclui antes de expor a UI autenticada.

Há reserva de estoque por pedidos pendentes. Edição do carrinho fica bloqueada enquanto há pedido pendente desse usuário. Na confirmação, o serviço consome estoque e remove exatamente as quantidades compradas uma única vez. Recusa mantém itens e libera reserva. Remoção do carrinho não é efeito colateral da renderização nem do recebimento do evento.

## Cotação, idempotência e recibo

Cotação tem ID, dono, validade de 120 segundos, versão do carrinho, linhas com versão dos NFTs, rede, cupom e totais. O checkout abre um diálogo de revisão e gera nova cotação imediatamente antes do envio. O cliente compara linhas, cupom, rede e totais; qualquer diferença fecha a revisão e exige nova confirmação. O servidor repete a verificação de versões, linhas e total antes de aceitar pedido.

Antes de enviar, o cliente persiste intenção e UUID por usuário. O header `Idempotency-Key` identifica a operação. O servidor serializa operações dos handlers; consulta chave existente antes de verificar validade da cotação. Mesmo payload retorna mesmo pedido; payload divergente com a mesma chave retorna 409.

Pedido começa pendente e passa a confirmado ou recusado. O instante de resolução é persistido. Timer e consulta REST reconciliam pedidos vencidos, permitindo refresh/reconexão. Estado terminal não é revertido. Recibo usa snapshot do pedido, incluindo carteira e cotação; alterações posteriores do catálogo não o reescrevem.

### Decisões da confirmação

- A tela usa exclusivamente o snapshot do pedido retornado pela API; nomes, imagens, quantidades, preços e taxas não são reconsultados no catálogo.
- O frame recebido representa apenas o estado confirmado desktop. Pendente e recusado mantêm feedback e recuperação já existentes, dentro da mesma superfície visual.
- A rota não renderiza o footer global. O desktop usa um recibo centralizado sobre backdrop e o mobile reorganiza a mesma marcação em uma coluna, pois não foi fornecido frame mobile.
- A referência completa fica disponível para tecnologia assistiva e no destino do link, embora a apresentação abrevie identificadores longos.
- O link do Etherscan é demonstrativo e usa a referência simulada; não implica transação real em blockchain.

Timeout acontece após persistir o pedido. O usuário recupera a mesma tentativa; não há geração automática de outra chave. O cenário é testado pelo navegador e a regra também possui testes unitários.

### Decisões da tela de pagamento

- `/pagamento` é a rota canônica; `/checkout` permanece como alias compatível.
- Desktop e mobile compartilham contrato, queries, conexão, cotação e envio. A composição muda por CSS; regras de negócio não são duplicadas.
- No desktop aparecem todos os campos do frame. No mobile eles são pré-preenchidos pelo perfil e carteira; o pedido pode ser conferido em “Ver detalhes do pedido”.
- A carteira cadastrada define a rede. Trocar rede seleciona uma carteira compatível; sem carteira compatível não há cotação nem confirmação.
- WalletConnect, MetaMask e Coinbase são provedores simulados, separados do tipo da carteira e da rede.
- A API continua sendo fonte de subtotal, desconto, taxa e total. Os valores do frame são exemplo visual, não constantes da interface.
- O pedido guarda snapshot do collector, provider, carteira e cotação. A chave idempotente é persistida antes do POST.
- Em até 700 px, o layout segue o frame mobile. Entre 701 e 1000 px, usa composição tablet de uma coluna. Playwright possui projetos em 390, 768 e 1440 px; regressão visual permanece apenas em 390/1440 como pede o enunciado.

## Tempo real

Cliente: `socket.io-client`, transporte WebSocket, namespace padrão. Mock: MSW 2.10.5 e `@mswjs/socket.io-binding` 0.2.0. Essas versões foram fixadas no lockfile. A API **instalada** usa `toSocketIo`; exemplos da branch principal podem usar outra API.

A versão MSW instalada normaliza o prefixo `/socket.io/` ao combinar o endereço. Por isso o handler usa `ws.link('wss://kurio.mock/')`, enquanto o cliente Socket.IO utiliza seu caminho padrão de transporte. O binding fornece handshake/framing; o mock complementa o heartbeat Engine.IO a cada 15 segundos e o libera no fechamento. Não há dependência de servidor remoto.

Autenticação de subscription usa evento explícito `authenticate` e resposta `ready`; não depende de ACK ou namespace personalizado. É uma autenticação simulada, não autorização de produção.

Eventos:

```ts
{
  eventId: string;
  resourceId: string;
  version: number;
  userId?: string;
  occurredAt: number;
}
```

- `nft.updated`: preço/estoque mudaram no banco; cliente reconsulta dados ativos e invalida cotação/aceite.
- `order.updated`: mock envia somente à sessão dona do pedido; UI reconcilia seu estado pela API.

Cliente guarda identidade e versão por recurso, ignora duplicatas/antigos e cancela consultas obsoletas antes de reconciliar. Conexão/reconexão reconsulta recursos ativos. Query de sessão não é cancelada por esse processo, evitando bloquear bootstrap. Listeners, assinaturas e heartbeat são liberados ao encerrar ciclo.

A primeira versão usa invalidação ampla dos recursos não relacionados à sessão para priorizar coerência; refinar para recursos afetados é melhoria pendente de eficiência. Limites: uma aba ativa, sem integração real, sem fallback long polling, sem anexos binários e sem namespaces personalizados.

## Cache e retries

- Catálogo: `['nfts', parâmetros validados]`.
- Detalhe: `['nft', id]`.
- Favoritos/perfil/carteiras/pedido: `['user', userId, recurso, id?]`.
- Carrinho: `['cart', owner]`.
- Cotação: dono/contexto, versão do carrinho, cupom, carteira/rede e revisão de evento.
- Sessão: `['session', generation]`.

staleTime padrão: 15 segundos; cotação: zero. Refetch em foco habilitado. Queries podem repetir uma vez falhas de conexão/5xx; não repetem 4xx. Mutations não têm retries cegos. Pedido pendente tem polling REST de 2 segundos como recuperação adicional, sem substituir Socket.IO.

Favoritos têm atualização otimista, snapshot, rollback e reconciliação; o controle bloqueia clique enquanto a mesma mutation está pendente. Invalidação ocorre após mutations e eventos. O `AbortSignal` do Query é passado ao Axios em GETs.

## Visual e acessibilidade

Tokens globais em `src/app/global.css`. As nove cores e a família Roboto Mono correspondem aos valores confirmados do Figma. Button usa Radix Slot/CVA, Dialog usa Radix e Carousel segue o padrão composicional shadcn com controles Button e scroll nativo acessível. O shadcn/ui não oferece uma primitiva “Navbar”; cabeçalhos e navegação inferior usam semântica `nav`, Router e os Buttons compartilhados. Documentação em `docs/DESIGN_TOKENS.md`.

### Decisões de home, carrinho e navegação

- O badge representa linhas/NFTs distintos, enquanto quantidades continuam aparecendo nos steppers e no resumo. Isso evita que uma única edição com quantidade alta pareça vários itens diferentes no navbar.
- A barra inferior existe uma única vez no Shell e é ocultada nos fluxos imersivos que já possuem controles próprios, como detalhe, autenticação, pagamento e recibo.
- Usuário com sessão ativa que acessa `/login` ou `/register` é redirecionado ao retorno seguro; retornos para as próprias rotas de autenticação são normalizados para `/profile`.
- Home desktop recebe banners e conteúdo editorial; no mobile, busca, hero compacto e grid assimétrico seguem os frames. As artes fornecidas foram copiadas como assets locais, sem recortar screenshots da interface.
- O carrinho mantém as mesmas mutations e cotação REST, mas usa stepper acessível e um Carousel reutilizável para recomendados. Desktop e mobile compartilham a marcação e as regras.
- O footer usa a mesma largura máxima e gutters do conteúdo principal.

Há labels, erros associados, foco visível, skip link, diálogo com contenção/restauração de foco, mensagens de estado e skeleton com reduced motion. Ainda é necessária revisão completa contra todos os frames, contraste/zoom e navegação assistiva.

### Decisões da tela de detalhe

- `/mercado/$nftId` é a rota canônica; `/nfts/$nftId` permanece como alias compatível.
- Cabeçalho e rodapé continuam componentes globais únicos. No detalhe mobile eles são ocultados porque o frame usa controles sobre a arte e barra de compra fixa.
- Desktop e mobile compartilham consulta, edição, quantidade, favorito e mutations; apenas a composição responsiva muda.
- A edição exclusiva usa `1/1`, corrigindo a etiqueta inconsistente do texto auxiliar. O limite deriva da disponibilidade retornada pela API.
- O zoom usa `Dialog`, devolve o foco ao gatilho e fecha por `Escape`. As opções de edição usam semântica de radio group e o stepper mantém input numérico rotulado.
- O texto curto aparece no resumo e o texto completo na aba “Detalhes”, evitando duplicar conteúdo artificialmente.
- Compartilhamento usa URLs reais de e-mail, LinkedIn e X; nenhuma ação fora do escopo exibe sucesso falso.
- A ilustração principal é servida como WebP local. Sua substituição futura não altera o contrato do NFT.

## Evidências

Testes de domínio verificam regras diretamente. E2E usam aplicação completa servida a partir do build demo, REST pelos handlers MSW e eventos pelo Socket.IO. Cada teste recebe contexto de navegador novo; fixtures iniciais são determinísticas. Não há `page.route().fulfill()` substituindo MSW nem setters de UI simulando eventos.

As baselines versionadas registram a UI esperada e precisam ser revisadas quando houver mudança visual intencional. Lighthouse usa o build completo e os assets efetivamente entregues.
