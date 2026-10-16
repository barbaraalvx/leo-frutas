import { Check } from 'lucide-react';
import { formatarDinheiro, rotuloUnidade } from '../dominio/formatacao';
import type { Produto } from '../dominio/tipos';
import { Selo } from './Selo';

interface Props {
  produto: Produto;
  /** Quantidade na nota (un./peça/caixa) ou true para kg já na nota. */
  naNota: number | boolean;
  aoTocar: (produto: Produto) => void;
  desativado?: boolean;
}

export function CartaoProduto({ produto, naNota, aoTocar, desativado }: Props) {
  return (
    <button
      type="button"
      className={`cartao-produto${naNota ? ' cartao-produto--na-nota' : ''}`}
      aria-label={`Adicionar ${produto.nome}`}
      onClick={() => aoTocar(produto)}
      disabled={desativado}
    >
      {naNota !== false && naNota !== 0 && (
        <span className="cartao-produto__contador tabular" aria-hidden>
          {naNota === true ? <Check size={14} strokeWidth={3} /> : naNota}
        </span>
      )}
      <span className="cartao-produto__nome">{produto.nome}</span>
      {produto.preco === null ? (
        <span className="cartao-produto__sem-preco">definir preço</span>
      ) : (
        <span className="cartao-produto__preco tabular">
          {formatarDinheiro(produto.preco)} <small>/{rotuloUnidade(produto.tipo_venda)}</small>
        </span>
      )}
      <Selo tipo={produto.tipo_venda} />
    </button>
  );
}
