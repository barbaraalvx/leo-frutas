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

/** O Google pode prefixar a mensagem ("Error: …", "Exception: …"); a tela mostra só o texto. */
export function limparMensagem(mensagem: string | undefined): string {
  const limpa = (mensagem ?? '').replace(/^(Error|Exception|ScriptError):\s*/i, '').trim();
  return limpa || 'Erro ao falar com a planilha.';
}

/**
 * Sem resposta em 45 s, desiste e deixa o app oferecer "Tentar de novo".
 * É seguro mesmo se o servidor tiver gravado: salvarNota manda id_envio e
 * o servidor não duplica.
 */
export const TEMPO_LIMITE_MS = 45_000;

function chamar<T>(funcao: keyof Api, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const limite = window.setTimeout(
      () => reject(new Error('A planilha demorou para responder. Confira a internet e tente de novo.')),
      TEMPO_LIMITE_MS,
    );
    const run = window.google!.script!.run
      .withSuccessHandler((r) => {
        window.clearTimeout(limite);
        resolve(r as T);
      })
      .withFailureHandler((e) => {
        window.clearTimeout(limite);
        reject(new Error(limparMensagem(e?.message)));
      });
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
