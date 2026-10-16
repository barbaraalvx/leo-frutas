import { useEffect, useState } from 'react';
import { api, type DadosIniciais } from './api';
import { EmConstrucao } from './componentes/EmConstrucao';
import { Menu, type IdTela } from './componentes/Menu';
import { NovaNota } from './telas/NovaNota';

export function App() {
  const [tela, setTela] = useState<IdTela>('nova-nota');
  const [dados, setDados] = useState<DadosIniciais | null>(null);
  const [erroDados, setErroDados] = useState<string | null>(null);

  useEffect(() => {
    api.getDadosIniciais().then(setDados, (e: Error) => setErroDados(e.message));
  }, []);

  return (
    <div className="app">
      <Menu ativa={tela} aoEscolher={setTela} />
      <main className="conteudo">
        {tela === 'nova-nota' && <NovaNota dados={dados} erroDados={erroDados} />}
        {tela === 'notas' && <EmConstrucao titulo="Notas" fase={4} />}
        {tela === 'precos' && <EmConstrucao titulo="Preços" fase={4} />}
        {tela === 'painel' && <EmConstrucao titulo="Painel" fase={5} />}
      </main>
    </div>
  );
}
