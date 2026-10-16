import { useCallback, useEffect, useState } from 'react';
import { api, type DadosIniciais } from './api';
import { guardarDados, lerDadosGuardados } from './armazenamento';
import { Dialogo } from './componentes/Dialogo';
import { FaixaConexao } from './componentes/FaixaConexao';
import { Menu, type IdTela } from './componentes/Menu';
import type { Produto } from './dominio/tipos';
import { Notas } from './telas/Notas';
import { NovaNota } from './telas/NovaNota';
import { Painel } from './telas/Painel';
import { Precos } from './telas/Precos';

export function App() {
  const [tela, setTela] = useState<IdTela>('nova-nota');
  // Abre na hora com os dados guardados; a planilha atualiza em seguida.
  const [guardados] = useState(lerDadosGuardados);
  const [dados, setDados] = useState<DadosIniciais | null>(guardados?.dados ?? null);
  const [erroDados, setErroDados] = useState<string | null>(null);
  const [usandoGuardadosDe, setUsandoGuardadosDe] = useState<string | null>(null);
  // Preços com alteração não salva: sair da tela pede confirmação (6.4).
  const [pendenciasPrecos, setPendenciasPrecos] = useState(0);
  const [destinoPendente, setDestinoPendente] = useState<IdTela | null>(null);

  const carregarDados = useCallback(() => {
    setErroDados(null);
    api.getDadosIniciais().then(
      (novos) => {
        setDados(novos);
        setUsandoGuardadosDe(null);
        guardarDados(novos);
      },
      (e: Error) => {
        // Com dados guardados o app segue funcionando; a faixa avisa.
        if (guardados) setUsandoGuardadosDe(guardados.salvoEm);
        else setErroDados(e.message);
      },
    );
  }, [guardados]);

  useEffect(carregarDados, [carregarDados]);

  // Fechar a aba ou recarregar com preços não salvos: o navegador pergunta.
  useEffect(() => {
    if (pendenciasPrecos === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendenciasPrecos]);

  const atualizarProdutos = useCallback((produtos: Produto[]) => {
    setDados((d) => {
      if (!d) return d;
      const novos = { ...d, produtos };
      guardarDados(novos);
      return novos;
    });
  }, []);

  function escolherTela(destino: IdTela) {
    if (tela === 'precos' && destino !== 'precos' && pendenciasPrecos > 0) setDestinoPendente(destino);
    else setTela(destino);
  }

  return (
    <div className="app">
      <Menu ativa={tela} aoEscolher={escolherTela} />
      <main className="conteudo">
        <FaixaConexao usandoGuardadosDe={usandoGuardadosDe} aoTentarDeNovo={carregarDados} />
        {tela === 'nova-nota' && <NovaNota dados={dados} erroDados={erroDados} />}
        {tela === 'notas' && <Notas config={dados?.config ?? null} />}
        {tela === 'precos' && (
          <Precos
            produtos={dados?.produtos ?? null}
            erroDados={erroDados}
            aoAtualizarProdutos={atualizarProdutos}
            aoMudarPendencias={setPendenciasPrecos}
          />
        )}
        {tela === 'painel' && <Painel />}
      </main>

      {destinoPendente && (
        <Dialogo
          titulo="Sair sem salvar?"
          aoFechar={() => setDestinoPendente(null)}
          acoes={
            <>
              <button type="button" className="botao botao--secundario" onClick={() => setDestinoPendente(null)}>
                Continuar editando
              </button>
              <button
                type="button"
                className="botao botao--perigo"
                onClick={() => {
                  setTela(destinoPendente);
                  setDestinoPendente(null);
                }}
              >
                Sair sem salvar
              </button>
            </>
          }
        >
          <p>
            {pendenciasPrecos === 1
              ? 'Um produto tem alteração que ainda não foi para a planilha.'
              : `${pendenciasPrecos} produtos têm alterações que ainda não foram para a planilha.`}
          </p>
        </Dialogo>
      )}
    </div>
  );
}
