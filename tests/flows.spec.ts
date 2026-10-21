import { test, expect } from '@playwright/test';
import {
  ready,
  expectLoggedOut,
  isCompact,
  login,
  logout,
  addFirst,
  checkout,
  submitOrder,
  action,
  scenario,
} from './helpers';

test('busca, filtros combinados, URL e histórico', async ({ page, isMobile }) => {
  await ready(page);
  if (isMobile) await page.getByRole('button', { name: 'Abrir filtros', exact: true }).click();
  await page.getByRole('button', { name: /^Arte digital/ }).click();
  await page.getByRole('checkbox', { name: 'Ethereum', exact: true }).check();
  if (isMobile) await page.getByRole('button', { name: 'Ver resultados', exact: true }).click();
  await expect(page.locator('.nft-card')).toHaveCount(4);
  await expect(page).toHaveURL(/category=Arte/);
  await page.reload();
  await expect(page.locator('.nft-card')).toHaveCount(4);
  if (isMobile) {
    await page.getByLabel('Explorar coleções').fill('Emerald');
    await page.getByLabel('Explorar coleções').press('Enter');
  } else {
    await page.getByRole('button', { name: 'Buscar no mercado', exact: true }).click();
    await page.getByLabel('Buscar NFTs').fill('Emerald');
    await page
      .locator('#header-search-panel')
      .getByRole('button', { name: 'Buscar', exact: true })
      .click();
  }
  // Mobile: a busca combina com os filtros ativos (1 resultado). Desktop/tablet: a busca do
  // cabeçalho inicia uma nova pesquisa sem os filtros (3 resultados).
  await expect(page.locator('.nft-card')).toHaveCount(isMobile ? 1 : 3);
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.nft-card')).toHaveCount(4);
});

test('paginação, ordenação e detalhe inexistente', async ({ page, isMobile }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Página 2', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir filtros', exact: true }).click();
    await page.getByLabel('Ordenar resultados').selectOption('price-asc');
    await page.getByRole('button', { name: 'Ver resultados', exact: true }).click();
  } else {
    await page.getByLabel('Ordenar NFTs').selectOption('price-asc');
  }
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).not.toHaveURL(/page=2/);
  await page.goto('/mercado/inexistente');
  await expect(
    page.getByRole('heading', { name: 'NFT não encontrado', exact: true }),
  ).toBeVisible();
});

test('detalhe permite galeria, edição, limite, abas e compra', async ({ page, isMobile }) => {
  await ready(page);
  await page.goto('/mercado/nft-1');
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible();

  const uniqueEdition = page.getByRole('radio', { name: '1/1', exact: true });
  await uniqueEdition.click();
  await expect(uniqueEdition).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();

  if (isMobile) {
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await expect(page.getByText('Obra adicionada ao carrinho.', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/mercado\/nft-1$/);
  } else {
    const imageTwo = page.getByRole('button', { name: 'Ver imagem 2', exact: true });
    await imageTwo.click();
    await expect(imageTwo).toHaveAttribute('aria-pressed', 'true');

    const zoom = page.getByRole('button', { name: 'Ampliar imagem', exact: true });
    await zoom.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(zoom).toBeFocused();

    await page.getByRole('tab', { name: /Avaliações de colecionadores/ }).click();
    await expect(page.getByText('Colecionador verificado', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click();
    await expect(page).toHaveURL(/\/cart$/);
  }
});

test('favorito otimista com rollback e persistência', async ({ page }) => {
  await ready(page);
  await login(page);
  await page.goto('/mercado/nft-1');
  await scenario(page, 'favorite-error');
  const button = page.getByRole('button', { name: 'Adicionar aos favoritos', exact: true });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('Falha simulada');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click();
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('carrinho visitante, cupom, quantidade e refresh', async ({ page }) => {
  await ready(page);
  await addFirst(page);
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Aumentar Emerald Ape #042' }).click();
  await page.getByLabel('Cupom de desconto').fill('KURIO10');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByText('2,145 ETH', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('2,145 ETH', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover cupom', exact: true }).click();
  await expect(page.getByText('2,383 ETH', { exact: true })).toBeVisible();
  await page.getByLabel('Cupom de desconto').fill('EXPIRED');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Este cupom expirou.');
});

test('remoção do carrinho oferece desfazer', async ({ page }) => {
  await ready(page);
  await addFirst(page);
  await page.getByRole('button', { name: 'Remover Emerald Ape #042', exact: true }).click();
  await expect(
    page.getByText('Emerald Ape #042 removido do carrinho.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', exact: true, level: 2 }),
  ).toBeVisible();
});

test('rotas canônicas em português aceitam acesso direto', async ({ page, isMobile }) => {
  await ready(page);
  await page.goto('/carrinho');
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está esperando uma descoberta' }),
  ).toBeVisible();
  await page.goto('/cadastro');
  // Desktop abre a autenticação como modal; até 700 px ela é uma tela dedicada.
  await expect(
    isMobile
      ? page.getByRole('heading', { name: 'Criar perfil de colecionador', exact: true })
      : page.getByRole('dialog', { name: 'Criar perfil de colecionador', exact: true }),
  ).toBeVisible();
  await login(page);
  await page.goto('/perfil');
  await expect(page.getByLabel('Nome de exibição*', { exact: true })).toBeVisible();
  await page.goto('/perfil/carteiras');
  await expect(
    page.getByRole('heading', { name: 'Carteira principal', exact: true }),
  ).toBeVisible();
});

test('sessão expirada no checkout retoma sem perder carrinho', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await checkout(page);
  await action(page, 'Expirar sessão');
  await page.reload();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.test');
  await page.getByLabel('Senha', { exact: true }).fill('Kurio123!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/pagamento|checkout/);
  await expect(page.getByRole('button', { name: 'Conectar carteira', exact: true })).toBeVisible();
});

test('logout e troca de conta isolam favoritos e carrinho', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await page.goto('/mercado/nft-1');
  await page.getByRole('button', { name: 'Adicionar aos favoritos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remover dos favoritos', exact: true }),
  ).toBeVisible();
  await logout(page);
  await expectLoggedOut(page);
  await login(page, 'bruno@kurio.test');
  await page.goto('/cart');
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está esperando uma descoberta' }),
  ).toBeVisible();
  await page.goto('/mercado/nft-1');
  await expect(
    page.getByRole('button', { name: 'Adicionar aos favoritos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
});

test('pagamento recusado mantém itens', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await scenario(page, 'declined');
  await checkout(page);
  await submitOrder(page);
  await expect(page.getByRole('heading', { name: 'Pagamento recusado', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('link', { name: 'Voltar ao carrinho', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible();
});

test('pagamento exige conexão e revisão final', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await page.goto('/pagamento');
  const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByRole('button', { name: 'Simular recusa', exact: true }).click();
  await expect(page.getByText('Conexão recusada. Você pode tentar novamente.')).toBeVisible();
  await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click();
  await expect(page.getByText('Carteira conectada na simulação.', { exact: true })).toBeVisible();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  const send = page.getByRole('button', { name: 'Enviar pedido', exact: true });
  await expect(send).toBeDisabled();
  await page.getByLabel('Revisei os itens, a rede e o total desta cotação.').check();
  await expect(send).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(confirm).toBeFocused();
});

test('perfil e carteira persistem com validação e foco do diálogo', async ({ page }) => {
  await ready(page);
  await login(page);
  await page.goto('/profile');
  await page.getByLabel('Nome de exibição*', { exact: true }).fill('Ana Teste');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Perfil atualizado.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome de exibição*', { exact: true })).toHaveValue('Ana Teste');
  await page.goto('/wallets');
  const reserveCard = page
    .getByRole('heading', { name: 'nova.kurio.eth', exact: true })
    .locator('..');
  const trigger = reserveCard.getByRole('button', { name: 'Editar carteira', exact: true });
  await trigger.click();
  const walletDialog = page.getByRole('dialog', { name: 'Editar carteira secundária' });
  await walletDialog.getByLabel('Endereço da carteira*', { exact: true }).fill('inválido');
  await walletDialog.getByRole('button', { name: 'Salvar carteira', exact: true }).click();
  await expect(
    walletDialog.getByText('Endereço inválido para esta rede', { exact: true }),
  ).toBeVisible();
  await walletDialog
    .getByLabel('Endereço da carteira*', { exact: true })
    .fill('0x3333333333333333333333333333333333333333');
  await walletDialog.getByRole('button', { name: 'Salvar carteira', exact: true }).click();
  await expect(walletDialog).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'nova.kurio.eth', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'nova.kurio.eth', exact: true })).toBeVisible();
});

test('usuário autenticado não fica preso no login e badge conta NFTs distintos', async ({
  page,
  isMobile,
}) => {
  await ready(page);
  await login(page);
  await page.goto('/');
  await page.goto('/login?returnTo=%2Flogin');
  await expect(page).not.toHaveURL(/\/login/);
  if (!isMobile) await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();

  await page.goto('/mercado/nft-1');
  if (isMobile) {
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click();
    await page.goto('/mercado/nft-1');
    await page.getByRole('button', { name: 'COMPRAR', exact: true }).click();
  }
  if (isMobile) {
    // O detalhe mobile não tem cabeçalho nem navegação inferior: confere o badge no Início.
    await page.goto('/');
    await expect(
      page
        .getByRole('navigation', { name: 'Navegação principal mobile' })
        .getByRole('link', { name: 'Carrinho, 1 item' }),
    ).toBeVisible();
  } else {
    await expect(page.getByRole('link', { name: 'Carrinho, 1 item' }).first()).toBeVisible();
  }
});

test('navegação inferior mobile expõe início mercado carrinho e conta', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Componente exclusivo do viewport mobile.');
  await ready(page);
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navegação principal mobile' });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Início' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Explorar mercado' })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Carrinho/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Entrar' })).toBeVisible();
});

test('cadastro mobile volta ao modal desktop após redimensionar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'O próprio teste controla os dois viewports.');
  await ready(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/register');
  await expect(
    page.getByRole('heading', { name: 'Criar perfil de colecionador', exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 1000 });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('carrinho mobile não exibe o footer desktop', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Composição exclusiva do viewport mobile.');
  await ready(page);
  await addFirst(page);
  await page.goto('/cart');
  await expect(page.locator('.site-footer')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carrinho de NFTs' })).toBeVisible();
});

test('rede lenta exibe skeleton, layout não tem overflow', async ({ page }) => {
  await ready(page);
  await scenario(page, 'slow');
  await page.goto('/mercado/nft-1');
  await expect(
    page.getByRole('status', { name: 'Carregando conteúdo', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test('diálogo devolve foco e fecha com Escape', async ({ page }) => {
  await ready(page);
  // O laboratório fica no rodapé (oculto no mobile); o drawer de filtros é o diálogo equivalente.
  const trigger = isCompact(page)
    ? page.getByRole('button', { name: 'Abrir filtros', exact: true })
    : page.getByRole('button', { name: 'Cenários de demonstração' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('login alterna senha e ações auxiliares não simulam sucesso', async ({ page }) => {
  await ready(page);
  await page.goto('/login');
  const password = page.getByLabel('Senha', { exact: true });
  await password.fill('Kurio123!');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Continuar com Google', exact: true }).click();
  await expect(
    page.getByText('Login com Google não está disponível nesta demonstração.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/login/);
});
