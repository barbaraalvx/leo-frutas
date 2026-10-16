import { useCallback, useEffect, useState } from 'react';
import { api, type DadosIniciais } from './api';
import { Dialogo } from './componentes/Dialogo';
import { Menu, type IdTela } from './componentes/Menu';
import type { Produto } from './dominio/tipos';
import { Notas } from './telas/Notas';
import { NovaNota } from './telas/NovaNota';
import { Painel } from './telas/Painel';
import { Precos } from './telas/Precos';

export function App() {
  const [tela, setTela] = useState<IdTela>('nova-nota');
  const [dados, setDados] = useState<DadosIniciais | null>(null);
  const [erroDados, setErroDados] = useState<string | null>(null);
  // Preços com alteração não salva: sair da tela pede confirmação (6.4).
  const [pendenciasPrecos, setPendenciasPrecos] = useState(0);
  const [destinoPendente, setDestinoPendente] = useState<IdTela | null>(null);

  useEffect(() => {
    api.getDadosIniciais().then(setDados, (e: Error) => setErroDados(e.message));
  }, []);

  // Fechar a aba ou recarregar com preços não salvos: o navegador pergunta.
  useEffect(() => {
    if (pendenciasPrecos === 0) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendenciasPrecos]);

  const atualizarProdutos = useCallback(
    (produtos: Produto[]) => setDados((d) => (d ? { ...d, produtos } : d)),
    [],
  );

  function escolherTela(destino: IdTela) {
    if (tela === 'precos' && destino !== 'precos' && pendenciasPrecos > 0) setDestinoPendente(destino);
    else setTela(destino);
  }

  return (
    <div className="app">
      <Menu ativa={tela} aoEscolher={escolherTela} />
      <main className="conteudo">
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
