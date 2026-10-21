import { test, expect } from '@playwright/test';
import { ready, login, addFirst, checkout } from './helpers';
// These are starter UI baselines, not a claim of Figma fidelity.
test('@visual início', async ({ page }) => {
  await ready(page);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect(page).toHaveScreenshot('home.png', { fullPage: true, animations: 'disabled' });
});
test('@visual detalhe', async ({ page }) => {
  await ready(page);
  await page.goto('/mercado/nft-1');
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('detail.png', { fullPage: true, animations: 'disabled' });
});
test('@visual carrinho', async ({ page }) => {
  await ready(page);
  await addFirst(page);
  await page.goto('/cart');
  await expect(page.getByText('1,193 ETH', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('cart.png', { fullPage: true, animations: 'disabled' });
});
test('@visual pagamento', async ({ page }) => {
  await ready(page);
  await login(page);
  await addFirst(page);
  await checkout(page);
  // O total aparece em mais de um lugar da tela; o resumo da cotação é a referência estável.
  await expect(page.locator('.checkout-quote .summary-total dd')).toHaveText('1,193 ETH');
  await expect(page).toHaveScreenshot('checkout.png', { fullPage: true, animations: 'disabled' });
});