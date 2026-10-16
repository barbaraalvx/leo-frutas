import { expect, test } from '@playwright/test';
import { abrirApp, contarPaginas, itensDeTeste, salvarNotaDireto } from './ajudantes';

test.beforeEach(async ({ page }) => abrirApp(page));

test('até 25 itens cabem numa folha A4', async ({ page }) => {
  const numero = await salvarNotaDireto(page, 'Mercadinho São José', itensDeTeste(25));
  await page.goto(`/?view=nota&numero=${numero}`);
  await expect(page.locator('.folha tbody tr')).toHaveCount(25);
  const pdf = await page.pdf({ path: 'test-results/nota-25-itens.pdf', preferCSSPageSize: true });
  expect(contarPaginas(pdf)).toBe(1);
});

test('nota longa continua na página seguinte', async ({ page }) => {
  const numero = await salvarNotaDireto(page, '', itensDeTeste(45));
  await page.goto(`/?view=nota&numero=${numero}`);
  await expect(page.locator('.folha tbody tr')).toHaveCount(45);
  // Cliente vazio: a linha some.
  await expect(page.getByText('Cliente:')).toHaveCount(0);
  const pdf = await page.pdf({ path: 'test-results/nota-45-itens.pdf', preferCSSPageSize: true });
  expect(contarPaginas(pdf)).toBe(2);
});

test('número inexistente mostra erro', async ({ page }) => {
  await page.goto('/?view=nota&numero=999');
  await expect(page.getByText('Nota 999 não encontrada.')).toBeVisible();
});
