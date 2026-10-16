// API simulada: dados em memória e latência artificial, para `npm run dev`
// e para os testes. Imita as regras do servidor (7.2): recalcula valores,
// numera as notas em sequência e nunca apaga nada.

import { normalizarBusca } from '../dominio/formatacao';
import { calcularPainel } from '../dominio/painel';
import { idEnvioValido, proximoIdProduto, validarAlteracaoProduto, validarItens } from '../dominio/validacao';
import type { Config, Nota, Produto } from '../dominio/tipos';
import { CONFIG_INICIAL, produtosIniciais } from './dadosIniciais';
import type { AlteracaoProduto, Api, FiltroNotas, NotaParaSalvar, NotaSalva } from './tipos';

export interface OpcoesSimulada {
  /** ms por chamada; 800 imita o Apps Script. */
  latencia?: number;
  /** Relógio injetável para testes. */
  agora?: () => Date;
  /**
   * Chave do localStorage onde guardar o estado. Sem ela, tudo some ao
   * recarregar. Em dev ela existe para a aba de impressão achar a nota.
   */
  chaveArmazenamento?: string;
}

interface EstadoSimulado {
  produtos: Produto[];
  config: Config;
  notas: Nota[];
  proximoNumero: number;
}

export class ApiSimulada implements Api {
  private produtos: Produto[] = produtosIniciais();
  private config: Config = { ...CONFIG_INICIAL };
  private notas: Nota[] = [];
  private proximoNumero = 1;
  /** id_envio → nota já salva (o servidor guarda por 6 h no CacheService). */
  private envios = new Map<string, NotaSalva>();
  private offline = false;
  private perderResposta = false;
  private readonly latencia: number;
  private readonly agora: () => Date;
  private readonly chave: string | undefined;

  constructor(opcoes: OpcoesSimulada = {}) {
    this.latencia = opcoes.latencia ?? 800;
    this.agora = opcoes.agora ?? (() => new Date());
    this.chave = opcoes.chaveArmazenamento;
    this.carregar();
  }

  /** Simula queda de internet: toda chamada falha até desligar. */
  definirOffline(offline: boolean): void {
    this.offline = offline;
  }

  /**
   * Simula a pior queda: o próximo salvarNota grava, mas a resposta não
   * chega ao app (a internet caiu no caminho de volta).
   */
  perderProximaResposta(): void {
    this.perderResposta = true;
  }

  getDadosIniciais() {
    return this.responder(() => ({ produtos: this.produtos, config: this.config }));
  }

  salvarNota(nota: NotaParaSalvar) {
    return this.responder(() => {
      const repetido = idEnvioValido(nota.id_envio) ? this.envios.get(nota.id_envio) : undefined;
      if (repetido) return repetido;
      const total = validarItens(nota.itens);
      const salva: Nota = {
        numero: this.proximoNumero++,
        data_hora: this.agora().toISOString(),
        cliente: String(nota.cliente ?? '').trim().slice(0, 60),
        total,
        qtd_itens: nota.itens.length,
        status: 'emitida',
        observacao: '',
        itens: nota.itens,
      };
      this.notas.push(salva);
      const resposta = { numero: salva.numero, data_hora: salva.data_hora, total: salva.total };
      if (idEnvioValido(nota.id_envio)) this.envios.set(nota.id_envio, resposta);
      if (this.perderResposta) {
        this.perderResposta = false;
        this.persistir();
        throw new Error('Sem conexão com a planilha. Confira a internet e tente de novo.');
      }
      return resposta;
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
      alteracoes.forEach(validarAlteracaoProduto);
      for (const alt of alteracoes) {
        const existente = alt.id ? this.produtos.find((p) => p.id === alt.id) : undefined;
        if (alt.id && !existente) throw new Error(`Produto ${alt.id} não encontrado.`);
        if (existente) {
          const precoMudou = existente.preco !== alt.preco;
          Object.assign(existente, alt, { atualizado_em: precoMudou ? agora : existente.atualizado_em });
        } else {
          this.produtos.push({
            ...alt,
            id: proximoIdProduto(this.produtos.map((p) => p.id)),
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

  private carregar(): void {
    if (!this.chave) return;
    try {
      const salvo = localStorage.getItem(this.chave);
      if (!salvo) return;
      const estado = JSON.parse(salvo) as EstadoSimulado;
      this.produtos = estado.produtos;
      this.config = estado.config;
      this.notas = estado.notas;
      this.proximoNumero = estado.proximoNumero;
    } catch {
      // Estado corrompido ou storage bloqueado: começa do zero.
    }
  }

  private persistir(): void {
    if (!this.chave) return;
    try {
      const estado: EstadoSimulado = {
        produtos: this.produtos,
        config: this.config,
        notas: this.notas,
        proximoNumero: this.proximoNumero,
      };
      localStorage.setItem(this.chave, JSON.stringify(estado));
    } catch {
      // Sem storage, segue só em memória.
    }
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
          const resultado = structuredClone(fn());
          this.persistir();
          resolve(resultado);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }, this.latencia);
    });
  }
}
