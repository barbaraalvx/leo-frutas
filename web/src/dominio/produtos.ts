import { normalizarBusca } from './formatacao';
import type { AlteracaoProduto } from '../api/tipos';
import type { Categoria, Produto } from './tipos';

export type Aba = Categoria | 'Todos';

export const ABAS: Aba[] = ['Frutas', 'Verduras e legumes', 'Todos'];

/**
 * Produtos da grade: só ativos (a tela Preços pede também os inativos), na
 * ordem da coluna `ordem`. Com busca, procura em todas as categorias (no
 * balcão ninguém quer trocar de aba para achar).
 */
export function filtrarProdutos(
  produtos: Produto[],
  aba: Aba,
  busca: string,
  { incluirInativos = false } = {},
): Produto[] {
  const termo = normalizarBusca(busca);
  return produtos
    .filter((p) => incluirInativos || p.ativo)
    .filter((p) => (termo ? normalizarBusca(p.nome).includes(termo) : aba === 'Todos' || p.categoria === aba))
    .sort((a, b) => a.ordem - b.ordem);
}

// ---- Tela Preços (6.4): alterações pendentes até "Salvar preços" ----

/** Campos que a tela Preços pode mudar num produto existente. */
export type CamposEditaveis = Pick<Produto, 'nome' | 'categoria' | 'tipo_venda' | 'preco' | 'ativo' | 'ordem'>;

/** Alterações por id de produto, só com os campos que mudaram. */
export type Pendentes = ReadonlyMap<string, Partial<CamposEditaveis>>;

/**
 * Registra a mudança de um produto. Campo que volta ao valor da planilha
 * deixa de ser pendente; produto sem campos pendentes sai do mapa.
 */
export function registrarMudanca(
  pendentes: Pendentes,
  original: Produto,
  campos: Partial<CamposEditaveis>,
): Pendentes {
  const atual = { ...pendentes.get(original.id), ...campos };
  for (const chave of Object.keys(atual) as (keyof CamposEditaveis)[]) {
    if (atual[chave] === original[chave]) delete atual[chave];
  }
  const novo = new Map(pendentes);
  if (Object.keys(atual).length) novo.set(original.id, atual);
  else novo.delete(original.id);
  return novo;
}

/** Produtos como aparecem na tela: planilha + alterações pendentes. */
export function aplicarPendentes(produtos: Produto[], pendentes: Pendentes): Produto[] {
  return produtos.map((p) => (pendentes.has(p.id) ? { ...p, ...pendentes.get(p.id) } : p));
}

/** Formato que `salvarProdutos` recebe. */
export function paraAlteracao(p: Produto): AlteracaoProduto & { id: string } {
  const { atualizado_em: _a, ...resto } = p;
  return resto;
}

/**
 * Arrastar e soltar (tela Preços): leva o produto da posição `de` para a
 * posição `para` na lista visível. Os produtos visíveis reaproveitam os
 * mesmos valores de `ordem`, redistribuídos na nova sequência, para não
 * mexer na posição dos que estão escondidos pelo filtro. Devolve só os que
 * mudaram de ordem.
 */
export function reordenarProdutos(
  visiveis: Produto[],
  de: number,
  para: number,
): { id: string; ordem: number }[] {
  if (de === para || de < 0 || para < 0 || de >= visiveis.length || para >= visiveis.length) return [];
  const sequencia = [...visiveis];
  const [movido] = sequencia.splice(de, 1);
  sequencia.splice(para, 0, movido);

  // Ordens repetidas (digitadas à mão) deixariam a sequência ambígua: desempata.
  const ordens = visiveis.map((p) => p.ordem).sort((a, b) => a - b);
  for (let i = 1; i < ordens.length; i++) {
    if (ordens[i] <= ordens[i - 1]) ordens[i] = ordens[i - 1] + 1;
  }

  return sequencia
    .map((p, i) => ({ id: p.id, ordem: ordens[i], antes: p.ordem }))
    .filter((p) => p.ordem !== p.antes)
    .map(({ id, ordem }) => ({ id, ordem }));
}

/** Ordem de um produto novo: depois de todos. */
export function proximaOrdem(produtos: Produto[]): number {
  return produtos.reduce((m, p) => Math.max(m, p.ordem), 0) + 1;
}
