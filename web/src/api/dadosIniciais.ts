// Relação de produtos e config inicial (seções 3.4 e 3.6). Usado pela API
// simulada; o setup() do Apps Script grava a mesma lista na planilha.

import type { Categoria, Config, Produto, TipoVenda } from '../dominio/tipos';

export const CONFIG_INICIAL: Config = {
  nome_loja: 'Léo Frutas',
  vendedor: 'Léo',
  telefone: '(83) 99911-7487',
  endereco: 'R. Pres. Raniere Mazilli, s/n, Box 24, CEASA',
  cidade: 'João Pessoa/PB',
  rodape_nota: 'Documento sem valor fiscal.',
};

const F: Categoria = 'Frutas';
const V: Categoria = 'Verduras e legumes';

// [nome, categoria, tipo, preço em centavos ou null]
const RELACAO: [string, Categoria, TipoVenda, number | null][] = [
  ['Laranja pêra', F, 'unidade', 50],
  ['Maçã', F, 'kg', 1700],
  ['Maçã verde', F, 'kg', 2200],
  ['Uva verde sem caroço', F, 'kg', 2300],
  ['Uva preta', F, 'kg', 2000],
  ['Morango', F, 'caixa', 6000],
  ['Manga Tommy', F, 'kg', 800],
  ['Manga Palmer', F, 'kg', 1000],
  ['Melão', F, 'kg', 700],
  ['Melancia', F, 'peca', 2200],
  ['Maracujá', F, 'kg', 1400],
  ['Limão', F, 'kg', 1500],
  ['Kiwi', F, 'kg', 3200],
  ['Uva passa', F, 'kg', 3200],
  ['Ameixa', F, 'kg', 2300],
  ['Abobrinha', V, 'kg', null],
  ['Acelga', V, 'kg', null],
  ['Alface', V, 'unidade', null],
  ['Alecrim', V, 'unidade', null],
  ['Batata inglesa', V, 'kg', null],
  ['Batata doce', V, 'kg', null],
  ['Beterraba', V, 'kg', null],
  ['Cebola branca', V, 'kg', null],
  ['Cebola roxa', V, 'kg', null],
];

export function idProduto(n: number): string {
  return `p_${String(n).padStart(4, '0')}`;
}

export function produtosIniciais(): Produto[] {
  return RELACAO.map(([nome, categoria, tipo_venda, preco], i) => ({
    id: idProduto(i + 1),
    nome,
    categoria,
    tipo_venda,
    preco,
    ativo: true,
    ordem: i + 1,
    atualizado_em: null,
  }));
}
