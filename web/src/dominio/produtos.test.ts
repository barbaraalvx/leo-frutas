import { describe, expect, it } from 'vitest';
import { produtosIniciais } from '../api/dadosIniciais';
import {
  aplicarPendentes,
  filtrarProdutos,
  paraAlteracao,
  reordenarProdutos,
  proximaOrdem,
  registrarMudanca,
} from './produtos';

const produtos = produtosIniciais();
const nomes = (lista: { nome: string }[]) => lista.map((p) => p.nome);

/** Aplica as novas ordens e devolve a lista na ordem resultante. */
function aplicarMudancas<T extends { id: string; ordem: number }>(lista: T[], mudancas: { id: string; ordem: number }[]): T[] {
  return lista
    .map((p) => ({ ...p, ordem: mudancas.find((m) => m.id === p.id)?.ordem ?? p.ordem }))
    .sort((a, b) => a.ordem - b.ordem);
}

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

  it('arrastar do fim para o começo empurra os outros uma posição', () => {
    const frutas = filtrarProdutos(produtos, 'Frutas', '');
    const ameixa = frutas.at(-1)!; // ordem 15
    const mudancas = reordenarProdutos(frutas, frutas.length - 1, 0);
    expect(mudancas).toHaveLength(15);
    expect(mudancas[0]).toEqual({ id: ameixa.id, ordem: 1 });
    expect(mudancas[1]).toEqual({ id: 'p_0001', ordem: 2 });
    const nova = aplicarMudancas(frutas, mudancas);
    expect(nomes(nova).slice(0, 3)).toEqual(['Ameixa', 'Laranja pêra', 'Maçã']);
  });

  it('só muda quem saiu do lugar', () => {
    const frutas = filtrarProdutos(produtos, 'Frutas', '');
    // Maçã (2ª) desce para a 4ª: mexe em Maçã, Maçã verde e Uva verde.
    expect(reordenarProdutos(frutas, 1, 3)).toEqual([
      { id: 'p_0003', ordem: 2 },
      { id: 'p_0004', ordem: 3 },
      { id: 'p_0002', ordem: 4 },
    ]);
  });

  it('com filtro, reaproveita as ordens visíveis e não invade as escondidas', () => {
    const verduras = filtrarProdutos(produtos, 'Verduras e legumes', ''); // ordens 16 a 24
    const mudancas = reordenarProdutos(verduras, 8, 0);
    expect(Math.min(...mudancas.map((m) => m.ordem))).toBe(16);
    expect(Math.max(...mudancas.map((m) => m.ordem))).toBe(24);
  });

  it('soltar no mesmo lugar ou fora da lista não muda nada', () => {
    const frutas = filtrarProdutos(produtos, 'Frutas', '');
    expect(reordenarProdutos(frutas, 2, 2)).toEqual([]);
    expect(reordenarProdutos(frutas, 2, 99)).toEqual([]);
  });

  it('desempata ordens iguais digitadas à mão', () => {
    const lista = [
      { ...produtos[0], ordem: 5 },
      { ...produtos[1], ordem: 5 },
      { ...produtos[2], ordem: 5 },
    ];
    expect(nomes(aplicarMudancas(lista, reordenarProdutos(lista, 2, 0)))).toEqual([
      produtos[2].nome,
      produtos[0].nome,
      produtos[1].nome,
    ]);
  });

  it('produto novo vai para o fim', () => {
    expect(proximaOrdem(produtos)).toBe(25);
  });
});
