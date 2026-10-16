import { MIL } from './calculo';
import type { TipoVenda } from './tipos';

/** 123456 → "R$ 1.234,56" */
export function formatarDinheiro(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.floor(abs / 100);
  const cent = String(abs % 100).padStart(2, '0');
  const milhares = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}R$ ${milhares},${cent}`;
}

/** 2200 → "22,00" (sem o símbolo, para campos editáveis). */
export function formatarCentavosCampo(centavos: number): string {
  return formatarDinheiro(centavos).replace(/^(-?)R\$ /, '$1');
}

/**
 * Lê um valor digitado: "26", "26,4", "26.40", "R$ 1.234,56", "1234.56".
 * Devolve centavos, ou null se não for um valor válido.
 */
export function lerDinheiro(texto: string): number | null {
  let s = texto.replace(/R\$/i, '').replace(/\s/g, '');
  if (s === '') return null;
  if (s.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) {
    // "1.234" ou "1.234.567" só com pontos: são milhares.
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [inteiro, decimal = ''] = s.split('.');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
}

/** 1200 → "1,200" */
export function formatarPeso(quantidadeMil: number): string {
  const kg = Math.floor(quantidadeMil / MIL);
  const resto = String(quantidadeMil % MIL).padStart(3, '0');
  return `${kg},${resto}`;
}

/**
 * Lê um peso digitado com vírgula ou ponto ("1,2", "1.2", "0,350", "2").
 * Devolve milésimos, ou null se inválido ou com mais de 3 casas.
 */
export function lerPeso(texto: string): number | null {
  const s = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{0,3})?$/.test(s) && !/^\.\d{1,3}$/.test(s)) return null;
  const [inteiro, decimal = ''] = s.split('.');
  return Number(inteiro || '0') * MIL + Number(decimal.padEnd(3, '0'));
}

/** Quantidade como aparece na nota: kg com 3 casas, outros inteiros. */
export function formatarQuantidade(tipo: TipoVenda, quantidadeMil: number): string {
  return tipo === 'kg' ? formatarPeso(quantidadeMil) : String(Math.round(quantidadeMil / MIL));
}

const ROTULO_UNIDADE: Record<TipoVenda, string> = {
  kg: 'kg',
  unidade: 'un.',
  peca: 'peça',
  caixa: 'caixa',
};

/** Selo e coluna "Un." da nota: kg, un., peça, caixa. */
export function rotuloUnidade(tipo: TipoVenda): string {
  return ROTULO_UNIDADE[tipo];
}

/** 128 → "0128"; 12345 → "12345" */
export function formatarNumeroNota(numero: number): string {
  return String(numero).padStart(4, '0');
}

/** Data-hora no fuso de João Pessoa: "16/10/2026 14:30". */
export function formatarDataHora(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const p = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === tipo)?.value ?? '';
  return `${p('day')}/${p('month')}/${p('year')} ${p('hour')}:${p('minute')}`;
}

/** Para busca: sem acento e minúsculo ("Maçã" → "maca"). */
export function normalizarBusca(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
