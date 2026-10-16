// Funções chamadas pelo app com google.script.run (seção 7.2). Mesmo
// contrato da API simulada (web/src/api/tipos.ts) e mesmas regras
// (web/src/dominio): o servidor recalcula e confere tudo o que recebe.

import type {
  AlteracaoProduto,
  DadosIniciais,
  FiltroNotas,
  ListaNotas,
  NotaParaSalvar,
  NotaSalva,
} from '../web/src/api/tipos';
import { normalizarBusca } from '../web/src/dominio/formatacao';
import { CLIENTE_MAX } from '../web/src/dominio/nota';
import { calcularPainel, type Painel, type Periodo } from '../web/src/dominio/painel';
import type { Nota, Produto } from '../web/src/dominio/tipos';
import { idEnvioValido, proximoIdProduto, validarAlteracaoProduto, validarItens } from '../web/src/dominio/validacao';
import {
  ABA,
  acrescentar,
  atualizar,
  itemDaLinha,
  lerConfig,
  lerConfigBruta,
  lerLinhas,
  linhaDoItem,
  linhaDoProduto,
  paraReais,
  produtoDaLinha,
  resumoDaLinha,
  textoSeguro,
} from './planilha';

const PERIODOS: Periodo[] = ['hoje', '7d', '30d', 'mes'];
/** Quanto tempo o servidor lembra de um envio, para não duplicar nota (6 h, o máximo do CacheService). */
const LEMBRAR_ENVIO_S = 6 * 60 * 60;
const LIMITE_MAX = 200;

/**
 * Toda escrita passa por aqui: um aparelho de cada vez, para o número da
 * nota nunca repetir (3.5).
 */
function comTrava<T>(fn: () => T): T {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(20_000)) {
    throw new Error('A planilha está ocupada com outra gravação. Tente de novo em instantes.');
  }
  try {
    const resultado = fn();
    SpreadsheetApp.flush();
    return resultado;
  } finally {
    trava.releaseLock();
  }
}

function lerProdutos(): Produto[] {
  return lerLinhas(ABA.produtos)
    .map(produtoDaLinha)
    .filter((p): p is Produto => p !== null);
}

export function getDadosIniciais(): DadosIniciais {
  return { produtos: lerProdutos(), config: lerConfig() };
}

export function salvarNota(nota: NotaParaSalvar): NotaSalva {
  const total = validarItens(nota?.itens);
  const cliente = String(nota.cliente ?? '').trim().slice(0, CLIENTE_MAX);

  return comTrava(() => {
    // Mesmo envio de novo (a resposta anterior se perdeu): devolve a nota já gravada.
    const cache = CacheService.getScriptCache();
    const chaveEnvio = idEnvioValido(nota.id_envio) ? `envio:${nota.id_envio}` : null;
    const repetido = chaveEnvio ? cache.get(chaveEnvio) : null;
    if (repetido) return JSON.parse(repetido) as NotaSalva;

    const config = lerConfigBruta();
    const linhaProximo = config.get('proximo_numero');
    // Se alguém mexeu na planilha à mão, nunca reaproveita um número.
    const maiorExistente = lerLinhas(ABA.notas).reduce(
      (m, l) => Math.max(m, Number(l.valores.numero) || 0),
      0,
    );
    const numero = Math.max(Number(linhaProximo?.valores.valor) || 1, maiorExistente + 1);
    const agora = new Date();

    acrescentar(ABA.notas, [
      {
        numero,
        data_hora: agora,
        cliente: textoSeguro(cliente),
        total: paraReais(total),
        qtd_itens: nota.itens.length,
        status: 'emitida',
        observacao: '',
      },
    ]);
    acrescentar(
      ABA.itens,
      nota.itens.map((i) => linhaDoItem(numero, i)),
    );
    if (linhaProximo) atualizar(ABA.config, linhaProximo.linha, { valor: numero + 1 });
    else acrescentar(ABA.config, [{ chave: 'proximo_numero', valor: numero + 1 }]);

    const resposta: NotaSalva = { numero, data_hora: agora.toISOString(), total };
    if (chaveEnvio) cache.put(chaveEnvio, JSON.stringify(resposta), LEMBRAR_ENVIO_S);
    return resposta;
  });
}

function lerResumos() {
  return lerLinhas(ABA.notas)
    .map(resumoDaLinha)
    .filter((n): n is NonNullable<typeof n> => n !== null);
}

export function listarNotas(filtro: FiltroNotas): ListaNotas {
  const offset = Math.max(0, Math.floor(Number(filtro?.offset) || 0));
  const limite = Math.min(LIMITE_MAX, Math.max(1, Math.floor(Number(filtro?.limite) || 50)));
  const desde = filtro?.desde ? Date.parse(filtro.desde) : -Infinity;
  const busca = normalizarBusca(filtro?.busca ?? '');

  const encontradas = lerResumos()
    .filter((n) => Date.parse(n.data_hora) >= desde)
    .filter((n) => !busca || normalizarBusca(n.cliente).includes(busca) || String(n.numero).includes(busca))
    .sort((a, b) => b.numero - a.numero);

  return {
    notas: encontradas.slice(offset, offset + limite),
    temMais: offset + limite < encontradas.length,
  };
}

function itensPorNota() {
  const mapa = new Map<number, Nota['itens']>();
  for (const linha of lerLinhas(ABA.itens)) {
    const item = itemDaLinha(linha);
    if (!item) continue;
    const { numero_nota, ...resto } = item;
    const lista = mapa.get(numero_nota) ?? [];
    lista.push(resto);
    mapa.set(numero_nota, lista);
  }
  return mapa;
}

export function getNota(numero: number): Nota {
  const n = Math.floor(Number(numero));
  const resumo = lerResumos().find((r) => r.numero === n);
  if (!resumo) throw new Error(`Nota ${n} não encontrada.`);
  return { ...resumo, itens: itensPorNota().get(n) ?? [] };
}

export function cancelarNota(numero: number, motivo: string): { ok: true } {
  const n = Math.floor(Number(numero));
  return comTrava(() => {
    const linha = lerLinhas(ABA.notas).find((l) => Number(l.valores.numero) === n);
    if (!linha) throw new Error(`Nota ${n} não encontrada.`);
    atualizar(ABA.notas, linha.linha, {
      status: 'cancelada',
      observacao: textoSeguro(String(motivo ?? '').trim().slice(0, 200)),
    });
    return { ok: true as const };
  });
}

export function salvarProdutos(alteracoes: AlteracaoProduto[]): { produtos: Produto[] } {
  if (!Array.isArray(alteracoes)) throw new Error('Lista de produtos inválida.');
  alteracoes.forEach(validarAlteracaoProduto);

  return comTrava(() => {
    const linhas = lerLinhas(ABA.produtos);
    const ids = linhas.map((l) => String(l.valores.id ?? '').trim());
    const novos: ReturnType<typeof linhaDoProduto>[] = [];
    const agora = new Date();

    for (const alt of alteracoes) {
      const dados = { ...alt, nome: alt.nome.trim() };
      if (alt.id) {
        const linha = linhas.find((l) => String(l.valores.id).trim() === alt.id);
        if (!linha) throw new Error(`Produto ${alt.id} não encontrado na planilha.`);
        const anterior = produtoDaLinha(linha);
        const precoMudou = anterior?.preco !== alt.preco;
        const { id: _id, atualizado_em: _a, ...campos } = linhaDoProduto({ ...dados, id: alt.id, atualizado_em: null });
        atualizar(ABA.produtos, linha.linha, precoMudou ? { ...campos, atualizado_em: agora } : campos);
      } else {
        const id = proximoIdProduto(ids);
        ids.push(id);
        novos.push(linhaDoProduto({ ...dados, id, atualizado_em: alt.preco !== null ? agora : null }));
      }
    }
    acrescentar(ABA.produtos, novos);
    return { produtos: lerProdutos() };
  });
}

export function getPainel(periodo: Periodo): Painel {
  if (!PERIODOS.includes(periodo)) throw new Error('Período inválido.');
  const itens = itensPorNota();
  const notas: Nota[] = lerResumos()
    .filter((n) => n.status === 'emitida')
    .map((n) => ({ ...n, itens: itens.get(n.numero) ?? [] }));
  return calcularPainel(notas, periodo, new Date());
}
