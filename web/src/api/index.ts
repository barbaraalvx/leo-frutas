// Ponto único de acesso à API: google.script.run dentro do Apps Script,
// simulada em `npm run dev` e nos testes.

import { apiAppsScript, estaNoAppsScript } from './appsScript';
import { ApiSimulada } from './simulada';
import type { Api } from './tipos';

declare global {
  interface Window {
    /**
     * Injetado pelo doGet (apps-script/Code.ts). Dentro do iframe do Google
     * o app não enxerga o endereço nem os parâmetros da página de verdade.
     */
    LEO_FRUTAS?: { urlApp: string; parametros: { view: string; numero: string } };
    /** Só em dev: a API simulada, para os testes Playwright simularem falhas. */
    __apiSimulada?: ApiSimulada;
  }
}

function criarApi(): Api {
  if (estaNoAppsScript()) return apiAppsScript;
  const simulada = new ApiSimulada({ chaveArmazenamento: 'leo-frutas:simulada' });
  if (import.meta.env.DEV) window.__apiSimulada = simulada;
  return simulada;
}

export const api: Api = criarApi();

/** Parâmetros da página (?view=nota&numero=N), venham do Google ou da barra de endereço. */
export function parametrosDaPagina(): URLSearchParams {
  const injetados = window.LEO_FRUTAS?.parametros;
  return injetados ? new URLSearchParams(injetados) : new URLSearchParams(location.search);
}

/**
 * Endereço da página só com a nota, para imprimir numa aba própria (6.5).
 * No Apps Script o app roda num iframe, então o endereço vem do servidor.
 */
export function urlImpressao(numero: number): string {
  const base = estaNoAppsScript()
    ? (window.LEO_FRUTAS?.urlApp ?? '')
    : `${location.origin}${location.pathname}`;
  return `${base}?view=nota&numero=${numero}`;
}

export type * from './tipos';
