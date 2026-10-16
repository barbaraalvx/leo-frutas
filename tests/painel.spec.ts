import { expect, test, type Page } from '@playwright/test';
import type { ItemNota, TipoVenda } from '../web/src/dominio/tipos';
import { abrirApp, salvarNotaDireto } from './ajudantes';

const em = (dataHora: string) => new Date(`${dataHora}-03:00`);

function item(produto_id: string, produto_nome: string, tipo_venda: TipoVenda, quantidade: number, preco: number): ItemNota {
  const valor = Math.floor((quantidade * preco + 500) / 1000);
  return {
    produto_id, produto_nome, tipo_venda, quantidade, preco_unitario: preco,
    valor_calculado: valor, valor_final: valor, ajustado: false,
  };
}

const morango = (caixas: number) => item('p_0006', 'Morango', 'caixa', caixas * 1000, 6000);
const macaVerde = item('p_0003', 'Maçã verde', 'kg', 1200, 2200);
const melancia = item('p_0010', 'Melancia', 'peca', 1000, 2200);

const indicador = (page: Page, rotulo: string) => page.locator('.indicador').filter({ hasText: rotulo });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(em('2026-10-15T10:00:00'));
  await abrirApp(page);
  await salvarNotaDireto(page, 'Ontem', [morango(2)]); // R$ 120,00
  await page.clock.setFixedTime(em('2026-10-16T09:00:00'));
  await salvarNotaDireto(page, 'Hoje 1', [macaVerde, melancia]); // R$ 48,40
  await salvarNotaDireto(page, 'Hoje 2', [morango(1)]); // R$ 60,00
  const cancelada = await salvarNotaDireto(page, 'Cancelada', [morango(10)]);
  await page.evaluate((n) => window.__apiSimulada!.cancelarNota(n, 'teste'), cancelada);
  await page.clock.setFixedTime(em('2026-10-16T12:00:00'));
  await page.getByRole('button', { name: 'Painel' }).click();
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
});

test('indicadores de hoje, sem a nota cancelada, com variação contra ontem', async ({ page }) => {
  await expect(indicador(page, 'Vendas')).toContainText('R$ 108,40');
  await expect(indicador(page, 'Vendas')).toContainText('−10% vs ontem');
  await expect(indicador(page, 'Vendas').locator('.indicador__delta--queda')).toBeVisible();

  await expect(indicador(page, 'Notas')).toContainText('2');
  await expect(indicador(page, 'Notas')).toContainText('+100% vs ontem');
  await expect(indicador(page, 'Notas').locator('.indicador__delta--alta')).toBeVisible();

  await expect(indicador(page, 'Ticket médio')).toContainText('R$ 54,20');
  await expect(indicador(page, 'Ticket médio')).toContainText('−55% vs ontem');

  await expect(indicador(page, 'Mais vendido')).toContainText('Morango');
  await expect(indicador(page, 'Mais vendido')).toContainText('R$ 60,00 · 1 caixa');
});

test('top produtos com quantidade e unidade', async ({ page }) => {
  const linhas = page.locator('.top-produtos tbody tr');
  await expect(linhas).toHaveCount(3);
  await expect(linhas.nth(0)).toHaveText(/1\s*Morango\s*1 caixa\s*R\$ 60,00/);
  await expect(linhas.nth(1)).toHaveText(/2\s*Maçã verde\s*1,200 kg\s*R\$ 26,40/);
  await expect(linhas.nth(2)).toHaveText(/3\s*Melancia\s*1 peça\s*R\$ 22,00/);
});

test('trocar o período recalcula tudo', async ({ page }) => {
  await page.getByRole('tab', { name: '7 dias' }).click();
  await expect(indicador(page, 'Vendas')).toContainText('R$ 228,40');
  await expect(indicador(page, 'Vendas')).toContainText('Nada no período anterior');
  await expect(indicador(page, 'Mais vendido')).toContainText('R$ 180,00 · 3 caixa');
  await expect(page.locator('.top-produtos tbody tr').first()).toContainText('3 caixa');
});

test('gráfico: 14 dias, valor de hoje no topo, dica ao tocar, tabela', async ({ page }) => {
  const dias = page.locator('.grafico__alvo');
  await expect(dias).toHaveCount(14);
  await expect(page.locator('.grafico__valor')).toHaveText('R$ 108,40');
  // Hoje (período) em laranja, ontem (contexto) em cinza.
  await expect(page.locator('.grafico__barra:not(.grafico__barra--contexto)')).toHaveCount(1);
  await expect(page.locator('.grafico__barra--contexto')).toHaveCount(1);

  await dias.nth(12).hover();
  await expect(page.locator('.grafico__dica')).toHaveText(/R\$ 120,00\s*qui, 15\/10/);
  await dias.nth(13).focus();
  await expect(page.locator('.grafico__dica')).toHaveText(/R\$ 108,40\s*sex, 16\/10/);

  await page.getByText('Ver em tabela').click();
  const tabela = page.locator('.grafico__tabela tbody tr');
  await expect(tabela).toHaveCount(14);
  await expect(tabela.first()).toHaveText(/sex, 16\/10\s*R\$ 108,40/);
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('indicadores em duas colunas, sem rolagem lateral', async ({ page }) => {
    await expect(indicador(page, 'Vendas')).toContainText('R$ 108,40');
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(390);
  });
});
