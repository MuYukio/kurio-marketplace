import { test, expect } from '@playwright/test';
import {
  ready,
  login,
  logout,
  expectLoggedIn,
  addFirst,
  checkout,
  submitOrder,
  action,
} from './helpers';

test('eventos duplicados e antigos não invalidam novamente o aceite', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await checkout(page);
  await action(page, 'Alterar preço');
  await action(page, 'Duplicar evento');
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled();
  await action(page, 'Evento antigo');
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled();
  await expect(page.locator('.checkout-quote .summary-total dd')).toHaveText('1,293 ETH');
});

test('pedido pendente se recupera após interrupção do socket', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await checkout(page);
  await submitOrder(page);
  await expect(
    page.getByRole('heading', { name: 'Pedido em processamento', exact: true }),
  ).toBeVisible();
  const id = await page.getByTestId('order-id').innerText();
  await page.evaluate(async () => {
    const response = await fetch('/api/demo/disconnect', { method: 'POST' });
    if (!response.ok) throw new Error('Não foi possível interromper o socket da demonstração.');
  });
  await page.reload();
  await expect(
    page.getByRole('heading', {
      name: 'Seus NFTs agora estão na sua carteira',
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('order-id')).toHaveText(id);
});

test('cadastro trata conflito e cria uma conta persistente', async ({ page }) => {
  await ready(page);
  await page.goto('/register');
  await page.getByLabel('Nome de usuário').fill('Nova Pessoa');
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.test');
  await page.getByLabel('Senha', { exact: true }).fill('Teste123!');
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Teste123!');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page.getByText('E-mail já cadastrado', { exact: true })).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill('nova@kurio.test');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(page).not.toHaveURL(/register/);
  await page.goto('/profile');
  await expect(page.getByLabel('Nome de exibição*', { exact: true })).toHaveValue('Nova Pessoa');
  await page.reload();
  await expect(page.getByLabel('E-mail*', { exact: true })).toHaveValue('nova@kurio.test');
});

test('senha validada e avatar sobrevivem ao refresh', async ({ page }) => {
  await ready(page);
  await login(page);
  await page.goto('/profile');
  await page.getByLabel('Enviar avatar').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Perfil atualizado.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible();
  await page.getByLabel('Senha atual', { exact: true }).fill('incorreta');
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123!');
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha123!');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('#current-error')).toHaveText('Senha atual incorreta');
  await page.getByLabel('Senha atual', { exact: true }).fill('Kurio123!');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Senha atualizada.', { exact: true })).toBeVisible();
  await logout(page);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.test');
  await page.getByLabel('Senha', { exact: true }).fill('NovaSenha123!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).not.toHaveURL(/login/);
  await expectLoggedIn(page);
});
