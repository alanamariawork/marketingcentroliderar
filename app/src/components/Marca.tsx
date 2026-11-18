import { NOME_DO_SISTEMA } from '../data/constants'

/**
 * Marca exibida no menu, no mesmo formato do backoffice do Centro Liderar:
 * símbolo "CL" em degradê grafite→dourado, nome e módulo.
 */
export function Marca() {
  const [nome, subtitulo] = NOME_DO_SISTEMA.split(' — ')
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[linear-gradient(135deg,var(--color-brand-700),var(--color-accent))] text-[12px] font-bold tracking-[0.02em] text-sidebar-label shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
      >
        CL
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-[-0.01em] text-white">{nome}</p>
        <p className="text-xs text-sidebar-muted">{subtitulo}</p>
      </div>
    </div>
  )
}
