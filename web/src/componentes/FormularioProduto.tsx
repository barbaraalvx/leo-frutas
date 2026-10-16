import { useState, type FormEvent } from 'react';
import { formatarCentavosCampo, lerDinheiro, rotuloUnidade } from '../dominio/formatacao';
import { CATEGORIAS, TIPOS_VENDA, type Categoria, type Produto, type TipoVenda } from '../dominio/tipos';
import { NOME_PRODUTO_MAX } from '../dominio/validacao';
import { Dialogo } from './Dialogo';

export interface DadosFormulario {
  nome: string;
  categoria: Categoria;
  tipo_venda: TipoVenda;
  preco: number | null;
}

interface Props {
  /** Sem produto = novo. */
  produto?: Produto;
  aoSalvar: (dados: DadosFormulario) => Promise<void>;
  aoFechar: () => void;
}

/** Novo produto ou edição de nome, categoria, tipo e preço (6.4). */
export function FormularioProduto({ produto, aoSalvar, aoFechar }: Props) {
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [categoria, setCategoria] = useState<Categoria>(produto?.categoria ?? 'Frutas');
  const [tipo, setTipo] = useState<TipoVenda>(produto?.tipo_venda ?? 'kg');
  const [preco, setPreco] = useState(produto?.preco != null ? formatarCentavosCampo(produto.preco) : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro('Digite o nome do produto.');
    const precoLido = preco.trim() === '' ? null : lerDinheiro(preco);
    if (preco.trim() !== '' && precoLido === null) return setErro('Preço inválido. Use, por exemplo, 22,00.');
    setErro(null);
    setSalvando(true);
    try {
      await aoSalvar({ nome: nomeLimpo, categoria, tipo_venda: tipo, preco: precoLido });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setSalvando(false);
    }
  }

  return (
    <Dialogo
      titulo={produto ? 'Editar produto' : 'Novo produto'}
      aoFechar={() => !salvando && aoFechar()}
      acoes={
        <>
          <button type="button" className="botao botao--secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </button>
          <button type="submit" form="formulario-produto" className="botao botao--principal" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar produto'}
          </button>
        </>
      }
    >
      <form id="formulario-produto" className="formulario" onSubmit={enviar}>
        <label>
          <span className="rotulo">Nome</span>
          <input
            className="campo"
            value={nome}
            maxLength={NOME_PRODUTO_MAX}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Pêssego"
          />
        </label>

        <fieldset className="formulario__grupo">
          <legend className="rotulo">Categoria</legend>
          <div className="opcoes">
            {CATEGORIAS.map((c) => (
              <label key={c} className="opcao">
                <input type="radio" name="categoria" checked={categoria === c} onChange={() => setCategoria(c)} />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="formulario__grupo">
          <legend className="rotulo">Vende por</legend>
          <div className="opcoes">
            {TIPOS_VENDA.map((t) => (
              <label key={t} className="opcao">
                <input type="radio" name="tipo" checked={tipo === t} onChange={() => setTipo(t)} />
                <span>{t === 'kg' ? 'quilo (kg)' : rotuloUnidade(t)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span className="rotulo">Preço por {rotuloUnidade(tipo)} (opcional)</span>
          <span className="campo-dinheiro">
            <span aria-hidden>R$</span>
            <input
              className="campo campo--numero"
              inputMode="decimal"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="definir depois"
            />
          </span>
        </label>

        {erro && (
          <p className="texto-erro" role="alert">
            {erro}
          </p>
        )}
      </form>
    </Dialogo>
  );
}
