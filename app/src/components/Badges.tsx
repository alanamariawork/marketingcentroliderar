import { ChevronsUp, Equal, ChevronDown } from 'lucide-react'
import { responsavelPorId } from '../data/constants'
import type { Prioridade, ResponsavelId, StatusAtividade, StatusConteudo } from '../data/types'
import { cx } from '../lib/format'

/* ---------- Responsável: avatar circular com iniciais + nome ---------- */

const CORES_PESSOA: Record<string, { forte: string; suave: string }> = {
  anny: { forte: 'var(--color-pessoa-anny)', suave: 'var(--color-pessoa-anny-soft)' },
  carlos: { forte: 'var(--color-pessoa-carlos)', suave: 'var(--color-pessoa-carlos-soft)' },
  jordana: { forte: 'var(--color-pessoa-jordana)', suave: 'var(--color-pessoa-jordana-soft)' },
  nenhum: { forte: 'var(--color-pessoa-nenhum)', suave: 'var(--color-pessoa-nenhum-soft)' },
}

export function SeloResponsavel({
  id,
  compacto = false,
  className,
}: {
  id: ResponsavelId
  /** Só o avatar (o nome continua disponível para leitores de tela e na dica). */
  compacto?: boolean
  className?: string
}) {
  const r = responsavelPorId(id)
  const cores = CORES_PESSOA[id ?? 'nenhum']
  return (
    <span
      className={cx('inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-soft', className)}
      title={`Responsável: ${r.nome}`}
    >
      <span
        aria-hidden
        className={cx(
          'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tracking-wide',
          id === null && 'border border-dashed',
        )}
        style={{
          color: id === null ? cores.forte : '#fff',
          background: id === null ? cores.suave : cores.forte,
          borderColor: cores.forte,
        }}
      >
        {r.iniciais}
      </span>
      <span className={cx('truncate', compacto && 'sr-only')}>
        <span className="sr-only">Responsável: </span>
        {r.nome}
      </span>
    </span>
  )
}

/* ---------- Status: etiqueta retangular com ponto ---------- */

const CORES_STATUS: Record<StatusConteudo | StatusAtividade, string> = {
  Ideia: 'bg-gray-100 text-gray-700 [--dot:#6b7280]',
  'Em produção': 'bg-sky-50 text-sky-800 [--dot:#0284c7]',
  'Em aprovação': 'bg-amber-50 text-amber-800 [--dot:#d97706]',
  Agendado: 'bg-indigo-50 text-indigo-800 [--dot:#4f46e5]',
  Publicado: 'bg-green-50 text-green-800 [--dot:#16a34a]',
  'A fazer': 'bg-gray-100 text-gray-700 [--dot:#6b7280]',
  'Em andamento': 'bg-sky-50 text-sky-800 [--dot:#0284c7]',
  'Em revisão': 'bg-amber-50 text-amber-800 [--dot:#d97706]',
  Concluído: 'bg-green-50 text-green-800 [--dot:#16a34a]',
}

export function SeloStatus({ status }: { status: StatusConteudo | StatusAtividade }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        CORES_STATUS[status],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--dot)]" />
      <span className="sr-only">Status: </span>
      {status}
    </span>
  )
}

/* ---------- Prioridade: ícone + texto, com contorno ---------- */

const PRIORIDADE: Record<Prioridade, { Icone: typeof ChevronsUp; classe: string }> = {
  Alta: { Icone: ChevronsUp, classe: 'border-red-300 text-red-700' },
  Média: { Icone: Equal, classe: 'border-amber-300 text-amber-800' },
  Baixa: { Icone: ChevronDown, classe: 'border-gray-300 text-gray-600' },
}

export function SeloPrioridade({ prioridade }: { prioridade: Prioridade }) {
  const { Icone, classe } = PRIORIDADE[prioridade]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border bg-surface py-0.5 pr-2 pl-1 text-xs font-medium whitespace-nowrap',
        classe,
      )}
    >
      <Icone className="size-3.5" aria-hidden />
      <span className="sr-only">Prioridade: </span>
      {prioridade}
    </span>
  )
}

/** Etiqueta neutra para formato/plataforma/tipo. */
export function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-line bg-surface-muted px-1.5 py-0.5 text-xs text-ink-soft whitespace-nowrap">
      {children}
    </span>
  )
}
