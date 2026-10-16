import { expect, test } from '@playwright/test';
import { abrirApp, cartao, contarPaginas, total } from './ajudantes';

// Nota de exemplo do README: maçã verde 1,200 kg, melancia 1, laranja pêra 20,
// morango 2 = R$ 178,40 (especificação, fase 2).
test('monta, gera e imprime a nota de exemplo', async ({ page, context }) => {
  await abrirApp(page);

  // kg: tocar no cartão põe o foco no peso.
  await cartao(page, 'Maçã verde').click();
  const peso = page.getByLabel('Peso de Maçã verde em kg');
  await expect(peso).toBeFocused();
  await page.keyboard.type('1,2');
  await expect(total(page)).toHaveText('R$ 26,40');
  await page.keyboard.press('Enter');
  await expect(peso).toHaveValue('1,200');

  await cartao(page, 'Melancia').click();
  await cartao(page, 'Laranja pêra').click();
  await page.getByLabel('Quantidade de Laranja pêra').fill('20');
  await page.keyboard.press('Enter');
  await cartao(page, 'Morango').click();
  await cartao(page, 'Morango').click();
  await expect(cartao(page, 'Morango')).toContainText('2');

  await page.getByLabel('Cliente').fill('Mercadinho São José');
  await expect(total(page)).toHaveText('R$ 178,40');

  const gerar = page.getByRole('button', { name: 'Gerar nota' });
  await gerar.click();
  await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  await expect(page.getByText('Nota 0001 salva na planilha')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nota 0001' })).toBeVisible();

  // Pré-visualização mostra a mesma folha da impressão.
  const folha = page.getByRole('article', { name: 'Nota de pedido 0001' });
  await expect(folha).toContainText('Cliente: Mercadinho São José');
  await expect(folha).toContainText('R$ 178,40');

  // Imprimir abre a nota numa aba própria.
  const [aba] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Imprimir' }).click()]);
  await aba.waitForLoadState();
  expect(new URL(aba.url()).search).toBe('?view=nota&numero=1');

  const impressa = aba.getByRole('article', { name: 'Nota de pedido 0001' });
  await expect(impressa).toContainText('LÉO FRUTAS');
  await expect(impressa).toContainText('Léo · (83) 99911-7487');
  await expect(impressa).toContainText('R. Pres. Raniere Mazilli, s/n, Box 24, CEASA');
  await expect(impressa).toContainText('João Pessoa/PB');
  await expect(impressa).toContainText('NOTA DE PEDIDO Nº 0001');
  await expect(impressa).toContainText('Documento sem valor fiscal.');
  await expect(impressa.locator('tbody tr')).toHaveCount(4);
  await expect(impressa.locator('tbody tr').first()).toHaveText(/Maçã verde\s*1,200\s*kg\s*R\$ 22,00\s*R\$ 26,40/);
  await expect(impressa.locator('.folha__total')).toHaveText(/TOTAL\s*R\$ 178,40/);
  await expect(impressa.locator('.folha__logo')).toHaveJSProperty('complete', true);

  const pdf = await aba.pdf({ path: 'test-results/nota-exemplo.pdf', preferCSSPageSize: true });
  expect(contarPaginas(pdf)).toBe(1);

  // Nova nota volta para a tela inicial, vazia.
  await page.getByRole('button', { name: 'Nova nota' }).last().click();
  await expect(total(page)).toHaveText('R$ 0,00');
  await expect(page.getByText('Toque nos produtos para montar a nota.')).toBeVisible();
});
