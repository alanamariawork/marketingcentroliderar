import { useId, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Barra de filtros em uma única linha (quebra em telas pequenas). */
export function BarraFiltros({
  children,
  ativos,
  onLimpar,
}: {
  children: ReactNode
  ativos?: number
  onLimpar?: () => void
}) {
  return (
    <div role="group" aria-label="Filtros" className="flex flex-wrap items-end gap-3">
      {children}
      {!!ativos && onLimpar && (
        <button type="button" className="btn-ghost text-ink-muted" onClick={onLimpar}>
          <X className="size-4" aria-hidden />
          Limpar filtros ({ativos})
        </button>
      )}
    </div>
  )
}

export function Filtro<T extends string>({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string
  valor: T
  onChange: (v: T) => void
  opcoes: { valor: T; nome: string }[]
}) {
  const id = useId()
  return (
    <div className="min-w-36 flex-1 sm:flex-none">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-muted">
        {rotulo}
      </label>
      <select id={id} className="field-control py-1.5" value={valor} onChange={(e) => onChange(e.target.value as T)}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Botões segmentados (ex.: Mês / Semana). */
export function Segmentado<T extends string>({
  rotulo,
  valor,
  onChange,
  opcoes,
}: {
  rotulo: string
  valor: T
  onChange: (v: T) => void
  opcoes: { valor: T; nome: string }[]
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-[var(--radius-control)] border border-line-strong bg-surface p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={
            valor === o.valor
              ? 'rounded-[calc(var(--radius-control)-2px)] bg-brand-700 px-3 py-1 text-sm font-medium text-brand-contrast'
              : 'rounded-[calc(var(--radius-control)-2px)] px-3 py-1 text-sm font-medium text-ink-soft hover:bg-surface-muted'
          }
        >
          {o.nome}
        </button>
      ))}
    </div>
  )
}
