// Leitura e escrita das abas (seção 3). Colunas são achadas pelo nome do
// cabeçalho, não pela posição: a família pode reordenar colunas na planilha
// sem quebrar o app. Valores digitados à mão ("22,00", "peça") são aceitos.

import { MIL } from '../web/src/dominio/calculo';
import { lerDinheiro } from '../web/src/dominio/formatacao';
import { CATEGORIAS, TIPOS_VENDA } from '../web/src/dominio/tipos';
import type { Categoria, Config, ItemNota, Produto, ResumoNota, TipoVenda } from '../web/src/dominio/tipos';
import { CONFIG_INICIAL } from '../web/src/api/dadosIniciais';

export type Celula = string | number | boolean | Date;
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

export const ABA = {
  produtos: 'Produtos',
  notas: 'Notas',
  itens: 'Itens',
  config: 'Config',
} as const;

export type NomeAba = (typeof ABA)[keyof typeof ABA];

export const CABECALHOS: Record<NomeAba, string[]> = {
  Produtos: ['id', 'nome', 'categoria', 'tipo_venda', 'preco', 'ativo', 'ordem', 'atualizado_em'],
  Notas: ['numero', 'data_hora', 'cliente', 'total', 'qtd_itens', 'status', 'observacao'],
  Itens: [
    'numero_nota',
    'produto_id',
    'produto_nome',
    'tipo_venda',
    'quantidade',
    'preco_unitario',
    'valor_calculado',
    'valor_final',
    'ajustado',
  ],
  Config: ['chave', 'valor'],
};

export function planilha() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

export function aba(nome: NomeAba): Sheet {
  const sheet = planilha().getSheetByName(nome);
  if (!sheet) throw new Error(`Aba "${nome}" não encontrada. Use o menu Léo Frutas › Preparar planilha.`);
  return sheet;
}

function cabecalho(sheet: Sheet): string[] {
  const colunas = sheet.getLastColumn();
  if (colunas === 0) return [];
  return sheet
    .getRange(1, 1, 1, colunas)
    .getValues()[0]
    .map((c) => String(c).trim());
}

export interface Linha {
  /** Número da linha na planilha (1 = cabeçalho). */
  linha: number;
  valores: Record<string, Celula>;
}

/** Todas as linhas com dados, como objetos { coluna: valor }. */
export function lerLinhas(nome: NomeAba): Linha[] {
  const sheet = aba(nome);
  const ultima = sheet.getLastRow();
  const cab = cabecalho(sheet);
  if (ultima < 2 || cab.length === 0) return [];
  const dados = sheet.getRange(2, 1, ultima - 1, cab.length).getValues() as Celula[][];
  const linhas: Linha[] = [];
  dados.forEach((valores, i) => {
    if (valores.every((v) => v === '' || v === null)) return;
    const obj: Record<string, Celula> = {};
    cab.forEach((c, j) => {
      if (c) obj[c] = valores[j];
    });
    linhas.push({ linha: i + 2, valores: obj });
  });
  return linhas;
}

/** Acrescenta linhas no fim, na ordem das colunas que existem na aba. */
export function acrescentar(nome: NomeAba, objetos: Record<string, Celula | null>[]): void {
  if (objetos.length === 0) return;
  const sheet = aba(nome);
  const cab = cabecalho(sheet);
  const faltando = CABECALHOS[nome].filter((c) => !cab.includes(c));
  if (faltando.length) {
    throw new Error(`Faltam colunas na aba ${nome}: ${faltando.join(', ')}. Use Preparar planilha.`);
  }
  const valores = objetos.map((o) => cab.map((c) => o[c] ?? ''));
  sheet.getRange(sheet.getLastRow() + 1, 1, valores.length, cab.length).setValues(valores);
}

/** Muda só as colunas informadas de uma linha. */
export function atualizar(nome: NomeAba, linha: number, campos: Record<string, Celula | null>): void {
  const sheet = aba(nome);
  const cab = cabecalho(sheet);
  for (const [coluna, valor] of Object.entries(campos)) {
    const j = cab.indexOf(coluna);
    if (j < 0) throw new Error(`Coluna "${coluna}" não existe na aba ${nome}.`);
    sheet.getRange(linha, j + 1).setValue(valor ?? '');
  }
}

/**
 * Texto livre (cliente, nome, motivo) que começa com = + - @ viraria fórmula
 * na planilha. O apóstrofo força texto e não aparece na célula.
 */
export function textoSeguro(texto: string): string {
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

// ---- Conversões planilha ⇄ app ----
// Na planilha: reais com 2 casas, kg com 3 casas, datas como data-hora.
// No app: centavos e milésimos inteiros, datas ISO 8601.

export const paraReais = (centavos: number) => centavos / 100;
export const paraQuantidade = (milesimos: number) => milesimos / MIL;

/** Reais da planilha → centavos. Vazio ou inválido → null. */
export function deReais(v: Celula | undefined): number | null {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) : null;
  return lerDinheiro(String(v));
}

/** Quantidade da planilha → milésimos. */
export function deQuantidade(v: Celula | undefined): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * MIL) : 0;
}

export function deBooleano(v: Celula | undefined): boolean {
  if (typeof v === 'boolean') return v;
  return ['true', 'sim', 's', '1', 'verdadeiro'].includes(String(v ?? '').trim().toLowerCase());
}

export function deData(v: Celula | undefined): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return null;
}

export function deInteiro(v: Celula | undefined): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const ALIASES_TIPO: Record<string, TipoVenda> = {
  kg: 'kg',
  quilo: 'kg',
  peca: 'peca',
  'peça': 'peca',
  unidade: 'unidade',
  un: 'unidade',
  'un.': 'unidade',
  caixa: 'caixa',
  cx: 'caixa',
};

export function deTipoVenda(v: Celula | undefined): TipoVenda | null {
  const t = ALIASES_TIPO[String(v ?? '').trim().toLowerCase()];
  return t && TIPOS_VENDA.includes(t) ? t : null;
}

function deCategoria(v: Celula | undefined): Categoria {
  const texto = String(v ?? '').trim();
  return CATEGORIAS.find((c) => c.toLowerCase() === texto.toLowerCase()) ?? 'Frutas';
}

// ---- Linhas → objetos do app ----

export function produtoDaLinha({ valores: v }: Linha): Produto | null {
  const id = String(v.id ?? '').trim();
  const nome = String(v.nome ?? '').trim();
  const tipo = deTipoVenda(v.tipo_venda);
  // Linha incompleta (digitada à mão pela metade): fica fora do app.
  if (!id || !nome || !tipo) return null;
  return {
    id,
    nome,
    categoria: deCategoria(v.categoria),
    tipo_venda: tipo,
    preco: deReais(v.preco),
    ativo: deBooleano(v.ativo),
    ordem: deInteiro(v.ordem),
    atualizado_em: deData(v.atualizado_em),
  };
}

export function resumoDaLinha({ valores: v }: Linha): ResumoNota | null {
  const numero = deInteiro(v.numero);
  if (numero <= 0) return null;
  return {
    numero,
    data_hora: deData(v.data_hora) ?? new Date(0).toISOString(),
    cliente: String(v.cliente ?? ''),
    total: deReais(v.total) ?? 0,
    qtd_itens: deInteiro(v.qtd_itens),
    status: String(v.status).trim().toLowerCase() === 'cancelada' ? 'cancelada' : 'emitida',
    observacao: String(v.observacao ?? ''),
  };
}

export function itemDaLinha({ valores: v }: Linha): (ItemNota & { numero_nota: number }) | null {
  const tipo = deTipoVenda(v.tipo_venda);
  if (!tipo) return null;
  return {
    numero_nota: deInteiro(v.numero_nota),
    produto_id: String(v.produto_id ?? ''),
    produto_nome: String(v.produto_nome ?? ''),
    tipo_venda: tipo,
    quantidade: deQuantidade(v.quantidade),
    preco_unitario: deReais(v.preco_unitario) ?? 0,
    valor_calculado: deReais(v.valor_calculado) ?? 0,
    valor_final: deReais(v.valor_final) ?? 0,
    ajustado: deBooleano(v.ajustado),
  };
}

// ---- Objetos do app → linhas ----

export function linhaDoProduto(p: Omit<Produto, 'atualizado_em'> & { atualizado_em: Date | null }) {
  return {
    id: p.id,
    nome: textoSeguro(p.nome),
    categoria: p.categoria,
    tipo_venda: p.tipo_venda,
    preco: p.preco === null ? '' : paraReais(p.preco),
    ativo: p.ativo,
    ordem: p.ordem,
    atualizado_em: p.atualizado_em ?? '',
  };
}

export function linhaDoItem(numero: number, i: ItemNota) {
  return {
    numero_nota: numero,
    produto_id: i.produto_id,
    produto_nome: textoSeguro(i.produto_nome),
    tipo_venda: i.tipo_venda,
    quantidade: paraQuantidade(i.quantidade),
    preco_unitario: paraReais(i.preco_unitario),
    valor_calculado: paraReais(i.valor_calculado),
    valor_final: paraReais(i.valor_final),
    ajustado: i.ajustado,
  };
}

// ---- Config ----

export function lerConfigBruta(): Map<string, Linha> {
  return new Map(lerLinhas(ABA.config).map((l) => [String(l.valores.chave).trim(), l]));
}

export function lerConfig(): Config {
  const bruta = lerConfigBruta();
  const valor = (chave: keyof Config) => {
    const v = bruta.get(chave)?.valores.valor;
    return v === undefined || v === '' ? CONFIG_INICIAL[chave] : String(v);
  };
  return {
    nome_loja: valor('nome_loja'),
    vendedor: valor('vendedor'),
    telefone: valor('telefone'),
    endereco: valor('endereco'),
    cidade: valor('cidade'),
    rodape_nota: valor('rodape_nota'),
  };
}
