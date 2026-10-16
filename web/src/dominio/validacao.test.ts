import { describe, expect, it } from 'vitest';
import { proximoIdProduto, validarAlteracaoProduto, validarItens } from './validacao';
import type { ItemNota } from './tipos';

const item = (extra: Partial<ItemNota> = {}): ItemNota => ({
  produto_id: 'p_0003',
  produto_nome: 'Maçã verde',
  tipo_venda: 'kg',
  quantidade: 1200,
  preco_unitario: 2200,
  valor_calculado: 2640,
  valor_final: 2600,
  ajustado: true,
  ...extra,
});

describe('validarItens', () => {
  it('soma os valores finais', () => {
    expect(validarItens([item(), item({ valor_final: 2640, ajustado: false })])).toBe(5240);
  });

  it.each([
    ['sem itens', []],
    ['não é lista', 'x'],
    ['tipo inválido', [item({ tipo_venda: 'litro' as never })]],
    ['quantidade quebrada em caixa', [item({ tipo_venda: 'caixa', quantidade: 1500, valor_calculado: 3300 })]],
    ['preço com fração de centavo', [item({ preco_unitario: 22.5 })]],
    ['valor final negativo', [item({ valor_final: -1 })]],
    ['ajustado não booleano', [item({ ajustado: 'sim' as never })]],
    ['calculado não confere', [item({ valor_calculado: 9999 })]],
  ])('recusa: %s', (_, itens) => {
    expect(() => validarItens(itens)).toThrow();
  });
});

describe('validarAlteracaoProduto', () => {
  const base = { nome: 'Pêssego', categoria: 'Frutas' as const, tipo_venda: 'kg' as const, preco: null, ativo: true, ordem: 1 };

  it('aceita produto válido, com ou sem preço', () => {
    expect(() => validarAlteracaoProduto(base)).not.toThrow();
    expect(() => validarAlteracaoProduto({ ...base, preco: 1800 })).not.toThrow();
  });

  it('recusa nome vazio, categoria e tipo desconhecidos', () => {
    expect(() => validarAlteracaoProduto({ ...base, nome: '  ' })).toThrow('sem nome');
    expect(() => validarAlteracaoProduto({ ...base, categoria: 'Grãos' as never })).toThrow('Categoria');
    expect(() => validarAlteracaoProduto({ ...base, tipo_venda: 'maço' as never })).toThrow('Tipo');
  });
});

describe('proximoIdProduto', () => {
  it('maior número + 1, ignorando ids fora do padrão', () => {
    expect(proximoIdProduto(['p_0001', 'p_0024', 'p_0007'])).toBe('p_0025');
    expect(proximoIdProduto(['p_0001', 'manual'])).toBe('p_0002');
    expect(proximoIdProduto([])).toBe('p_0001');
  });
});
