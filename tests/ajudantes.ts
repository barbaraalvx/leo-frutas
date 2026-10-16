import { expect, type Page } from '@playwright/test';
import type { ItemNota } from '../web/src/dominio/tipos';

export async function abrirApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Adicionar Maçã verde', exact: true })).toBeVisible();
}

export function cartao(page: Page, nome: string) {
  return page.getByRole('button', { name: `Adicionar ${nome}`, exact: true });
}

export function total(page: Page) {
  return page.getByTestId('total-nota');
}

/** Quantidade de páginas de um PDF gerado pelo Chromium. */
export function contarPaginas(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** Grava uma nota direto na API simulada (sem clicar produto por produto). */
export async function salvarNotaDireto(page: Page, cliente: string, itens: ItemNota[]): Promise<number> {
  return page.evaluate(
    async ([c, i]) => (await window.__apiSimulada!.salvarNota({ cliente: c, itens: i })).numero,
    [cliente, itens] as const,
  );
}

/** n itens de 1,000 kg a R$ 10,00, com nomes distintos. */
export function itensDeTeste(n: number): ItemNota[] {
  return Array.from({ length: n }, (_, i) => ({
    produto_id: `p_${String(i + 1).padStart(4, '0')}`,
    produto_nome: `Produto de teste ${i + 1}`,
    tipo_venda: 'kg' as const,
    quantidade: 1000,
    preco_unitario: 1000,
    valor_calculado: 1000,
    valor_final: 1000,
    ajustado: false,
  }));
}
