import { useMemo, useState } from 'react'
import { AtSign, CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { SeloResponsavel, SeloStatus } from '../components/Badges'
import { EstadoVazio } from '../components/Estados'
import { BarraFiltros, Filtro, Segmentado } from '../components/Filtros'
import { FORMATOS, RESPONSAVEIS, STATUS_CONTEUDO } from '../data/constants'
import type { Conta, Conteudo } from '../data/types'
import {
  NOMES_DIAS,
  NOMES_DIAS_CURTOS,
  diaDaSemana,
  diasDaSemana,
  formatarData,
  formatarDataExtensa,
  formatarIntervalo,
  formatarMesAno,
  gradeDoMes,
  hoje,
  inicioDaSemana,
  somarDias,
  somarMeses,
} from '../lib/dates'
import { cx } from '../lib/format'
import { useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'

type Visao = 'mes' | 'semana'
const TODOS = 'todos'
const SEM = 'sem'

const MAX_POR_DIA = 3

export function Cronograma() {
  const { conteudos, contas } = useDadosEmpresa()
  const { abrir } = useModais()
  const [visao, setVisao] = useState<Visao>('mes')
  const [referencia, setReferencia] = useState(hoje)
  const [fConta, setFConta] = useState(TODOS)
  const [fResp, setFResp] = useState(TODOS)
  const [fFormato, setFFormato] = useState(TODOS)
  const [fStatus, setFStatus] = useState(TODOS)
  const dataHoje = hoje()

  const filtrados = useMemo(
    () =>
      conteudos
        .filter(
          (c) =>
            (fConta === TODOS || c.contaId === fConta) &&
            (fResp === TODOS || (c.responsavel ?? SEM) === fResp) &&
            (fFormato === TODOS || c.formato === fFormato) &&
            (fStatus === TODOS || c.status === fStatus),
        )
        .sort((a, b) => a.horario.localeCompare(b.horario) || a.titulo.localeCompare(b.titulo)),
    [conteudos, fConta, fResp, fFormato, fStatus],
  )

  const porDia = useMemo(() => {
    const m = new Map<string, Conteudo[]>()
    for (const c of filtrados) m.set(c.data, [...(m.get(c.data) ?? []), c])
    return m
  }, [filtrados])

  const ativos = [fConta, fResp, fFormato, fStatus].filter((f) => f !== TODOS).length
  const limpar = () => {
    setFConta(TODOS)
    setFResp(TODOS)
    setFFormato(TODOS)
    setFStatus(TODOS)
  }

  if (contas.length === 0 && conteudos.length === 0) {
    return (
      <EstadoVazio
        icone={AtSign}
        titulo="Nenhuma conta cadastrada. Adicione uma conta para começar."
        acao="Adicionar conta"
        onAcao={() => abrir({ tipo: 'conta' })}
      >
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          Contas são os perfis e canais de comunicação da empresa (Instagram, YouTube, LinkedIn…). Cada conteúdo é
          publicado em uma conta.
        </p>
      </EstadoVazio>
    )
  }
  if (conteudos.length === 0) {
    return (
      <EstadoVazio
        icone={CalendarDays}
        titulo="Nenhum conteúdo programado. Adicione o primeiro conteúdo desta empresa."
        acao="Adicionar conteúdo"
        onAcao={() => abrir({ tipo: 'conteudo' })}
      />
    )
  }

  const dias = visao === 'mes' ? gradeDoMes(referencia) : diasDaSemana(referencia)
  const rotuloPeriodo =
    visao === 'mes' ? formatarMesAno(referencia) : formatarIntervalo(inicioDaSemana(referencia), somarDias(inicioDaSemana(referencia), 6))
  const mesAtual = referencia.slice(0, 7)
  const doPeriodo = visao === 'mes' ? dias.filter((d) => d.startsWith(mesAtual)) : dias
  const totalNoPeriodo = doPeriodo.reduce((n, d) => n + (porDia.get(d)?.length ?? 0), 0)

  const mover = (dir: 1 | -1) =>
    setReferencia((r) => (visao === 'mes' ? somarMeses(r, dir) : somarDias(r, 7 * dir)))

  const abrirConteudo = (c: Conteudo) => abrir({ tipo: 'detalhe-conteudo', id: c.id })
  const adicionarEm = (data: string) => abrir({ tipo: 'conteudo', data })

  return (
    <div className="space-y-4">
      <BarraFiltros ativos={ativos} onLimpar={limpar}>
        <Filtro
          rotulo="Conta"
          valor={fConta}
          onChange={setFConta}
          opcoes={[{ valor: TODOS, nome: 'Todas as contas' }, ...contas.map((c) => ({ valor: c.id, nome: c.nome }))]}
        />
        <Filtro
          rotulo="Responsável"
          valor={fResp}
          onChange={setFResp}
          opcoes={[
            { valor: TODOS, nome: 'Todos' },
            ...RESPONSAVEIS.map((r) => ({ valor: r.id ?? SEM, nome: r.nome })),
          ]}
        />
        <Filtro
          rotulo="Formato"
          valor={fFormato}
          onChange={setFFormato}
          opcoes={[{ valor: TODOS, nome: 'Todos' }, ...FORMATOS.map((f) => ({ valor: f, nome: f }))]}
        />
        <Filtro
          rotulo="Status"
          valor={fStatus}
          onChange={setFStatus}
          opcoes={[{ valor: TODOS, nome: 'Todos' }, ...STATUS_CONTEUDO.map((s) => ({ valor: s, nome: s }))]}
        />
      </BarraFiltros>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn-secondary p-2"
            onClick={() => mover(-1)}
            aria-label={visao === 'mes' ? 'Mês anterior' : 'Semana anterior'}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className="btn-secondary p-2"
            onClick={() => mover(1)}
            aria-label={visao === 'mes' ? 'Próximo mês' : 'Próxima semana'}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <button type="button" className="btn-secondary ml-1" onClick={() => setReferencia(hoje())}>
            Hoje
          </button>
        </div>
        <h2 className="flex-1 text-lg font-semibold text-ink first-letter:uppercase" aria-live="polite">
          {rotuloPeriodo}
          <span className="ml-2 text-sm font-normal text-ink-muted">
            {totalNoPeriodo === 1 ? '1 conteúdo' : `${totalNoPeriodo} conteúdos`}
          </span>
        </h2>
        <Segmentado
          rotulo="Visualização"
          valor={visao}
          onChange={setVisao}
          opcoes={[
            { valor: 'mes', nome: 'Mês' },
            { valor: 'semana', nome: 'Semana' },
          ]}
        />
      </div>

      {totalNoPeriodo === 0 && (
        <p className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          {ativos
            ? 'Nenhum conteúdo corresponde aos filtros neste período.'
            : 'Nenhum conteúdo programado neste período.'}
        </p>
      )}

      {visao === 'mes' ? (
        <>
          {/* Grade mensal (tablet e computador) */}
          <div className="card hidden overflow-hidden md:block">
            <div className="grid grid-cols-7 border-b border-line bg-surface-muted" aria-hidden>
              {NOMES_DIAS_CURTOS.map((d) => (
                <div key={d} className="px-2 py-2 text-xs font-semibold text-ink-muted uppercase">
                  {d}
                </div>
              ))}
            </div>
            <ul className="grid grid-cols-7">
              {dias.map((d, i) => {
                const lista = porDia.get(d) ?? []
                const foraDoMes = !d.startsWith(mesAtual)
                return (
                  <li
                    key={d}
                    aria-label={`${formatarDataExtensa(d)}${lista.length ? `, ${lista.length} conteúdo(s)` : ''}`}
                    className={cx(
                      'group min-h-32 border-line p-1.5',
                      i % 7 !== 6 && 'border-r',
                      i < dias.length - 7 && 'border-b',
                      foraDoMes && 'bg-surface-muted/60',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cx(
                          'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
                          d === dataHoje ? 'bg-brand-700 text-brand-contrast' : foraDoMes ? 'text-ink-muted' : 'text-ink-soft',
                        )}
                      >
                        {Number(d.slice(8))}
                      </span>
                      <BotaoAdicionarDia data={d} onClick={() => adicionarEm(d)} />
                    </div>
                    <ul className="space-y-1">
                      {lista.slice(0, MAX_POR_DIA).map((c) => (
                        <li key={c.id}>
                          <CartaoConteudo conteudo={c} conta={contas.find((x) => x.id === c.contaId)} compacto onAbrir={abrirConteudo} />
                        </li>
                      ))}
                    </ul>
                    {lista.length > MAX_POR_DIA && (
                      <button
                        type="button"
                        className="mt-1 w-full rounded px-1 py-0.5 text-left text-xs font-medium text-brand-700 hover:bg-surface-muted"
                        onClick={() => {
                          setReferencia(d)
                          setVisao('semana')
                        }}
                      >
                        + {lista.length - MAX_POR_DIA} mais
                        <span className="sr-only"> em {formatarData(d)} (abre a semana)</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
          {/* Agenda (celular) */}
          <div className="md:hidden">
            <ListaAgenda
              dias={doPeriodo.filter((d) => porDia.has(d))}
              porDia={porDia}
              contas={contas}
              dataHoje={dataHoje}
              onAbrir={abrirConteudo}
              onAdicionar={adicionarEm}
            />
          </div>
        </>
      ) : (
        <ul className="grid gap-3 md:grid-cols-7 md:gap-2">
          {dias.map((d) => {
            const lista = porDia.get(d) ?? []
            return (
              <li key={d} className={cx('card flex min-h-24 flex-col p-2 md:min-h-80', d === dataHoje && 'ring-2 ring-brand-500')}>
                <div className="mb-2 flex items-center justify-between gap-1 border-b border-line pb-1.5">
                  <h3 className="text-sm">
                    <span className="font-semibold text-ink">{NOMES_DIAS[diaDaSemana(d)]}</span>{' '}
                    <span className="text-ink-muted">{formatarData(d).slice(0, 5)}</span>
                    {d === dataHoje && <span className="ml-1 text-xs font-semibold text-brand-700">· Hoje</span>}
                  </h3>
                  <BotaoAdicionarDia data={d} onClick={() => adicionarEm(d)} sempreVisivel />
                </div>
                {lista.length === 0 ? (
                  <p className="px-1 text-xs text-ink-muted">Sem conteúdos</p>
                ) : (
                  <ul className="space-y-1.5">
                    {lista.map((c) => (
                      <li key={c.id}>
                        <CartaoConteudo conteudo={c} conta={contas.find((x) => x.id === c.contaId)} onAbrir={abrirConteudo} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function BotaoAdicionarDia({ data, onClick, sempreVisivel }: { data: string; onClick: () => void; sempreVisivel?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Adicionar conteúdo em ${formatarData(data)}`}
      title="Adicionar conteúdo"
      className={cx(
        'rounded p-0.5 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:opacity-100',
        !sempreVisivel && 'opacity-0 group-hover:opacity-100',
      )}
    >
      <Plus className="size-4" aria-hidden />
    </button>
  )
}

function CartaoConteudo({
  conteudo: c,
  conta,
  compacto,
  onAbrir,
}: {
  conteudo: Conteudo
  conta?: Conta
  compacto?: boolean
  onAbrir: (c: Conteudo) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(c)}
      className={cx(
        'w-full rounded-[var(--radius-control)] border border-line bg-surface text-left shadow-[var(--shadow-card)] transition-colors hover:border-line-strong hover:bg-surface-muted',
        compacto ? 'p-1.5' : 'p-2',
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <span className="font-semibold text-ink-soft tabular-nums">{c.horario}</span>
        <span aria-hidden>·</span>
        <span>{c.formato}</span>
      </span>
      <span className={cx('mt-0.5 block font-medium text-ink', compacto ? 'line-clamp-2 text-xs' : 'text-sm')}>{c.titulo}</span>
      <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
        <span className="sr-only">Conta: </span>
        {conta?.nome ?? 'Conta removida'}
      </span>
      <span className={cx('mt-1 flex gap-1', compacto ? 'flex-col items-start' : 'flex-wrap items-center justify-between')}>
        <SeloStatus status={c.status} />
        <SeloResponsavel id={c.responsavel} className={compacto ? 'max-w-full [&>span:first-child]:size-5' : undefined} />
      </span>
    </button>
  )
}

function ListaAgenda({
  dias,
  porDia,
  contas,
  dataHoje,
  onAbrir,
  onAdicionar,
}: {
  dias: string[]
  porDia: Map<string, Conteudo[]>
  contas: Conta[]
  dataHoje: string
  onAbrir: (c: Conteudo) => void
  onAdicionar: (d: string) => void
}) {
  if (dias.length === 0) return null
  return (
    <ul className="space-y-3">
      {dias.map((d) => (
        <li key={d} className="card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink first-letter:uppercase">
              {formatarDataExtensa(d)}
              {d === dataHoje && <span className="ml-1 text-brand-700">· Hoje</span>}
            </h3>
            <BotaoAdicionarDia data={d} onClick={() => onAdicionar(d)} sempreVisivel />
          </div>
          <ul className="space-y-2">
            {porDia.get(d)!.map((c) => (
              <li key={c.id}>
                <CartaoConteudo conteudo={c} conta={contas.find((x) => x.id === c.contaId)} onAbrir={onAbrir} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
