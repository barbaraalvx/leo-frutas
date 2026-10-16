// Estilos globais primeiro, para o CSS de cada tela poder sobrescrever.
import './estilos/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import icone from '../../icones/icone-64.png';
import { parametrosDaPagina } from './api';
import { App } from './App';
import { PaginaImpressao } from './telas/PaginaImpressao';

// Ícone da aba. Importado aqui (e não no index.html) para o build embutir a
// imagem no HTML único. No app publicado no Google a aba é da página de fora
// do iframe: lá o ícone vem de url_icone (apps-script/Code.ts).
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/png';
link.href = icone;
document.head.appendChild(link);

// ?view=nota&numero=N abre só a nota, para imprimir (6.5).
const parametros = parametrosDaPagina();
const raiz =
  parametros.get('view') === 'nota' ? <PaginaImpressao numero={Number(parametros.get('numero'))} /> : <App />;

createRoot(document.getElementById('root')!).render(<StrictMode>{raiz}</StrictMode>);
