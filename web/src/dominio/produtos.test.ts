import { describe, expect, it } from 'vitest';
import { produtosIniciais } from '../api/dadosIniciais';
import {
  aplicarPendentes,
  filtrarProdutos,
  moverProduto,
  paraAlteracao,
  proximaOrdem,
  registrarMudanca,
} from './produtos';

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

describe('alterações pendentes (tela Preços)', () => {
  const maca = produtos.find((p) => p.nome === 'Maçã')!;

  it('guarda só o que mudou e esquece o que voltou ao original', () => {
    let pend = registrarMudanca(new Map(), maca, { preco: 1850 });
    expect(pend.get(maca.id)).toEqual({ preco: 1850 });
    pend = registrarMudanca(pend, maca, { ativo: false });
    expect(pend.get(maca.id)).toEqual({ preco: 1850, ativo: false });
    pend = registrarMudanca(pend, maca, { preco: 1700, ativo: true });
    expect(pend.has(maca.id)).toBe(false);
  });

  it('a tela mostra planilha + pendentes; o envio leva o produto inteiro', () => {
    const pend = registrarMudanca(new Map(), maca, { preco: 1850 });
    const vista = aplicarPendentes(produtos, pend);
    expect(vista.find((p) => p.id === maca.id)?.preco).toBe(1850);
    expect(produtos.find((p) => p.id === maca.id)?.preco).toBe(1700);
    expect(paraAlteracao(vista.find((p) => p.id === maca.id)!)).toEqual({
      id: maca.id, nome: 'Maçã', categoria: 'Frutas', tipo_venda: 'kg', preco: 1850, ativo: true, ordem: 2,
    });
  });

  it('mover troca a ordem com o vizinho visível', () => {
    const frutas = filtrarProdutos(produtos, 'Frutas', '');
    expect(moverProduto(frutas, maca.id, -1)).toEqual([
      { id: maca.id, ordem: 1 },
      { id: 'p_0001', ordem: 2 },
    ]);
    expect(moverProduto(frutas, 'p_0001', -1)).toBeNull();
    expect(moverProduto(frutas, frutas.at(-1)!.id, 1)).toBeNull();
  });

  it('mover desempata ordens iguais', () => {
    const lista = [
      { ...produtos[0], ordem: 5 },
      { ...produtos[1], ordem: 5 },
    ];
    expect(moverProduto(lista, produtos[1].id, -1)).toEqual([
      { id: produtos[1].id, ordem: 4 },
      { id: produtos[0].id, ordem: 5 },
    ]);
  });

  it('produto novo vai para o fim', () => {
    expect(proximaOrdem(produtos)).toBe(25);
  });
});
