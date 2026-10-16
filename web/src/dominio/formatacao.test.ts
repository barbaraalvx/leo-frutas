import { describe, expect, it } from 'vitest';
import {
  formatarCentavosCampo,
  formatarDataHora,
  formatarDinheiro,
  formatarDinheiroCompacto,
  formatarDiaCurto,
  formatarNumeroNota,
  formatarPeso,
  formatarQuantidade,
  lerDinheiro,
  lerPeso,
  normalizarBusca,
  rotuloUnidade,
} from './formatacao';

describe('dinheiro', () => {
  it('formata em pt-BR', () => {
    expect(formatarDinheiro(123456)).toBe('R$ 1.234,56');
    expect(formatarDinheiro(17840)).toBe('R$ 178,40');
    expect(formatarDinheiro(50)).toBe('R$ 0,50');
    expect(formatarDinheiro(0)).toBe('R$ 0,00');
    expect(formatarDinheiro(123456789)).toBe('R$ 1.234.567,89');
  });

  it('formata para campo, sem símbolo', () => {
    expect(formatarCentavosCampo(2600)).toBe('26,00');
  });

  it('lê o que o vendedor digita', () => {
    expect(lerDinheiro('26')).toBe(2600);
    expect(lerDinheiro('26,00')).toBe(2600);
    expect(lerDinheiro('26,4')).toBe(2640);
    expect(lerDinheiro('26.40')).toBe(2640);
    expect(lerDinheiro('R$ 1.234,56')).toBe(123456);
    expect(lerDinheiro('1.234')).toBe(123400);
    expect(lerDinheiro(' 0,5 ')).toBe(50);
  });

  it('recusa valores inválidos', () => {
    expect(lerDinheiro('')).toBeNull();
    expect(lerDinheiro('abc')).toBeNull();
    expect(lerDinheiro('1,234')).toBeNull();
    expect(lerDinheiro('-5')).toBeNull();
  });
});

describe('peso', () => {
  it('formata com 3 casas e vírgula', () => {
    expect(formatarPeso(1200)).toBe('1,200');
    expect(formatarPeso(350)).toBe('0,350');
    expect(formatarPeso(12_005)).toBe('12,005');
  });

  it('aceita vírgula ou ponto e completa 3 casas', () => {
    expect(lerPeso('1,2')).toBe(1200);
    expect(lerPeso('1.2')).toBe(1200);
    expect(lerPeso('0,350')).toBe(350);
    expect(lerPeso('2')).toBe(2000);
    expect(lerPeso(',5')).toBe(500);
  });

  it('"1,2" vira "1,200" (critério de aceite)', () => {
    expect(formatarPeso(lerPeso('1,2')!)).toBe('1,200');
  });

  it('recusa mais de 3 casas e lixo', () => {
    expect(lerPeso('1,2345')).toBeNull();
    expect(lerPeso('')).toBeNull();
    expect(lerPeso('1,2,3')).toBeNull();
    expect(lerPeso('abc')).toBeNull();
  });
});

describe('quantidade e unidade', () => {
  it('kg com 3 casas, outros inteiros', () => {
    expect(formatarQuantidade('kg', 1200)).toBe('1,200');
    expect(formatarQuantidade('unidade', 20_000)).toBe('20');
    expect(formatarQuantidade('caixa', 2000)).toBe('2');
  });

  it('rótulos dos selos', () => {
    expect(rotuloUnidade('kg')).toBe('kg');
    expect(rotuloUnidade('unidade')).toBe('un.');
    expect(rotuloUnidade('peca')).toBe('peça');
    expect(rotuloUnidade('caixa')).toBe('caixa');
  });
});

describe('número da nota', () => {
  it('4 dígitos com zeros, passa de 9999', () => {
    expect(formatarNumeroNota(128)).toBe('0128');
    expect(formatarNumeroNota(1)).toBe('0001');
    expect(formatarNumeroNota(12345)).toBe('12345');
  });
});

describe('data e hora', () => {
  it('no fuso de João Pessoa (UTC−3)', () => {
    expect(formatarDataHora('2026-10-16T17:30:00Z')).toBe('16/10/2026 14:30');
    expect(formatarDataHora(new Date('2026-01-01T02:05:00Z'))).toBe('31/12/2025 23:05');
  });
});

describe('busca', () => {
  it('sem acento e sem maiúsculas', () => {
    expect(normalizarBusca('Maçã Verde')).toBe('maca verde');
    expect(normalizarBusca('Maracujá')).toContain(normalizarBusca('MARACUJA'));
  });
});

describe('gráfico', () => {
  it('dinheiro compacto para o eixo', () => {
    expect(formatarDinheiroCompacto(0)).toBe('R$ 0');
    expect(formatarDinheiroCompacto(25000)).toBe('R$ 250');
    expect(formatarDinheiroCompacto(100000)).toBe('R$ 1 mil');
    expect(formatarDinheiroCompacto(120000)).toBe('R$ 1,2 mil');
    expect(formatarDinheiroCompacto(1500000)).toBe('R$ 15 mil');
  });

  it('dia curto', () => {
    expect(formatarDiaCurto('2026-10-06')).toBe('06/10');
  });
});
