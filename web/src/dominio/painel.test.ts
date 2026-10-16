import { describe, expect, it } from 'vitest';
import { calcularPainel, diaLocal, intervaloDoPeriodo, marcasDoEixo, rotuloComparacao, variacao } from './painel';
import type { Nota } from './tipos';

const AGORA = new Date('2026-10-16T15:00:00Z'); // 12:00 em João Pessoa

function nota(numero: number, data_hora: string, total: number, status: Nota['status'] = 'emitida'): Nota {
  return {
    numero,
    data_hora,
    cliente: '',
    total,
    qtd_itens: 1,
    status,
    observacao: '',
    itens: [
      {
        produto_id: 'p_0003',
        produto_nome: 'Maçã verde',
        tipo_venda: 'kg',
        quantidade: 1000,
        preco_unitario: total,
        valor_calculado: total,
        valor_final: total,
        ajustado: false,
      },
    ],
  };
}

describe('dias no fuso de João Pessoa', () => {
  it('01:00 UTC ainda é o dia anterior', () => {
    expect(diaLocal('2026-10-17T01:00:00Z')).toBe('2026-10-16');
  });

  it('intervalos', () => {
    expect(intervaloDoPeriodo('7d', '2026-10-16')).toEqual({ inicio: '2026-10-10', fim: '2026-10-16' });
    expect(intervaloDoPeriodo('mes', '2026-10-16')).toEqual({ inicio: '2026-10-01', fim: '2026-10-16' });
  });
});

describe('calcularPainel', () => {
  const notas = [
    nota(1, '2026-10-16T12:00:00Z', 10000),
    nota(2, '2026-10-16T13:00:00Z', 5000),
    nota(3, '2026-10-16T14:00:00Z', 99900, 'cancelada'),
    nota(4, '2026-10-15T14:00:00Z', 3000),
  ];

  it('hoje: soma, conta e ticket médio sem canceladas', () => {
    const p = calcularPainel(notas, 'hoje', AGORA);
    expect(p.atual).toEqual({ vendas: 15000, notas: 2, ticketMedio: 7500 });
    expect(p.anterior).toEqual({ vendas: 3000, notas: 1, ticketMedio: 3000 });
    expect(p.maisVendido).toMatchObject({ nome: 'Maçã verde', valor: 15000, quantidade: 2000 });
  });

  it('série de 14 dias para hoje e 7 dias', () => {
    const p = calcularPainel(notas, 'hoje', AGORA);
    expect(p.porDia).toHaveLength(14);
    expect(p.porDia.at(-1)).toEqual({ dia: '2026-10-16', total: 15000 });
    expect(p.porDia.at(-2)).toEqual({ dia: '2026-10-15', total: 3000 });
  });

  it('série com os dias do período no mês', () => {
    expect(calcularPainel(notas, 'mes', AGORA).porDia).toHaveLength(16);
  });

  it('sem notas, tudo zero', () => {
    const p = calcularPainel([], '30d', AGORA);
    expect(p.atual).toEqual({ vendas: 0, notas: 0, ticketMedio: 0 });
    expect(p.maisVendido).toBeNull();
  });
});

describe('apresentação', () => {
  it('variação percentual arredondada', () => {
    expect(variacao(15000, 10000)).toEqual({ tipo: 'percentual', valor: 50 });
    expect(variacao(5000, 10000)).toEqual({ tipo: 'percentual', valor: -50 });
    expect(variacao(10001, 10000)).toEqual({ tipo: 'percentual', valor: 0 });
  });

  it('sem base de comparação', () => {
    expect(variacao(5000, 0)).toEqual({ tipo: 'sem-base' });
    expect(variacao(0, 0)).toBeNull();
  });

  it('rótulo da comparação', () => {
    expect(rotuloComparacao('hoje', '2026-10-16')).toBe('vs ontem');
    expect(rotuloComparacao('7d', '2026-10-16')).toBe('vs 7 dias anteriores');
    expect(rotuloComparacao('mes', '2026-10-16')).toBe('vs 16 dias anteriores');
    expect(rotuloComparacao('mes', '2026-10-01')).toBe('vs ontem');
  });
});

describe('marcasDoEixo', () => {
  it('passos redondos que cobrem o máximo', () => {
    expect(marcasDoEixo(17840)).toEqual([0, 5000, 10000, 15000, 20000]);
    expect(marcasDoEixo(250000)).toEqual([0, 100000, 200000, 300000]);
    expect(marcasDoEixo(93000)).toEqual([0, 25000, 50000, 75000, 100000]);
  });

  it('sem vendas, ainda desenha um eixo', () => {
    expect(marcasDoEixo(0)).toEqual([0, 25, 50, 75, 100]);
  });
});
