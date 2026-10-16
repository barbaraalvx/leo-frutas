import { BarChart3, Files, Receipt, Tag, type LucideIcon } from 'lucide-react';
import logo from '../../../design-system/logo-leo-frutas.png';

export type IdTela = 'nova-nota' | 'notas' | 'precos' | 'painel';

const ITENS: { id: IdTela; rotulo: string; Icone: LucideIcon }[] = [
  { id: 'nova-nota', rotulo: 'Nova nota', Icone: Receipt },
  { id: 'notas', rotulo: 'Notas', Icone: Files },
  { id: 'precos', rotulo: 'Preços', Icone: Tag },
  { id: 'painel', rotulo: 'Painel', Icone: BarChart3 },
];

interface Props {
  ativa: IdTela;
  aoEscolher: (tela: IdTela) => void;
}

export function Menu({ ativa, aoEscolher }: Props) {
  return (
    <nav className="menu" aria-label="Menu principal">
      <img className="menu__logo" src={logo} alt="Léo Frutas" />
      {ITENS.map(({ id, rotulo, Icone }) => (
        <button
          key={id}
          type="button"
          className="menu__item"
          aria-current={id === ativa ? 'page' : undefined}
          onClick={() => aoEscolher(id)}
        >
          <Icone size={22} strokeWidth={1.5} aria-hidden />
          {rotulo}
        </button>
      ))}
    </nav>
  );
}
