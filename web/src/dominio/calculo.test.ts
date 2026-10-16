import { describe, expect, it } from 'vitest';
import { calcularValor, quantidadeValida, somarCentavos } from './calculo';

describe('calcularValor', () => {
  it('maçã verde: 1,200 kg × R$ 22,00 = R$ 26,40', () => {
    expect(calcularValor(1200, 2200)).toBe(2640);
  });

  it('laranja pêra: 20 un. × R$ 0,50 = R$ 10,00', () => {
    expect(calcularValor(20_000, 50)).toBe(1000);
  });

  it('arredonda ao centavo, meio para cima', () => {
    // 0,333 kg × R$ 17,00 = 5,661 → 5,66
    expect(calcularValor(333, 1700)).toBe(566);
    // 0,125 kg × R$ 0,20 = 0,025 → 0,03 (meio sobe)
    expect(calcularValor(125, 20)).toBe(3);
    // 0,005 kg × R$ 1,00 = 0,005 → 0,01
    expect(calcularValor(5, 100)).toBe(1);
    // 0,004 kg × R$ 1,00 = 0,004 → 0,00
    expect(calcularValor(4, 100)).toBe(0);
  });

  it('casos clássicos de float continuam exatos', () => {
    // 1,005 kg × R$ 10,00: em float 1.005 * 10 = 10.049999…
    expect(calcularValor(1005, 1000)).toBe(1005);
    // 0,1 + 0,2 de verdade
    expect(somarCentavos([10, 20])).toBe(30);
  });

  it('recusa valores não inteiros ou negativos', () => {
    expect(() => calcularValor(1.5, 100)).toThrow(TypeError);
    expect(() => calcularValor(1000, 22.5)).toThrow(TypeError);
    expect(() => calcularValor(-1000, 100)).toThrow(RangeError);
  });
});

describe('quantidadeValida', () => {
  it('kg aceita 3 casas', () => {
    expect(quantidadeValida('kg', 1200)).toBe(true);
    expect(quantidadeValida('kg', 1)).toBe(true);
  });

  it('outros tipos só inteiros', () => {
    expect(quantidadeValida('unidade', 20_000)).toBe(true);
    expect(quantidadeValida('caixa', 1500)).toBe(false);
  });

  it('zero não vale', () => {
    expect(quantidadeValida('kg', 0)).toBe(false);
    expect(quantidadeValida('peca', 0)).toBe(false);
  });
});
