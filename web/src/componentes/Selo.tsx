import { rotuloUnidade } from '../dominio/formatacao';
import type { TipoVenda } from '../dominio/tipos';

/** Selo de unidade: kg em verde, os outros em pêssego. */
export function Selo({ tipo }: { tipo: TipoVenda }) {
  return <span className={`selo ${tipo === 'kg' ? 'selo--verde' : 'selo--pessego'}`}>{rotuloUnidade(tipo)}</span>;
}
