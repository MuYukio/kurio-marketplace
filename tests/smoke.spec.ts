import { test, expect } from '@playwright/test';
import {
  ready,
  login,
  addFirst,
  checkout,
  submitOrder,
  action,
  scenario,
  isCompact,
} from './helpers';
test('catálogo REST e socket conectados', async ({ page }) => {
  await ready(page);
  if (isCompact(page)) {
    await expect(page.locator('#conteudo')).toHaveAttribute('data-realtime', 'connected');
    return;
  }
  await page.getByRole('button', { name: 'Cenários de demonstração' }).click();
  await expect(page.getByText('Socket.IO: conectado', { exact: true })).toBeVisible();
});
test('compra completa e recibo persistente', async ({ page }) => {
  await ready(page);
  await addFirst(page);
  await login(page);
  await checkout(page);
  await submitOrder(page);
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  const id = await page.getByTestId('order-id').innerText();
  await page.reload();
  await expect(page.getByTestId('order-id')).toHaveText(id);
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible();
  await page.goto('/cart');
  await expect(
    page.getByRole('heading', { name: 'Seu carrinho está esperando uma descoberta' }),
  ).toBeVisible();
});
test('preço atualizado pelo Socket.IO exige novo aceite', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await checkout(page);
  await action(page, 'Alterar preço');
  await expect(
    page.getByText('Preço ou disponibilidade atualizados. Revise o carrinho antes de comprar.'),
  ).toBeVisible();
  await expect(page.locator('.checkout-quote .summary-total dd')).toHaveText('1,293 ETH');
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click();
  await page.getByLabel('Revisei os itens, a rede e o total desta cotação.').check();
  await expect(page.getByRole('button', { name: 'Enviar pedido', exact: true })).toBeEnabled();
});
test('timeout recupera a mesma tentativa', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await scenario(page, 'timeout');
  await checkout(page);
  await submitOrder(page);
  await expect(page.locator('.checkout-attempt').getByRole('alert')).toContainText(
    'A resposta demorou.',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Recuperar tentativa', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('.receipt-totals').getByText('1,193 ETH', { exact: true }),
  ).toBeVisible();
});
