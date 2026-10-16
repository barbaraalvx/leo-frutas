// Contrato das funções do Apps Script (seção 7.2). A implementação real
// (google.script.run) e a simulada seguem esta mesma interface.

import type { Config, ItemNota, Nota, Produto, ResumoNota } from '../dominio/tipos';
import type { Painel, Periodo } from '../dominio/painel';

export interface DadosIniciais {
  produtos: Produto[];
  config: Config;
}

export interface NotaParaSalvar {
  cliente: string;
  itens: ItemNota[];
}

export interface NotaSalva {
  numero: number;
  data_hora: string;
  total: number;
}

export interface FiltroNotas {
  /** ISO 8601: só notas a partir desta data-hora. */
  desde?: string;
  /** Cliente (sem acento) ou número da nota. */
  busca?: string;
  offset: number;
  limite: number;
}

export interface ListaNotas {
  notas: ResumoNota[];
  temMais: boolean;
}

/** Produto novo (sem id) ou alterado. `atualizado_em` é do servidor. */
export type AlteracaoProduto = Omit<Produto, 'id' | 'atualizado_em'> & { id?: string };

export interface Api {
  getDadosIniciais(): Promise<DadosIniciais>;
  salvarNota(nota: NotaParaSalvar): Promise<NotaSalva>;
  listarNotas(filtro: FiltroNotas): Promise<ListaNotas>;
  getNota(numero: number): Promise<Nota>;
  cancelarNota(numero: number, motivo: string): Promise<{ ok: true }>;
  salvarProdutos(alteracoes: AlteracaoProduto[]): Promise<{ produtos: Produto[] }>;
  getPainel(periodo: Periodo): Promise<Painel>;
}
