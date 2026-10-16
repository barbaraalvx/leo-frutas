// Tela Notas (6.3): filtro por período, no fuso de João Pessoa.

import { diaLocal, somarDias } from './painel';

export type FiltroPeriodo = 'hoje' | '7d' | '30d' | 'tudo';

export const FILTROS_PERIODO: { id: FiltroPeriodo; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: 'tudo', rotulo: 'Tudo' },
];

const DIAS_ATRAS: Record<Exclude<FiltroPeriodo, 'tudo'>, number> = { hoje: 0, '7d': 6, '30d': 29 };

/** Início (meia-noite em João Pessoa) do período, em ISO; undefined = tudo. */
export function desdeDoFiltro(filtro: FiltroPeriodo, agora: Date = new Date()): string | undefined {
  if (filtro === 'tudo') return undefined;
  const dia = somarDias(diaLocal(agora), -DIAS_ATRAS[filtro]);
  return new Date(`${dia}T00:00:00-03:00`).toISOString();
}
