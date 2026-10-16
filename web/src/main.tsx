// Estilos globais primeiro, para o CSS de cada tela poder sobrescrever.
import './estilos/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PaginaImpressao } from './telas/PaginaImpressao';

// ?view=nota&numero=N abre só a nota, para imprimir (6.5).
const parametros = new URLSearchParams(location.search);
const raiz =
  parametros.get('view') === 'nota' ? <PaginaImpressao numero={Number(parametros.get('numero'))} /> : <App />;

createRoot(document.getElementById('root')!).render(<StrictMode>{raiz}</StrictMode>);
