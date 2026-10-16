// Cliente real: embrulha google.script.run em Promises.

import type { Api } from './tipos';

interface ScriptRun {
  withSuccessHandler(fn: (resultado: unknown) => void): ScriptRun;
  withFailureHandler(fn: (erro: Error) => void): ScriptRun;
  [funcao: string]: unknown;
}

declare global {
  interface Window {
    google?: { script?: { run: ScriptRun } };
  }
}

export function estaNoAppsScript(): boolean {
  return typeof window !== 'undefined' && !!window.google?.script?.run;
}

function chamar<T>(funcao: keyof Api, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = window.google!.script!.run
      .withSuccessHandler((r) => resolve(r as T))
      .withFailureHandler((e) => reject(new Error(e?.message || 'Erro ao falar com a planilha.')));
    (run[funcao] as (...a: unknown[]) => void)(...args);
  });
}

export const apiAppsScript: Api = {
  getDadosIniciais: () => chamar('getDadosIniciais'),
  salvarNota: (nota) => chamar('salvarNota', nota),
  listarNotas: (filtro) => chamar('listarNotas', filtro),
  getNota: (numero) => chamar('getNota', numero),
  cancelarNota: (numero, motivo) => chamar('cancelarNota', numero, motivo),
  salvarProdutos: (alteracoes) => chamar('salvarProdutos', alteracoes),
  getPainel: (periodo) => chamar('getPainel', periodo),
};
