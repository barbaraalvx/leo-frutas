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
 * Sobe (−1) ou desce (+1) um produto na lista visível, trocando a `ordem`
 * com o vizinho. Devolve as novas ordens, ou null se já está na ponta.
 */
export function moverProduto(
  visiveis: Produto[],
  id: string,
  direcao: -1 | 1,
): { id: string; ordem: number }[] | null {
  const i = visiveis.findIndex((p) => p.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= visiveis.length) return null;
  const a = visiveis[i];
  const b = visiveis[j];
  // Ordens iguais (digitadas à mão) não trocariam nada: desempata.
  const ordemA = a.ordem === b.ordem ? b.ordem + direcao : b.ordem;
  return [
    { id: a.id, ordem: ordemA },
    { id: b.id, ordem: a.ordem },
  ];
}

/** Ordem de um produto novo: depois de todos. */
export function proximaOrdem(produtos: Produto[]): number {
  return produtos.reduce((m, p) => Math.max(m, p.ordem), 0) + 1;
}
