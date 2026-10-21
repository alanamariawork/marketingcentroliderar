import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Atividade, EmpresaId } from '../data/types'
import { useDadosDaEmpresa } from '../state/Sessao'
import { useModais } from '../state/Modais'
import { atividadesDoDia, navegar, periodoDe, VISUALIZACOES, type Visualizacao } from '../lib/calendario'
import { formatarData, formatarDiaSemana, formatarMesAno, gradeDoMes, hoje, NOMES_DIAS_CURTOS } from '../lib/dates'
import { cx } from '../lib/format'

export function Cronograma({ empresaId }: { empresaId: EmpresaId }) {
  const { atividades } = useDadosDaEmpresa(empresaId)
  const [vis, setVis] = useState<Visualizacao>('Mensal')
  const [ancora, setAncora] = useState(hoje)
  const periodo = periodoDe(vis, ancora)
  const noPeriodo = atividades.filter((a) => a.dataPostagem >= periodo.inicio && a.dataPostagem <= periodo.fim).length
  const semData = atividades.filter((a) => !a.dataPostagem)
  const abrirDia = (dia: string) => {
    setAncora(dia)
    setVis('Diária')
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div role="group" aria-label="Visualização" className="flex flex-wrap gap-1 rounded-[var(--radius-control)] bg-surface-muted p-1">
          {VISUALIZACOES.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vis === v}
              onClick={() => setVis(v)}
              className={cx(
                'rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors',
                vis === v ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-ink-muted hover:text-ink',
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary px-2.5" aria-label="Período anterior" onClick={() => setAncora(navegar(vis, ancora, -1))}>
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" className="btn-secondary" onClick={() => setAncora(hoje())}>
            Hoje
          </button>
          <button type="button" className="btn-secondary px-2.5" aria-label="Próximo período" onClick={() => setAncora(navegar(vis, ancora, 1))}>
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Ir para a data
          <input type="date" className="field-control w-auto" value={ancora} onChange={(e) => e.target.value && setAncora(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink first-letter:uppercase" aria-live="polite">
          {periodo.titulo}
        </h2>
        <p className="text-sm text-ink-muted">
          {noPeriodo} {noPeriodo === 1 ? 'postagem' : 'postagens'} · horário de Fortaleza
        </p>
      </div>
      <p className="-mt-2 text-xs text-ink-muted">
        Datas planejadas em Atividades. Clique em um dia para abrir a agenda ou em um conteúdo para ver os detalhes.
      </p>

      {periodo.dias.length > 0 ? (
        <div className="relative overflow-x-auto pb-2">
          <div
            className={cx('grid gap-2', vis === 'Semanal' ? 'min-w-[920px] grid-cols-7' : 'grid-cols-1')}
          >
            {periodo.dias.map((dia) => (
              <DiaAgenda key={dia} dia={dia} atividades={atividadesDoDia(atividades, dia)} compacto={vis === 'Semanal'} />
            ))}
          </div>
        </div>
      ) : vis === 'Mensal' ? (
        <div className="relative overflow-x-auto pb-2">
          <MesCompleto mes={periodo.meses[0]} atividades={atividades} onDia={abrirDia} />
        </div>
      ) : (
        <div className="relative overflow-x-auto pb-2">
          {/* Trimestral: 1 fileira; Semestral: 2 fileiras; Anual: 4 fileiras — sempre 3 meses por fileira */}
          <div className="grid min-w-[780px] grid-cols-3 gap-3">
            {periodo.meses.map((m) => (
              <MiniMes key={m} mes={m} atividades={atividades} onDia={abrirDia} />
            ))}
          </div>
        </div>
      )}

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">Sem data definida ({semData.length})</summary>
        <div className="mt-3 space-y-2">
          {semData.length ? (
            semData.map((a) => <BotaoEvento key={a.id} a={a} />)
          ) : (
            <p className="text-sm text-ink-muted">Todas as atividades têm data definida.</p>
          )}
        </div>
      </details>
    </div>
  )
}

function BotaoEvento({ a, compacto }: { a: Atividade; compacto?: boolean }) {
  const { abrir } = useModais()
  const cor = {
    'Em produção': 'border-l-producao',
    'Ajustes solicitados': 'border-l-ajustes',
    'Aguardando aprovação': 'border-l-aprovacao',
    Aprovado: 'border-l-aprovado',
  }[a.status]
  return (
    <button
      type="button"
      onClick={() => abrir({ tipo: 'atividade', id: a.id })}
      className={cx(
        'block w-full rounded-[6px] border border-l-[3px] border-line bg-surface px-2 py-1.5 text-left transition-colors hover:bg-surface-muted',
        cor,
      )}
    >
      <span className="block text-xs font-semibold text-ink tabular-nums">{a.horaPostagem || 'Hora a definir'}</span>
      <span className={cx('block text-sm text-ink-soft', compacto && 'line-clamp-3 text-xs')}>{a.titulo}</span>
      <span className="block text-[11px] text-ink-muted">
        {a.formato} · {a.status}
      </span>
    </button>
  )
}

function DiaAgenda({ dia, atividades, compacto }: { dia: string; atividades: Atividade[]; compacto: boolean }) {
  const ehHoje = dia === hoje()
  return (
    <section
      aria-label={`${formatarData(dia)}: ${atividades.length} postagens`}
      className={cx('card flex min-h-52 flex-col gap-2 p-3', ehHoje && 'ring-2 ring-brand-500')}
    >
      <h3 className="flex items-center justify-between gap-2 text-xs font-semibold text-ink-soft first-letter:uppercase">
        <span className="first-letter:uppercase">{formatarDiaSemana(dia)}</span>
        {ehHoje && <span className="rounded bg-brand-700 px-1.5 py-0.5 text-[10px] text-white">Hoje</span>}
      </h3>
      {atividades.length ? (
        atividades.map((a) => <BotaoEvento key={a.id} a={a} compacto={compacto} />)
      ) : (
        <p className="text-xs text-ink-muted">Nenhuma postagem planejada.</p>
      )}
    </section>
  )
}

function MesCompleto({ mes, atividades, onDia }: { mes: string; atividades: Atividade[]; onDia: (d: string) => void }) {
  const dias = gradeDoMes(mes)
  const mesAtual = mes.slice(0, 7)
  return (
    <div className="card min-w-[760px] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-surface-muted">
        {NOMES_DIAS_CURTOS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-xs font-semibold text-ink-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const fora = dia.slice(0, 7) !== mesAtual
          const lista = atividadesDoDia(atividades, dia)
          const ehHoje = dia === hoje()
          return (
            <div key={dia} className={cx('min-h-28 border-r border-b border-line p-1.5 [&:nth-child(7n)]:border-r-0', fora && 'bg-canvas/60')}>
              <button
                type="button"
                onClick={() => onDia(dia)}
                aria-label={`${formatarData(dia)}: ${lista.length} postagens. Abrir agenda do dia`}
                className={cx(
                  'mb-1 inline-flex size-7 items-center justify-center rounded-full text-xs font-medium tabular-nums hover:bg-surface-muted',
                  ehHoje ? 'bg-brand-700 text-white hover:bg-brand-600' : fora ? 'text-ink-muted/70' : 'text-ink-soft',
                )}
              >
                {Number(dia.slice(8))}
              </button>
              <div className="space-y-1">
                {lista.map((a) => (
                  <BotaoEvento key={a.id} a={a} compacto />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniMes({ mes, atividades, onDia }: { mes: string; atividades: Atividade[]; onDia: (d: string) => void }) {
  const mesAtual = mes.slice(0, 7)
  return (
    <section className="card p-3" aria-label={formatarMesAno(mes)}>
      <h3 className="mb-2 text-sm font-semibold text-ink first-letter:uppercase">{formatarMesAno(mes)}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {NOMES_DIAS_CURTOS.map((d) => (
          <span key={d} className="py-0.5 text-[10px] font-semibold text-ink-muted">
            {d}
          </span>
        ))}
        {gradeDoMes(mes).map((dia) => {
          if (dia.slice(0, 7) !== mesAtual) return <span key={dia} aria-hidden />
          const n = atividadesDoDia(atividades, dia).length
          const ehHoje = dia === hoje()
          return (
            <button
              key={dia}
              type="button"
              onClick={() => onDia(dia)}
              aria-label={`${formatarData(dia)}: ${n} postagens`}
              className={cx(
                'relative flex h-8 flex-col items-center justify-center rounded-[6px] text-xs tabular-nums hover:bg-surface-muted',
                ehHoje && 'bg-brand-700 font-semibold text-white hover:bg-brand-600',
                !ehHoje && n > 0 && 'bg-brand-50 font-semibold text-brand-700',
              )}
            >
              {Number(dia.slice(8))}
              {n > 0 && <span className="text-[9px] leading-none">{n}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
