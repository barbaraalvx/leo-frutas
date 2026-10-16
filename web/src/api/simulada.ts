// API simulada: dados em memória e latência artificial, para `npm run dev`
// e para os testes. Imita as regras do servidor (7.2): recalcula valores,
// numera as notas em sequência e nunca apaga nada.

import { calcularValor, quantidadeValida, somarCentavos } from '../dominio/calculo';
import { normalizarBusca } from '../dominio/formatacao';
import { calcularPainel } from '../dominio/painel';
import type { Config, Nota, Produto } from '../dominio/tipos';
import { CONFIG_INICIAL, idProduto, produtosIniciais } from './dadosIniciais';
import type { AlteracaoProduto, Api, FiltroNotas, NotaParaSalvar } from './tipos';

export interface OpcoesSimulada {
  /** ms por chamada; 800 imita o Apps Script. */
  latencia?: number;
  /** Relógio injetável para testes. */
  agora?: () => Date;
}

export class ApiSimulada implements Api {
  private produtos: Produto[] = produtosIniciais();
  private config: Config = { ...CONFIG_INICIAL };
  private notas: Nota[] = [];
  private proximoNumero = 1;
  private offline = false;
  private readonly latencia: number;
  private readonly agora: () => Date;

  constructor(opcoes: OpcoesSimulada = {}) {
    this.latencia = opcoes.latencia ?? 800;
    this.agora = opcoes.agora ?? (() => new Date());
  }

  /** Simula queda de internet: toda chamada falha até desligar. */
  definirOffline(offline: boolean): void {
    this.offline = offline;
  }

  getDadosIniciais() {
    return this.responder(() => ({ produtos: this.produtos, config: this.config }));
  }

  salvarNota(nota: NotaParaSalvar) {
    return this.responder(() => {
      if (nota.itens.length === 0) throw new Error('A nota não tem itens.');
      for (const item of nota.itens) {
        if (!quantidadeValida(item.tipo_venda, item.quantidade)) {
          throw new Error(`Quantidade inválida em ${item.produto_nome}.`);
        }
        if (calcularValor(item.quantidade, item.preco_unitario) !== item.valor_calculado) {
          throw new Error(`Valor calculado não confere em ${item.produto_nome}.`);
        }
      }
      const salva: Nota = {
        numero: this.proximoNumero++,
        data_hora: this.agora().toISOString(),
        cliente: nota.cliente.trim(),
        total: somarCentavos(nota.itens.map((i) => i.valor_final)),
        qtd_itens: nota.itens.length,
        status: 'emitida',
        observacao: '',
        itens: nota.itens,
      };
      this.notas.push(salva);
      return { numero: salva.numero, data_hora: salva.data_hora, total: salva.total };
    });
  }

  listarNotas(filtro: FiltroNotas) {
    return this.responder(() => {
      const busca = normalizarBusca(filtro.busca ?? '');
      const desde = filtro.desde ? Date.parse(filtro.desde) : -Infinity;
      const encontradas = [...this.notas]
        .reverse()
        .filter((n) => Date.parse(n.data_hora) >= desde)
        .filter((n) => !busca || normalizarBusca(n.cliente).includes(busca) || String(n.numero).includes(busca));
      const pagina = encontradas.slice(filtro.offset, filtro.offset + filtro.limite);
      return {
        notas: pagina.map(({ itens: _itens, ...resumo }) => resumo),
        temMais: filtro.offset + filtro.limite < encontradas.length,
      };
    });
  }

  getNota(numero: number) {
    return this.responder(() => this.buscarNota(numero));
  }

  cancelarNota(numero: number, motivo: string) {
    return this.responder(() => {
      const nota = this.buscarNota(numero);
      nota.status = 'cancelada';
      nota.observacao = motivo.trim();
      return { ok: true as const };
    });
  }

  salvarProdutos(alteracoes: AlteracaoProduto[]) {
    return this.responder(() => {
      const agora = this.agora().toISOString();
      for (const alt of alteracoes) {
        if (!alt.nome.trim()) throw new Error('Produto sem nome.');
        const existente = alt.id ? this.produtos.find((p) => p.id === alt.id) : undefined;
        if (alt.id && !existente) throw new Error(`Produto ${alt.id} não encontrado.`);
        if (existente) {
          const precoMudou = existente.preco !== alt.preco;
          Object.assign(existente, alt, { atualizado_em: precoMudou ? agora : existente.atualizado_em });
        } else {
          this.produtos.push({
            ...alt,
            id: idProduto(this.produtos.length + 1),
            atualizado_em: alt.preco !== null ? agora : null,
          });
        }
      }
      return { produtos: this.produtos };
    });
  }

  getPainel(periodo: Parameters<Api['getPainel']>[0]) {
    return this.responder(() => calcularPainel(this.notas, periodo, this.agora()));
  }

  private buscarNota(numero: number): Nota {
    const nota = this.notas.find((n) => n.numero === numero);
    if (!nota) throw new Error(`Nota ${numero} não encontrada.`);
    return nota;
  }

  /**
   * Espera a latência e devolve uma cópia, como se o dado tivesse passado
   * pela rede (assim a tela não altera o estado interno por engano).
   */
  private responder<T>(fn: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.offline) {
          reject(new Error('Sem conexão com a planilha. Confira a internet e tente de novo.'));
          return;
        }
        try {
          resolve(structuredClone(fn()));
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }, this.latencia);
    });
  }
}
