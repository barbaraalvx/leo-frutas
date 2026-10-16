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

/**
 * João Pessoa (America/Fortaleza) é UTC−3 o ano todo, sem horário de verão
 * desde 2000. Deslocamento fixo em vez de Intl com fuso: dá o mesmo
 * resultado no navegador e no Apps Script, sem depender dos dados de fuso.
 */
const DESLOCAMENTO_MS = -3 * 60 * 60 * 1000;

/** Dia local "AAAA-MM-DD" de uma data-hora. */
export function diaLocal(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return new Date(d.getTime() + DESLOCAMENTO_MS).toISOString().slice(0, 10);
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

// ---- Apresentação do painel ----

export const ROTULOS_PERIODO: Record<Periodo, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  mes: 'Este mês',
};

export type Variacao =
  | { tipo: 'percentual'; valor: number }
  /** Havia zero no período anterior: percentual não faz sentido. */
  | { tipo: 'sem-base' }
  | null;

/** Variação contra o período anterior; null quando os dois são zero. */
export function variacao(atual: number, anterior: number): Variacao {
  if (anterior === 0) return atual === 0 ? null : { tipo: 'sem-base' };
  return { tipo: 'percentual', valor: Math.round(((atual - anterior) / anterior) * 100) };
}

/** "vs ontem", "vs 7 dias anteriores"… (o mês compara com os mesmos N dias antes). */
export function rotuloComparacao(periodo: Periodo, hoje: string): string {
  if (periodo === 'hoje') return 'vs ontem';
  if (periodo === '7d') return 'vs 7 dias anteriores';
  if (periodo === '30d') return 'vs 30 dias anteriores';
  const dias = Number(hoje.slice(8, 10));
  return dias === 1 ? 'vs ontem' : `vs ${dias} dias anteriores`;
}

/**
 * Marcas "redondas" do eixo de valores (passos de 1, 2, 2,5 ou 5 × 10ⁿ reais),
 * com umas 4 linhas. Devolve as marcas em centavos, de 0 até o topo.
 */
export function marcasDoEixo(maximoCentavos: number, linhas = 4): number[] {
  const maximo = Math.max(maximoCentavos / 100, 1);
  const bruto = maximo / linhas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!;
  const topo = Math.ceil(maximo / passo) * passo;
  const marcas: number[] = [];
  for (let v = 0; v <= topo + passo / 2; v += passo) marcas.push(Math.round(v * 100));
  return marcas;
}
