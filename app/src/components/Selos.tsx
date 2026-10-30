import { AlertTriangle, CheckCircle2, Eye, Film, Hammer, Image as ImageIcon } from 'lucide-react'
import type { Responsavel, StatusAtividade, StatusCriativo, TipoMidia } from '../data/types'
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

/* ---------- Criativos ---------- */

const ESTILO_STATUS_CRIATIVO: Record<StatusCriativo, { classe: string; icone: typeof Eye }> = {
  'Em produção': { classe: 'border-producao/40 bg-producao-soft text-producao', icone: Hammer },
  'Em revisão': { classe: 'border-aprovacao/40 bg-aprovacao-soft text-aprovacao', icone: Eye },
  'Ajustes solicitados': { classe: 'border-ajustes/40 bg-ajustes-soft text-ajustes', icone: AlertTriangle },
  Aprovado: { classe: 'border-aprovado/40 bg-aprovado-soft text-aprovado', icone: CheckCircle2 },
}

/** Status: retângulo com borda, ícone e texto (não depende só da cor). */
export function SeloStatusCriativo({ status }: { status: StatusCriativo }) {
  const { classe, icone: Icone } = ESTILO_STATUS_CRIATIVO[status]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-[6px] border px-1.5 py-0.5 text-[11px] font-semibold', classe)}>
      <Icone className="size-3" aria-hidden />
      <span className="sr-only">Status: </span>
      {status}
    </span>
  )
}

/** Tipo de arquivo: pílula escura com ícone e texto, diferente do selo de status. */
export function SeloTipo({ tipo, sobreImagem }: { tipo: TipoMidia; sobreImagem?: boolean }) {
  const Icone = tipo === 'Vídeo' ? Film : ImageIcon
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        sobreImagem ? 'bg-black/70 text-white' : 'bg-ink text-surface',
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      <span className="sr-only">Tipo: </span>
      {tipo}
    </span>
  )
}
