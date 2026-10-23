import type { Responsavel, StatusAtividade } from '../data/types'
import { cx } from '../lib/format'

const ESTILO_STATUS: Record<StatusAtividade, string> = {
  'Em produção': 'bg-producao-soft text-producao',
  'Ajustes solicitados': 'bg-ajustes-soft text-ajustes',
  'Aguardando aprovação': 'bg-aprovacao-soft text-aprovacao',
  Aprovado: 'bg-aprovado-soft text-aprovado',
}

export function SeloStatus({ status }: { status: StatusAtividade }) {
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', ESTILO_STATUS[status])}>
      {status}
    </span>
  )
}

export function SeloPessoa({ nome }: { nome: Responsavel }) {
  const sem = nome === 'Sem responsável'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <span
        className="inline-flex size-6 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-soft ring-1 ring-line"
        aria-hidden
      >
        {sem ? '—' : nome[0]}
      </span>
      {nome}
    </span>
  )
}

export function Etiqueta({ children, tom = 'neutro' }: { children: React.ReactNode; tom?: 'neutro' | 'aviso' | 'info' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium',
        tom === 'aviso' && 'bg-warning-soft text-warning',
        tom === 'info' && 'bg-brand-50 text-brand-600',
        tom === 'neutro' && 'bg-surface-muted text-ink-muted',
      )}
    >
      {children}
    </span>
  )
}

/** Caixa de observação/aviso dentro das páginas. */
export function Nota({ children, tom = 'neutro' }: { children: React.ReactNode; tom?: 'neutro' | 'aviso' }) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius-control)] border px-3.5 py-2.5 text-sm',
        tom === 'aviso' ? 'border-warning/25 bg-warning-soft text-warning' : 'border-line bg-surface-muted text-ink-soft',
      )}
    >
      {children}
    </div>
  )
}
