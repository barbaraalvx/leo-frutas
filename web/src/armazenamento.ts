// Rascunho da nota em montagem no localStorage (6.1). Tudo em try/catch:
// em aba anônima ou com storage bloqueado, o app segue sem rascunho.

import { NOTA_VAZIA, type NotaEmMontagem } from './dominio/nota';
import { TIPOS_VENDA } from './dominio/tipos';

const CHAVE_RASCUNHO = 'leo-frutas:rascunho';

export function lerRascunho(): NotaEmMontagem {
  try {
    const salvo = localStorage.getItem(CHAVE_RASCUNHO);
    if (!salvo) return NOTA_VAZIA;
    const nota = JSON.parse(salvo) as NotaEmMontagem;
    return rascunhoValido(nota) ? nota : NOTA_VAZIA;
  } catch {
    return NOTA_VAZIA;
  }
}

export function salvarRascunho(nota: NotaEmMontagem): void {
  try {
    if (nota.linhas.length === 0 && !nota.cliente) localStorage.removeItem(CHAVE_RASCUNHO);
    else localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(nota));
  } catch {
    // Sem storage: o rascunho só vive na memória.
  }
}

function rascunhoValido(nota: NotaEmMontagem): boolean {
  return (
    typeof nota?.cliente === 'string' &&
    Array.isArray(nota.linhas) &&
    nota.linhas.every(
      (l) =>
        typeof l.produtoId === 'string' &&
        typeof l.nome === 'string' &&
        TIPOS_VENDA.includes(l.tipo) &&
        Number.isInteger(l.quantidade) &&
        (l.preco === null || Number.isInteger(l.preco)) &&
        (l.valorManual === null || Number.isInteger(l.valorManual)),
    )
  );
}
