import { useState } from 'react';
import { EmConstrucao } from './componentes/EmConstrucao';
import { Menu, type IdTela } from './componentes/Menu';
import { NovaNota } from './telas/NovaNota';

export function App() {
  const [tela, setTela] = useState<IdTela>('nova-nota');

  return (
    <div className="app">
      <Menu ativa={tela} aoEscolher={setTela} />
      <main className="conteudo">
        {tela === 'nova-nota' && <NovaNota />}
        {tela === 'notas' && <EmConstrucao titulo="Notas" fase={4} />}
        {tela === 'precos' && <EmConstrucao titulo="Preços" fase={4} />}
        {tela === 'painel' && <EmConstrucao titulo="Painel" fase={5} />}
      </main>
    </div>
  );
}
