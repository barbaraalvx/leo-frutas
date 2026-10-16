// Tipos compartilhados entre telas, API e regras. Dinheiro sempre em centavos
// (inteiro) e quantidade sempre em milésimos (inteiro): 1,200 kg = 1200,
// 20 unidades = 20000. Assim nenhuma conta passa por ponto flutuante.

export type TipoVenda = 'kg' | 'peca' | 'unidade' | 'caixa';

export const TIPOS_VENDA: TipoVenda[] = ['kg', 'unidade', 'peca', 'caixa'];

export type Categoria = 'Frutas' | 'Verduras e legumes';

export const CATEGORIAS: Categoria[] = ['Frutas', 'Verduras e legumes'];

export interface Produto {
  id: string;
  nome: string;
  categoria: Categoria;
  tipo_venda: TipoVenda;
  /** Centavos. null = "definir preço". */
  preco: number | null;
  ativo: boolean;
  ordem: number;
  /** ISO 8601, ou null se nunca salvo. */
  atualizado_em: string | null;
}

export interface Config {
  nome_loja: string;
  vendedor: string;
  telefone: string;
  endereco: string;
  cidade: string;
  rodape_nota: string;
}

/** Item como é enviado ao servidor e gravado na aba Itens. */
export interface ItemNota {
  produto_id: string;
  produto_nome: string;
  tipo_venda: TipoVenda;
  /** Milésimos. */
  quantidade: number;
  /** Centavos. */
  preco_unitario: number;
  /** Centavos. */
  valor_calculado: number;
  /** Centavos. */
  valor_final: number;
  ajustado: boolean;
}

export type StatusNota = 'emitida' | 'cancelada';

export interface ResumoNota {
  numero: number;
  /** ISO 8601. */
  data_hora: string;
  cliente: string;
  /** Centavos. */
  total: number;
  qtd_itens: number;
  status: StatusNota;
  observacao: string;
}

export interface Nota extends ResumoNota {
  itens: ItemNota[];
}
