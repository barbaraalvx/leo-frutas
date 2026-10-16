// Prepara a planilha (3.x): cria as abas e cabeçalhos que faltam, aplica os
// formatos e grava os dados iniciais. Pode rodar quantas vezes quiser: nunca
// apaga nem duplica nada.

import { CONFIG_INICIAL, produtosIniciais } from '../web/src/api/dadosIniciais';
import { ABA, CABECALHOS, acrescentar, lerLinhas, linhaDoProduto, planilha, type NomeAba } from './planilha';

/**
 * icones/icone-512.png no Drive de p4rkj13un@gmail.com, compartilhado com
 * "qualquer pessoa com o link". Serve para qualquer planilha; se o arquivo
 * sumir, o app só abre sem ícone.
 */
export const URL_ICONE_PADRAO = 'https://lh3.googleusercontent.com/d/1birY4HgVDlzOOiNpdF9STjHX5Ae7sDW7';

const FORMATOS: Partial<Record<NomeAba, Record<string, string>>> = {
  Produtos: { preco: '#,##0.00', ordem: '0', atualizado_em: 'dd/MM/yyyy HH:mm' },
  Notas: { numero: '0000', data_hora: 'dd/MM/yyyy HH:mm', total: '#,##0.00', qtd_itens: '0' },
  Itens: {
    numero_nota: '0000',
    quantidade: '0.000',
    preco_unitario: '#,##0.00',
    valor_calculado: '#,##0.00',
    valor_final: '#,##0.00',
  },
};

export function setup(): string {
  const ss = planilha();
  ss.setSpreadsheetTimeZone('America/Fortaleza');
  ss.setSpreadsheetLocale('pt_BR');

  const feito: string[] = [];
  for (const nome of Object.values(ABA)) prepararAba(nome, feito);

  if (lerLinhas(ABA.produtos).length === 0) {
    acrescentar(
      ABA.produtos,
      produtosIniciais().map((p) => linhaDoProduto({ ...p, atualizado_em: null })),
    );
    feito.push(`${produtosIniciais().length} produtos iniciais gravados`);
  }

  const chaves = new Set(lerLinhas(ABA.config).map((l) => String(l.valores.chave).trim()));
  const maiorNota = lerLinhas(ABA.notas).reduce((m, l) => Math.max(m, Number(l.valores.numero) || 0), 0);
  const faltando = [
    ...Object.entries(CONFIG_INICIAL).map(([chave, valor]) => ({ chave, valor })),
    { chave: 'proximo_numero', valor: maiorNota + 1 },
    // Endereço público do ícone da aba (ver "Ícone" no CLAUDE.md); vazio = sem ícone.
    { chave: 'url_icone', valor: URL_ICONE_PADRAO },
  ].filter((c) => !chaves.has(c.chave));
  if (faltando.length) {
    acrescentar(ABA.config, faltando);
    feito.push(`Config: ${faltando.map((c) => c.chave).join(', ')}`);
  }

  // A aba vazia que vem com toda planilha nova não serve para nada.
  for (const sheet of ss.getSheets()) {
    const nome = sheet.getName();
    const nossa = (Object.values(ABA) as string[]).includes(nome);
    if (!nossa && sheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
      feito.push(`aba vazia "${nome}" removida`);
    }
  }

  SpreadsheetApp.flush();
  return feito.length ? `Planilha preparada: ${feito.join('; ')}.` : 'A planilha já estava pronta. Nada mudou.';
}

function prepararAba(nome: NomeAba, feito: string[]): void {
  const ss = planilha();
  let sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    feito.push(`aba ${nome} criada`);
  }

  const colunas = sheet.getLastColumn();
  const atual = colunas ? sheet.getRange(1, 1, 1, colunas).getValues()[0].map((c) => String(c).trim()) : [];
  // Colunas que faltam vão para o fim; as que a família criou ficam onde estão.
  const faltando = CABECALHOS[nome].filter((c) => !atual.includes(c));
  if (faltando.length) {
    sheet.getRange(1, atual.length + 1, 1, faltando.length).setValues([faltando]);
    if (atual.length) feito.push(`${nome}: colunas ${faltando.join(', ')} acrescentadas`);
  }
  const cabecalho = [...atual, ...faltando];

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, cabecalho.length).setFontWeight('bold');

  const linhas = Math.max(sheet.getMaxRows() - 1, 1);
  for (const [coluna, formato] of Object.entries(FORMATOS[nome] ?? {})) {
    const j = cabecalho.indexOf(coluna);
    if (j >= 0) sheet.getRange(2, j + 1, linhas, 1).setNumberFormat(formato);
  }
  // Texto puro: telefone e nomes não viram número nem data.
  if (nome === ABA.config) sheet.getRange(2, 2, linhas, 1).setNumberFormat('@');
}
