// Nota em montagem (seção 4 da especificação). Funções puras + reducer para
// useReducer na tela Nova nota.

import { calcularValor, MIL, quantidadeValida, somarCentavos } from './calculo';
import type { ItemNota, Produto, TipoVenda } from './tipos';

export const CLIENTE_MAX = 60;

export interface LinhaNota {
  produtoId: string;
  nome: string;
  tipo: TipoVenda;
  /** Milésimos. kg começa em 0 (campo de peso vazio, aguardando digitação). */
  quantidade: number;
  /** Centavos. Pode ser alterado só nesta nota. null = produto sem preço. */
  preco: number | null;
  /** Valor digitado à mão (centavos). null = segue o calculado. */
  valorManual: number | null;
}

export interface NotaEmMontagem {
  cliente: string;
  linhas: LinhaNota[];
}

export const NOTA_VAZIA: NotaEmMontagem = { cliente: '', linhas: [] };

/** quantidade × preço; null se a linha ainda não tem preço. */
export function valorCalculado(linha: LinhaNota): number | null {
  return linha.preco === null ? null : calcularValor(linha.quantidade, linha.preco);
}

/** O que vale na nota: o valor manual, se houver, senão o calculado. */
export function valorFinal(linha: LinhaNota): number | null {
  return linha.valorManual ?? valorCalculado(linha);
}

/** Ajustado = valor final diferente do calculado (coluna `ajustado`). */
export function estaAjustada(linha: LinhaNota): boolean {
  return linha.valorManual !== null && linha.valorManual !== valorCalculado(linha);
}

export function totalNota(nota: NotaEmMontagem): number {
  return somarCentavos(nota.linhas.map((l) => valorFinal(l) ?? 0));
}

/** Gerar nota só com itens, todos com quantidade e valor final. */
export function podeGerar(nota: NotaEmMontagem): boolean {
  return (
    nota.linhas.length > 0 &&
    nota.linhas.every((l) => quantidadeValida(l.tipo, l.quantidade) && valorFinal(l) !== null)
  );
}

/** Converte para o formato enviado a `salvarNota`. Exige podeGerar(nota). */
export function paraItens(nota: NotaEmMontagem): ItemNota[] {
  if (!podeGerar(nota)) throw new Error('A nota tem itens incompletos.');
  return nota.linhas.map((l) => {
    const calculado = valorCalculado(l);
    const final = valorFinal(l);
    // podeGerar garante; o if só estreita o tipo.
    if (l.preco === null || final === null) throw new Error('Item sem preço.');
    return {
      produto_id: l.produtoId,
      produto_nome: l.nome,
      tipo_venda: l.tipo,
      quantidade: l.quantidade,
      preco_unitario: l.preco,
      valor_calculado: calculado ?? final,
      valor_final: final,
      ajustado: estaAjustada(l),
    };
  });
}

export type AcaoNota =
  | { tipo: 'adicionar'; produto: Produto }
  | { tipo: 'quantidade'; produtoId: string; quantidade: number }
  | { tipo: 'somar'; produtoId: string; delta: number }
  | { tipo: 'preco'; produtoId: string; preco: number | null }
  | { tipo: 'valorFinal'; produtoId: string; valor: number | null }
  | { tipo: 'voltarAoCalculado'; produtoId: string }
  | { tipo: 'remover'; produtoId: string }
  | { tipo: 'cliente'; cliente: string }
  | { tipo: 'limpar' }
  | { tipo: 'carregar'; nota: NotaEmMontagem };

export function reducerNota(nota: NotaEmMontagem, acao: AcaoNota): NotaEmMontagem {
  switch (acao.tipo) {
    case 'adicionar': {
      const { produto } = acao;
      const existente = nota.linhas.find((l) => l.produtoId === produto.id);
      if (existente) {
        // kg: a linha já existe, a tela só põe o foco no peso.
        if (produto.tipo_venda === 'kg') return nota;
        return mudarLinha(nota, produto.id, (l) => ({ ...l, quantidade: l.quantidade + MIL }));
      }
      const linha: LinhaNota = {
        produtoId: produto.id,
        nome: produto.nome,
        tipo: produto.tipo_venda,
        quantidade: produto.tipo_venda === 'kg' ? 0 : MIL,
        preco: produto.preco,
        valorManual: null,
      };
      return { ...nota, linhas: [...nota.linhas, linha] };
    }
    case 'quantidade':
      return mudarLinha(nota, acao.produtoId, (l) => ({ ...l, quantidade: Math.max(0, acao.quantidade) }));
    case 'somar':
      return mudarLinha(nota, acao.produtoId, (l) => ({
        ...l,
        quantidade: Math.max(0, l.quantidade + acao.delta * MIL),
      }));
    case 'preco':
      return mudarLinha(nota, acao.produtoId, (l) => ({ ...l, preco: acao.preco }));
    case 'valorFinal':
      return mudarLinha(nota, acao.produtoId, (l) => ({ ...l, valorManual: acao.valor }));
    case 'voltarAoCalculado':
      return mudarLinha(nota, acao.produtoId, (l) => ({ ...l, valorManual: null }));
    case 'remover':
      return { ...nota, linhas: nota.linhas.filter((l) => l.produtoId !== acao.produtoId) };
    case 'cliente':
      return { ...nota, cliente: acao.cliente.slice(0, CLIENTE_MAX) };
    case 'limpar':
      return NOTA_VAZIA;
    case 'carregar':
      return acao.nota;
  }
}

function mudarLinha(
  nota: NotaEmMontagem,
  produtoId: string,
  fn: (l: LinhaNota) => LinhaNota,
): NotaEmMontagem {
  return { ...nota, linhas: nota.linhas.map((l) => (l.produtoId === produtoId ? fn(l) : l)) };
}
