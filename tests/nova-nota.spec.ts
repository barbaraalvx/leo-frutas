import { expect, test } from '@playwright/test';
import { abrirApp, cartao, total } from './ajudantes';

test.beforeEach(async ({ page }) => abrirApp(page));

test('ajuste manual: marca, não recalcula e volta ao calculado', async ({ page }) => {
  await cartao(page, 'Maçã verde').click();
  await page.keyboard.type('1,2');
  const valor = page.getByLabel('Valor de Maçã verde');
  await valor.fill('26,00');
  await valor.press('Enter');

  await expect(page.getByText('ajustado', { exact: true })).toBeVisible();
  await expect(total(page)).toHaveText('R$ 26,00');
  await expect(page.getByText('calculado R$ 26,40')).toBeVisible();

  // Mudar o peso não mexe no valor ajustado; mostra o calculado novo.
  await page.getByLabel('Peso de Maçã verde em kg').fill('1,5');
  await expect(total(page)).toHaveText('R$ 26,00');
  await expect(page.getByText('calculado R$ 33,00')).toBeVisible();

  await page.getByRole('button', { name: 'voltar ao calculado' }).click();
  await expect(total(page)).toHaveText('R$ 33,00');
  await expect(page.getByText('ajustado', { exact: true })).toBeHidden();
});

test('preço só desta nota', async ({ page }) => {
  await cartao(page, 'Melancia').click();
  await page.getByRole('button', { name: /Preço unitário de Melancia/ }).click();
  const preco = page.getByLabel('Preço unitário de Melancia');
  await expect(preco).toBeFocused();
  await preco.fill('20');
  await preco.press('Enter');
  await expect(total(page)).toHaveText('R$ 20,00');
  // O cartão continua com o preço da planilha.
  await expect(cartao(page, 'Melancia')).toContainText('R$ 22,00');
});

test('produto sem preço pede o preço e bloqueia Gerar nota', async ({ page }) => {
  await page.getByRole('tab', { name: 'Verduras e legumes' }).click();
  await expect(cartao(page, 'Alface')).toContainText('definir preço');
  await cartao(page, 'Alface').click();

  const preco = page.getByLabel('Preço unitário de Alface');
  await expect(preco).toBeFocused();
  const gerar = page.getByRole('button', { name: 'Gerar nota' });
  await expect(gerar).toBeDisabled();

  await page.keyboard.type('3');
  await page.keyboard.press('Enter');
  await expect(total(page)).toHaveText('R$ 3,00');
  await expect(gerar).toBeEnabled();
});

test('contador − / + e remover', async ({ page }) => {
  await cartao(page, 'Laranja pêra').click();
  await page.getByRole('button', { name: 'Mais 1 Laranja pêra' }).click();
  await page.getByRole('button', { name: 'Mais 1 Laranja pêra' }).click();
  await expect(total(page)).toHaveText('R$ 1,50');
  await page.getByRole('button', { name: 'Menos 1 Laranja pêra' }).click();
  await expect(total(page)).toHaveText('R$ 1,00');
  await expect(cartao(page, 'Laranja pêra')).toContainText('2');

  await page.getByRole('button', { name: 'Remover Laranja pêra' }).click();
  await expect(total(page)).toHaveText('R$ 0,00');
  await expect(page.getByRole('button', { name: 'Gerar nota' })).toBeDisabled();
});

test('busca sem acento procura em todas as categorias', async ({ page }) => {
  const busca = page.getByPlaceholder('Buscar produto…');
  await busca.fill('maca');
  const cartoes = page.locator('.cartao-produto');
  await expect(cartoes).toHaveCount(2);
  await expect(cartoes.nth(0)).toContainText('Maçã');
  await expect(cartoes.nth(1)).toContainText('Maçã verde');

  await busca.fill('cebola');
  await expect(cartoes).toHaveCount(2);
  await expect(page.getByRole('tab', { selected: true })).toHaveCount(0);

  await busca.fill('xyz');
  await expect(page.getByText('Nenhum produto encontrado para “xyz”.')).toBeVisible();
});

test('limpar pede confirmação', async ({ page }) => {
  await cartao(page, 'Melancia').click();
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await page.getByRole('button', { name: 'Não' }).click();
  await expect(total(page)).toHaveText('R$ 22,00');

  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await page.getByRole('button', { name: 'Sim, limpar' }).click();
  await expect(total(page)).toHaveText('R$ 0,00');
});

test('rascunho sobrevive a recarregar a página', async ({ page }) => {
  await page.getByLabel('Cliente').fill('Dona Maria');
  await cartao(page, 'Melancia').click();
  await page.reload();
  await expect(page.getByLabel('Cliente')).toHaveValue('Dona Maria');
  await expect(total(page)).toHaveText('R$ 22,00');
});

test('sem internet a nota continua na tela e dá para tentar de novo', async ({ page }) => {
  await cartao(page, 'Melancia').click();
  await page.evaluate(() => window.__apiSimulada!.definirOffline(true));
  await page.getByRole('button', { name: 'Gerar nota' }).click();

  await expect(page.getByRole('alert')).toContainText('Sem conexão');
  await expect(total(page)).toHaveText('R$ 22,00');

  await page.evaluate(() => window.__apiSimulada!.definirOffline(false));
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.getByText('Nota 0001 salva na planilha')).toBeVisible();
});

test.describe('tablet em pé / celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('nota vira gaveta com total e Ver nota', async ({ page }) => {
    await cartao(page, 'Melancia').click();
    const gaveta = page.locator('.gaveta');
    await expect(gaveta).toContainText('1 item');
    await expect(gaveta).toContainText('R$ 22,00');
    await expect(page.getByRole('button', { name: 'Gerar nota' })).toBeHidden();

    await page.getByRole('button', { name: 'Ver nota' }).click();
    await expect(page.getByRole('button', { name: 'Gerar nota' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar nota' }).click();

    // kg abre a gaveta sozinho para digitar o peso.
    await cartao(page, 'Kiwi').click();
    await expect(page.getByLabel('Peso de Kiwi em kg')).toBeFocused();

    // Sem rolagem horizontal.
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(390);
  });
});
