import { expect, test, type Page } from '@playwright/test';
import { abrirApp, itensDeTeste, salvarNotaDireto } from './ajudantes';

const em = (dataHora: string) => new Date(`${dataHora}-03:00`);

async function abrirNotas(page: Page) {
  await page.getByRole('button', { name: 'Notas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Notas' })).toBeVisible();
}

const itens = (page: Page) => page.locator('.lista-notas__item');

test.describe('com notas de dias diferentes', () => {
  test.beforeEach(async ({ page }) => {
    // Date fixo, timers normais: a API simulada usa a data "de hoje" da página.
    await page.clock.setFixedTime(em('2026-10-01T10:00:00'));
    await abrirApp(page);
    await salvarNotaDireto(page, 'Antiga', itensDeTeste(1));
    await page.clock.setFixedTime(em('2026-10-14T10:00:00'));
    await salvarNotaDireto(page, 'Da semana', itensDeTeste(2));
    await page.clock.setFixedTime(em('2026-10-16T09:00:00'));
    await salvarNotaDireto(page, 'Mercadinho São José', itensDeTeste(3));
    await salvarNotaDireto(page, 'Dona Maria', itensDeTeste(1));
    await abrirNotas(page);
  });

  test('mais recentes primeiro e filtros de período', async ({ page }) => {
    await expect(itens(page)).toHaveCount(2);
    await expect(itens(page).nth(0)).toContainText('0004');
    await expect(itens(page).nth(0)).toContainText('Dona Maria');
    await expect(itens(page).nth(0)).toContainText('16/10/2026 09:00 · 1 item');
    await expect(itens(page).nth(1)).toContainText('R$ 30,00');

    await page.getByRole('tab', { name: '7 dias' }).click();
    await expect(itens(page)).toHaveCount(3);
    await page.getByRole('tab', { name: '30 dias' }).click();
    await expect(itens(page)).toHaveCount(4);
    await page.getByRole('tab', { name: 'Tudo' }).click();
    await expect(itens(page)).toHaveCount(4);
  });

  test('busca por cliente (sem acento) ou número', async ({ page }) => {
    await page.getByRole('tab', { name: 'Tudo' }).click();
    const busca = page.getByPlaceholder('Cliente ou número…');
    await busca.fill('sao jose');
    await expect(itens(page)).toHaveCount(1);
    await expect(itens(page)).toContainText('Mercadinho São José');
    await busca.fill('1');
    await expect(itens(page)).toHaveCount(1);
    await expect(itens(page)).toContainText('Antiga');
    await busca.fill('ninguém');
    await expect(page.getByText('Nenhuma nota encontrada para “ninguém”.')).toBeVisible();
  });

  test('abre, cancela com motivo e reimprime com a faixa CANCELADA', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Abrir nota 0003' }).click();
    await expect(page.getByRole('heading', { name: 'Nota 0003' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Nota de pedido 0003' })).toContainText('Mercadinho São José');

    await page.getByRole('button', { name: 'Cancelar nota' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Cancelar a nota 0003?' });
    await dialogo.getByLabel('Motivo (opcional)').fill('cliente desistiu');
    await dialogo.getByRole('button', { name: 'Cancelar nota' }).click();
    await expect(page.getByText('Nota 0003 cancelada')).toBeVisible();
    await expect(dialogo).toBeHidden();
    await expect(page.getByRole('button', { name: 'Cancelar nota' })).toHaveCount(0);
    await expect(page.locator('.folha__cancelada')).toHaveText('CANCELADA · cliente desistiu');

    const [aba] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Reimprimir' }).click(),
    ]);
    await expect(aba.locator('.folha__cancelada')).toContainText('CANCELADA');

    await page.getByRole('button', { name: 'Voltar' }).click();
    const cancelada = page.getByRole('button', { name: 'Abrir nota 0003, cancelada' });
    await expect(cancelada).toBeVisible();
    await expect(cancelada).toHaveClass(/lista-notas__item--cancelada/);
  });

  test('voltar do diálogo não cancela', async ({ page }) => {
    await page.getByRole('button', { name: 'Abrir nota 0004' }).click();
    await page.getByRole('button', { name: 'Cancelar nota' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Voltar' }).click();
    await expect(page.getByRole('button', { name: 'Cancelar nota' })).toBeVisible();
    await expect(page.locator('.folha__cancelada')).toHaveCount(0);
  });
});

test('mostra 50 e carrega mais', async ({ page }) => {
  await abrirApp(page);
  // Em paralelo: a API simulada responde todas juntas depois da latência.
  await page.evaluate(async () => {
    const item = {
      produto_id: 'p_0010', produto_nome: 'Melancia', tipo_venda: 'peca' as const, quantidade: 1000,
      preco_unitario: 2200, valor_calculado: 2200, valor_final: 2200, ajustado: false,
    };
    await Promise.all(
      Array.from({ length: 55 }, (_, i) => window.__apiSimulada!.salvarNota({ cliente: `Cliente ${i + 1}`, itens: [item] })),
    );
  });
  await abrirNotas(page);
  await expect(itens(page)).toHaveCount(50);
  await expect(itens(page).first()).toContainText('0055');
  await page.getByRole('button', { name: 'Carregar mais' }).click();
  await expect(itens(page)).toHaveCount(55);
  await expect(itens(page).last()).toContainText('0001');
  await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
});

test('sem notas hoje, avisa', async ({ page }) => {
  await abrirApp(page);
  await abrirNotas(page);
  await expect(page.getByText('Nenhuma nota neste período.')).toBeVisible();
});
