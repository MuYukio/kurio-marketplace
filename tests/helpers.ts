import { expect, type Page } from '@playwright/test';

/** Espelha o breakpoint (max-width: 700px): header e rodapé dão lugar à navegação mobile. */
export function isCompact(page: Page) {
  return (page.viewportSize()?.width ?? 1440) <= 700;
}
const DEMO_ACTIONS: Record<string, string> = {
  'Alterar preço': 'price',
  'Esgotar edição': 'sold-out',
  'Duplicar evento': 'duplicate',
  'Evento antigo': 'old-event',
  'Expirar sessão': 'expire',
  'Resolver pendentes': 'resolve',
};
/**
 * No viewport compacto o laboratório (rodapé) não existe nas telas imersivas. Os mesmos endpoints
 * REST do laboratório são chamados pela rede do navegador e tratados pelo MSW; o cliente
 * Socket.IO continua recebendo os eventos normalmente.
 */
async function demoPost(page: Page, path: string, data?: unknown) {
  await expect(page.locator('#conteudo')).toHaveAttribute('data-realtime', 'connected');
  const status = await page.evaluate(
    async ({ path, data }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('kurio.session');
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/demo/${path}`, {
        method: 'POST',
        headers,
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      return response.status;
    },
    { path, data },
  );
  expect(status, `POST /api/demo/${path}`).toBe(200);
}
export async function ready(page: Page) {
  await page.goto('/');
  // The result counter is intentionally hidden in some responsive layouts.
  // Wait for a catalog item that is visible in every project instead.
  await expect(page.getByRole('link', { name: 'Ver Emerald Ape #042' })).toBeVisible();
}
export async function login(page: Page, email = 'ana@kurio.test') {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('Kurio123!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  // O botão de logout do cabeçalho não existe em todas as telas mobile; o token é o sinal comum.
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('kurio.session'))).toBe(true);
  if (!isCompact(page))
    await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
}
export async function logout(page: Page) {
  // Mobile: o cabeçalho não aparece nessas telas; o logout fica na navegação da conta.
  if (isCompact(page)) {
    await page.goto('/perfil');
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: 'Sair da conta' }).click();
}
export async function expectLoggedIn(page: Page) {
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('kurio.session'))).toBe(true);
}
export async function expectLoggedOut(page: Page) {
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('kurio.session'))).toBe(false);
}
export async function addFirst(page: Page) {
  await page.goto('/mercado/nft-1');
  await page.getByRole('button', { name: /^COMPRAR$|^Comprar NFT$/ }).click();
  await expect(page).toHaveURL(/\/cart$/);
}
export async function scenario(page: Page, value: string) {
  if (isCompact(page)) return demoPost(page, 'scenario', { scenario: value });
  await page.getByRole('button', { name: 'Cenários de demonstração' }).click();
  await page.getByLabel('Cenário de rede').selectOption(value);
  await expect(page.getByText('Ação aplicada à simulação.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar diálogo' }).click();
}
export async function action(page: Page, name: string) {
  if (isCompact(page)) {
    return demoPost(page, 'action', { action: DEMO_ACTIONS[name], nftId: 'nft-1' });
  }
  await page.getByRole('button', { name: 'Cenários de demonstração' }).click();
  await expect(page.getByText('Socket.IO: conectado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByText('Ação aplicada à simulação.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar diálogo' }).click();
}
export async function checkout(page: Page) {
  await page.goto('/pagamento');
  await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click();
  await expect(page.getByText('Carteira conectada na simulação.', { exact: true })).toBeVisible();
}
export async function submitOrder(page: Page) {
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Revise sua compra' })).toBeVisible();
  await page.getByLabel('Revisei os itens, a rede e o total desta cotação.').check();
  await page.getByRole('button', { name: 'Enviar pedido', exact: true }).click();
}
