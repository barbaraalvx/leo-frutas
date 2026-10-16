import logo from '../../../design-system/logo-leo-frutas.png';
import {
  formatarDataHora,
  formatarDinheiro,
  formatarNumeroNota,
  formatarQuantidade,
  rotuloUnidade,
} from '../dominio/formatacao';
import type { Config, Nota } from '../dominio/tipos';
import '../estilos/nota-impressa.css';

interface Props {
  nota: Nota;
  config: Config;
}

/**
 * A folha A4 da nota (6.5). O mesmo componente aparece na pré-visualização e
 * na página de impressão, para o papel sair igual ao que se vê na tela.
 */
export function NotaImpressa({ nota, config }: Props) {
  const cancelada = nota.status === 'cancelada';

  return (
    <article className="folha" aria-label={`Nota de pedido ${formatarNumeroNota(nota.numero)}`}>
      <header className="folha__cabecalho">
        <img className="folha__logo" src={logo} alt="" />
        <div className="folha__loja">
          <h1 className="folha__nome-loja">{config.nome_loja.toLocaleUpperCase('pt-BR')}</h1>
          <p>
            {config.vendedor} · {config.telefone}
          </p>
          <p>{config.endereco}</p>
          <p>{config.cidade}</p>
        </div>
        <div className="folha__numero">
          <p className="folha__titulo-nota">
            NOTA DE PEDIDO Nº <span className="tabular">{formatarNumeroNota(nota.numero)}</span>
          </p>
          <p className="tabular">{formatarDataHora(nota.data_hora)}</p>
        </div>
      </header>

      {cancelada && (
        <p className="folha__cancelada">
          CANCELADA{nota.observacao && <span> · {nota.observacao}</span>}
        </p>
      )}

      {nota.cliente && (
        <p className="folha__cliente">
          <strong>Cliente:</strong> {nota.cliente}
        </p>
      )}

      <table className="folha__tabela">
        <thead>
          <tr>
            <th className="folha__col-produto">Produto</th>
            <th className="folha__num">Qtd</th>
            <th>Un.</th>
            <th className="folha__num">Preço un.</th>
            <th className="folha__num">Total</th>
          </tr>
        </thead>
        <tbody>
          {nota.itens.map((item, i) => (
            <tr key={`${item.produto_id}-${i}`}>
              <td>{item.produto_nome}</td>
              <td className="folha__num">{formatarQuantidade(item.tipo_venda, item.quantidade)}</td>
              <td>{rotuloUnidade(item.tipo_venda)}</td>
              <td className="folha__num">{formatarDinheiro(item.preco_unitario)}</td>
              <td className="folha__num">{formatarDinheiro(item.valor_final)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="folha__total">
        <span>TOTAL</span>
        <span className="tabular">{formatarDinheiro(nota.total)}</span>
      </div>

      <footer className="folha__rodape">{config.rodape_nota}</footer>
    </article>
  );
}
