import type { TipoVenda } from './tipos';

/** Milésimos por unidade de quantidade (1 kg, 1 peça…). */
export const MIL = 1000;

/**
 * valor = quantidade × preço, arredondado ao centavo, meio para cima.
 * quantidade em milésimos, preço e resultado em centavos.
 */
export function calcularValor(quantidadeMil: number, precoCentavos: number): number {
  assertInteiro(quantidadeMil, 'quantidade');
  assertInteiro(precoCentavos, 'preço');
  if (quantidadeMil < 0 || precoCentavos < 0) {
    throw new RangeError('Quantidade e preço não podem ser negativos.');
  }
  // Inteiros: (q × p + 500) / 1000 arredonda meio para cima sem erro de float.
  return Math.floor((quantidadeMil * precoCentavos + MIL / 2) / MIL);
}

export function somarCentavos(valores: number[]): number {
  return valores.reduce((soma, v) => soma + v, 0);
}

/** kg aceita 3 casas; os outros tipos só inteiros. */
export function quantidadeValida(tipo: TipoVenda, quantidadeMil: number): boolean {
  if (!Number.isInteger(quantidadeMil) || quantidadeMil <= 0) return false;
  return tipo === 'kg' || quantidadeMil % MIL === 0;
}

function assertInteiro(n: number, nome: string): void {
  if (!Number.isInteger(n)) throw new TypeError(`${nome} deve ser inteiro (recebido ${n}).`);
}
