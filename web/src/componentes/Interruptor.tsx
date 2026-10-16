interface Props {
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
  rotulo: string;
  desativado?: boolean;
}

/** Interruptor liga/desliga (ativar ou desativar produto). */
export function Interruptor({ ligado, aoMudar, rotulo, desativado }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      className="interruptor"
      disabled={desativado}
      onClick={() => aoMudar(!ligado)}
    >
      <span className="interruptor__trilho" aria-hidden>
        <span className="interruptor__botao" />
      </span>
    </button>
  );
}
