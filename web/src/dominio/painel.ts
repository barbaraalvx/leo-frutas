// Números do painel (seção 6.6). Função pura: o mock usa no navegador e o
// Apps Script vai usar a mesma lógica no servidor.

import { somarCentavos } from './calculo';
import type { Nota, TipoVenda } from './tipos';

export type Periodo = 'hoje' | '7d' | '30d' | 'mes';

export interface Indicadores {
  /** Centavos. */
  vendas: number;
  notas: number;
  /** Centavos; 0 sem notas. */
  ticketMedio: number;
}

export interface ProdutoVendido {
  produto_id: string;
  nome: string;
  tipo_venda: TipoVenda;
  /** Milésimos somados. */
  quantidade: number;
  /** Centavos. */
  valor: number;
}

export interface Painel {
  periodo: Periodo;
  atual: Indicadores;
  /** Período anterior de mesmo tamanho, para a variação. */
  anterior: Indicadores;
  maisVendido: ProdutoVendido | null;
  /** Um ponto por dia, "AAAA-MM-DD" no fuso de João Pessoa. */
  porDia: { dia: string; total: number }[];
  /** Até 10, por valor. */
  topProdutos: ProdutoVendido[];
}

const FUSO = 'America/Fortaleza';

/** Dia local "AAAA-MM-DD" de uma data-hora. */
export function diaLocal(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

function diasEntre(inicio: string, fim: string): number {
  const ms = Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Intervalo [inicio, fim] em dias locais, inclusive. */
export function intervaloDoPeriodo(periodo: Periodo, hoje: string): { inicio: string; fim: string } {
  switch (periodo) {
    case 'hoje':
      return { inicio: hoje, fim: hoje };
    case '7d':
      return { inicio: somarDias(hoje, -6), fim: hoje };
    case '30d':
      return { inicio: somarDias(hoje, -29), fim: hoje };
    case 'mes':
      return { inicio: `${hoje.slice(0, 8)}01`, fim: hoje };
  }
}

export function calcularPainel(todas: Nota[], periodo: Periodo, agora: Date = new Date()): Painel {
  const emitidas = todas.filter((n) => n.status === 'emitida');
  const hoje = diaLocal(agora);
  const { inicio, fim } = intervaloDoPeriodo(periodo, hoje);
  const tamanho = diasEntre(inicio, fim) + 1;
  const antInicio = somarDias(inicio, -tamanho);
  const antFim = somarDias(inicio, -1);

  const noIntervalo = (a: string, b: string) => emitidas.filter((n) => {
    const dia = diaLocal(n.data_hora);
    return dia >= a && dia <= b;
  });

  const atuais = noIntervalo(inicio, fim);
  const topProdutos = somarProdutos(atuais);

  // Hoje e 7 dias mostram as últimas 2 semanas para dar contexto.
  const serieInicio = periodo === 'hoje' || periodo === '7d' ? somarDias(hoje, -13) : inicio;
  const totaisPorDia = new Map<string, number>();
  for (const n of noIntervalo(serieInicio, fim)) {
    const dia = diaLocal(n.data_hora);
    totaisPorDia.set(dia, (totaisPorDia.get(dia) ?? 0) + n.total);
  }
  const porDia = [];
  for (let dia = serieInicio; dia <= fim; dia = somarDias(dia, 1)) {
    porDia.push({ dia, total: totaisPorDia.get(dia) ?? 0 });
  }

  return {
    periodo,
    atual: indicadores(atuais),
    anterior: indicadores(noIntervalo(antInicio, antFim)),
    maisVendido: topProdutos[0] ?? null,
    porDia,
    topProdutos: topProdutos.slice(0, 10),
  };
}

function indicadores(notas: Nota[]): Indicadores {
  const vendas = somarCentavos(notas.map((n) => n.total));
  return {
    vendas,
    notas: notas.length,
    ticketMedio: notas.length ? Math.round(vendas / notas.length) : 0,
  };
}

function somarProdutos(notas: Nota[]): ProdutoVendido[] {
  const mapa = new Map<string, ProdutoVendido>();
  for (const item of notas.flatMap((n) => n.itens)) {
    const atual = mapa.get(item.produto_id);
    if (atual) {
      atual.quantidade += item.quantidade;
      atual.valor += item.valor_final;
    } else {
      mapa.set(item.produto_id, {
        produto_id: item.produto_id,
        nome: item.produto_nome,
        tipo_venda: item.tipo_venda,
        quantidade: item.quantidade,
        valor: item.valor_final,
      });
    }
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}
