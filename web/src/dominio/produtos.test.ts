import { describe, expect, it } from 'vitest';
import { produtosIniciais } from '../api/dadosIniciais';
import { filtrarProdutos } from './produtos';

const produtos = produtosIniciais();
const nomes = (lista: { nome: string }[]) => lista.map((p) => p.nome);

describe('filtrarProdutos', () => {
  it('aba filtra por categoria', () => {
    expect(filtrarProdutos(produtos, 'Frutas', '')).toHaveLength(15);
    expect(filtrarProdutos(produtos, 'Verduras e legumes', '')).toHaveLength(9);
    expect(filtrarProdutos(produtos, 'Todos', '')).toHaveLength(24);
  });

  it('"maca" encontra Maçã e Maçã verde', () => {
    expect(nomes(filtrarProdutos(produtos, 'Frutas', 'maca'))).toEqual(['Maçã', 'Maçã verde']);
  });

  it('busca ignora a aba', () => {
    expect(nomes(filtrarProdutos(produtos, 'Frutas', 'CEBOLA'))).toEqual(['Cebola branca', 'Cebola roxa']);
  });

  it('esconde inativos e respeita a ordem', () => {
    const lista = produtos.map((p) => ({ ...p }));
    lista.find((p) => p.nome === 'Kiwi')!.ativo = false;
    lista.find((p) => p.nome === 'Melancia')!.ordem = 0;
    const r = nomes(filtrarProdutos(lista, 'Frutas', ''));
    expect(r).not.toContain('Kiwi');
    expect(r[0]).toBe('Melancia');
  });
});
