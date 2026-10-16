import { CircleAlert, CircleCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DadosAviso {
  texto: string;
  tipo: 'sucesso' | 'erro';
}

/** Aviso que some sozinho em 3 s (README, seção 6). */
export function useAviso() {
  const [aviso, setAviso] = useState<DadosAviso | null>(null);
  const timer = useRef<number>();

  const mostrar = useCallback((texto: string, tipo: DadosAviso['tipo'] = 'sucesso') => {
    window.clearTimeout(timer.current);
    setAviso({ texto, tipo });
    timer.current = window.setTimeout(() => setAviso(null), 3000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { aviso, mostrar };
}

export function Aviso({ aviso }: { aviso: DadosAviso | null }) {
  return (
    <div className="aviso-regiao" role="status" aria-live="polite">
      {aviso && (
        <div className="aviso">
          {aviso.tipo === 'sucesso' ? (
            <CircleCheck className="aviso__icone--sucesso" size={18} aria-hidden />
          ) : (
            <CircleAlert className="aviso__icone--erro" size={18} aria-hidden />
          )}
          {aviso.texto}
        </div>
      )}
    </div>
  );
}
