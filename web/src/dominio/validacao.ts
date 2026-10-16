// Validação do que chega ao servidor (7.2). A mesma regra roda na API
// simulada e no Apps Script: o servidor não confia no que o app manda.

import { calcularValor, quantidadeValida, somarCentavos } from './calculo';
import { CATEGORIAS, TIPOS_VENDA, type ItemNota } from './tipos';
import type { AlteracaoProduto } from '../api/tipos';

export const NOME_PRODUTO_MAX = 60;

const ehInteiroNaoNegativo = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/**
 * Confere os itens e recalcula `valor_calculado` de cada um. Respeita
 * `valor_final` e `ajustado` como vieram. Devolve o total em centavos.
 */
export function validarItens(itens: unknown): number {
  if (!Array.isArray(itens) || itens.length === 0) throw new Error('A nota não tem itens.');
  for (const item of itens as ItemNota[]) {
    const nome = typeof item?.produto_nome === 'string' && item.produto_nome ? item.produto_nome : 'item sem nome';
    if (typeof item.produto_id !== 'string' || !item.produto_id) throw new Error(`Item sem produto: ${nome}.`);
    if (!TIPOS_VENDA.includes(item.tipo_venda)) throw new Error(`Tipo de venda inválido em ${nome}.`);
    if (!quantidadeValida(item.tipo_venda, item.quantidade)) throw new Error(`Quantidade inválida em ${nome}.`);
    if (!ehInteiroNaoNegativo(item.preco_unitario)) throw new Error(`Preço inválido em ${nome}.`);
    if (!ehInteiroNaoNegativo(item.valor_final)) throw new Error(`Valor final inválido em ${nome}.`);
    if (typeof item.ajustado !== 'boolean') throw new Error(`Marca de ajuste inválida em ${nome}.`);
    if (calcularValor(item.quantidade, item.preco_unitario) !== item.valor_calculado) {
      throw new Error(`Valor calculado não confere em ${nome}.`);
    }
  }
  return somarCentavos((itens as ItemNota[]).map((i) => i.valor_final));
}

export function validarAlteracaoProduto(alt: AlteracaoProduto): void {
  const nome = typeof alt?.nome === 'string' ? alt.nome.trim() : '';
  if (!nome) throw new Error('Produto sem nome.');
  if (nome.length > NOME_PRODUTO_MAX) throw new Error(`Nome muito longo: ${nome.slice(0, 20)}…`);
  if (!CATEGORIAS.includes(alt.categoria)) throw new Error(`Categoria inválida em ${nome}.`);
  if (!TIPOS_VENDA.includes(alt.tipo_venda)) throw new Error(`Tipo de venda inválido em ${nome}.`);
  if (alt.preco !== null && !ehInteiroNaoNegativo(alt.preco)) throw new Error(`Preço inválido em ${nome}.`);
  if (typeof alt.ativo !== 'boolean') throw new Error(`Campo "ativo" inválido em ${nome}.`);
  if (!Number.isFinite(alt.ordem)) throw new Error(`Ordem inválida em ${nome}.`);
}

/** id_envio aceito: letras, números, - e _, de 8 a 64 caracteres (um UUID serve). */
export function idEnvioValido(id: unknown): id is string {
  return typeof id === 'string' && /^[\w-]{8,64}$/.test(id);
}

/** Próximo id livre: p_0025 depois de p_0024, mesmo com buracos ou ids à mão. */
export function proximoIdProduto(ids: string[]): string {
  const maior = ids.reduce((m, id) => {
    const n = /^p_(\d+)$/.exec(id)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `p_${String(maior + 1).padStart(4, '0')}`;
}
