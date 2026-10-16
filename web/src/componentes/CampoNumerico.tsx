import { forwardRef, useRef, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> & {
  /** Texto mostrado quando o campo não está sendo editado. */
  exibido: string;
  /** A cada tecla (para o total acompanhar enquanto digita). */
  aoDigitar?: (texto: string) => void;
  /** Ao sair do campo ou apertar Enter. Esc desiste. */
  aoConfirmar?: (texto: string) => void;
};

/**
 * Campo de número que guarda o texto digitado enquanto tem foco e volta a
 * mostrar o valor formatado ao sair (1,2 → 1,200).
 */
export const CampoNumerico = forwardRef<HTMLInputElement, Props>(function CampoNumerico(
  { exibido, aoDigitar, aoConfirmar, className = '', onFocus, onKeyDown, ...resto },
  ref,
) {
  const [texto, setTexto] = useState<string | null>(null);
  const desistiu = useRef(false);

  return (
    <input
      {...resto}
      ref={ref}
      type="text"
      autoComplete="off"
      className={`campo campo--numero ${className}`}
      value={texto ?? exibido}
      onFocus={(e) => {
        setTexto(exibido);
        desistiu.current = false;
        e.currentTarget.select();
        onFocus?.(e);
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        aoDigitar?.(e.target.value);
      }}
      onBlur={() => {
        if (!desistiu.current && texto !== null) aoConfirmar?.(texto);
        setTexto(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          desistiu.current = true;
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
});
