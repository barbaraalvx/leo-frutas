import { normalizarBusca } from './formatacao';
import type { Categoria, Produto } from './tipos';

export type Aba = Categoria | 'Todos';

export const ABAS: Aba[] = ['Frutas', 'Verduras e legumes', 'Todos'];

/**
 * Produtos da grade: só ativos, na ordem da coluna `ordem`. Com busca, procura
 * em todas as categorias (no balcão ninguém quer trocar de aba para achar).
 */
export function filtrarProdutos(produtos: Produto[], aba: Aba, busca: string): Produto[] {
  const termo = normalizarBusca(busca);
  return produtos
    .filter((p) => p.ativo)
    .filter((p) => (termo ? normalizarBusca(p.nome).includes(termo) : aba === 'Todos' || p.categoria === aba))
    .sort((a, b) => a.ordem - b.ordem);
}
