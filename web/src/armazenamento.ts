// O que o app guarda no localStorage: o rascunho da nota em montagem (6.1)
// e o cache de produtos e config (7.3). Tudo em try/catch: em aba anônima
// ou com storage bloqueado, o app segue funcionando, só sem guardar.

import type { DadosIniciais } from './api/tipos';
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

// ---- Cache de produtos e config (7.3) ----
// O app abre na hora com o que veio da última vez e atualiza em segundo
// plano. Sem internet, dá para montar nota com os preços guardados.

const CHAVE_DADOS = 'leo-frutas:dados';

export interface DadosGuardados {
  dados: DadosIniciais;
  /** ISO 8601 de quando veio do servidor. */
  salvoEm: string;
}

export function lerDadosGuardados(): DadosGuardados | null {
  try {
    const salvo = localStorage.getItem(CHAVE_DADOS);
    if (!salvo) return null;
    const guardado = JSON.parse(salvo) as DadosGuardados;
    const ok =
      Array.isArray(guardado?.dados?.produtos) &&
      typeof guardado.dados.config?.nome_loja === 'string' &&
      typeof guardado.salvoEm === 'string';
    return ok ? guardado : null;
  } catch {
    return null;
  }
}

export function guardarDados(dados: DadosIniciais, agora = new Date()): void {
  try {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify({ dados, salvoEm: agora.toISOString() }));
  } catch {
    // Sem storage: o app só não abre instantâneo da próxima vez.
  }
}
