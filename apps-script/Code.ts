// Entrada do Apps Script: serve o app (doGet), o menu da planilha e expõe as
// funções da API. O build (scripts/build-servidor.mjs) cria uma função de
// topo para cada nome em FUNCOES_PUBLICAS, que é o que o Apps Script enxerga.

import { formatarNumeroNota } from '../web/src/dominio/formatacao';
import { contaAtual, paginaSemAcesso, protegida, temAcesso } from './acesso';
import * as api from './api';
import { setup } from './setup';

export { setup };

// Funções do app, com erro de permissão traduzido para o balcão.
export const getDadosIniciais = protegida(api.getDadosIniciais);
export const salvarNota = protegida(api.salvarNota);
export const listarNotas = protegida(api.listarNotas);
export const getNota = protegida(api.getNota);
export const cancelarNota = protegida(api.cancelarNota);
export const salvarProdutos = protegida(api.salvarProdutos);
export const getPainel = protegida(api.getPainel);

/** Dados que o app precisa e não consegue ler de dentro do iframe do Google. */
export interface Inicial {
  urlApp: string;
  parametros: { view: string; numero: string };
}

export function doGet(e?: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  if (!temAcesso()) return paginaSemAcesso(contaAtual());

  const view = e?.parameter?.view === 'nota' ? 'nota' : '';
  const numero = /^\d{1,7}$/.test(e?.parameter?.numero ?? '') ? e!.parameter.numero : '';
  const inicial: Inicial = { urlApp: ScriptApp.getService().getUrl(), parametros: { view, numero } };

  // Injeta sem template: o bundle do React pode conter "<?", que o
  // HtmlService confundiria com scriptlet.
  const json = JSON.stringify(inicial).replace(/</g, '\\u003c');
  const script = `<script>window.LEO_FRUTAS=${json};</script>`;
  const conteudo = HtmlService.createHtmlOutputFromFile('index').getContent();
  const html = conteudo.includes('<head>')
    ? conteudo.replace('<head>', () => `<head>${script}`)
    : script + conteudo;

  const titulo = view === 'nota' && numero ? `Nota ${formatarNumeroNota(Number(numero))} · Léo Frutas` : 'Léo Frutas';
  return HtmlService.createHtmlOutput(html)
    .setTitle(titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

export function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('Léo Frutas')
    .addItem('Preparar planilha', 'prepararPlanilhaPeloMenu')
    .addToUi();
}

export function prepararPlanilhaPeloMenu(): void {
  const mensagem = setup();
  SpreadsheetApp.getUi().alert('Léo Frutas', mensagem, SpreadsheetApp.getUi().ButtonSet.OK);
}
