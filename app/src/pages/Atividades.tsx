import { useId, useMemo, useState } from 'react'
import { AlertCircle, CalendarClock, KanbanSquare, Link2, Plus } from 'lucide-react'
import { SeloPrioridade, SeloResponsavel } from '../components/Badges'
import { EstadoVazio } from '../components/Estados'
import { BarraFiltros, Filtro } from '../components/Filtros'
import { useFeedback } from '../components/Feedback'
import { PRIORIDADES, RESPONSAVEIS, STATUS_ATIVIDADE } from '../data/constants'
import type { Atividade, Prioridade, StatusAtividade } from '../data/types'
import { formatarData, hoje, somarDias } from '../lib/dates'
import { cx } from '../lib/format'
import { mensagemDeErro, useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'

const TODOS = 'todos'
const SEM = 'sem'
type FiltroPrazo = typeof TODOS | 'atrasadas' | 'hoje' | '7dias' | 'sem-prazo'

const PESO_PRIORIDADE: Record<Prioridade, number> = { Alta: 0, Média: 1, Baixa: 2 }

const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').toLowerCase()

export function situacaoPrazo(a: Atividade, dataHoje: string): 'atrasada' | 'hoje' | null {
  if (!a.prazo || a.status === 'Concluído') return null
  if (a.prazo < dataHoje) return 'atrasada'
  if (a.prazo === dataHoje) return 'hoje'
  return null
}

export function Atividades() {
  const { atividades } = useDadosEmpresa()
  const { abrir } = useModais()
  const [fResp, setFResp] = useState(TODOS)
  const [fPrioridade, setFPrioridade] = useState(TODOS)
  const [fPrazo, setFPrazo] = useState<FiltroPrazo>(TODOS)
  const dataHoje = hoje()

  const filtradas = useMemo(() => {
    const em7 = somarDias(dataHoje, 7)
    return atividades
      .filter((a) => fResp === TODOS || (a.responsavel ?? SEM) === fResp)
      .filter((a) => fPrioridade === TODOS || a.prioridade === fPrioridade)
      .filter((a) => {
        switch (fPrazo) {
          case TODOS:
            return true
          case 'atrasadas':
            return situacaoPrazo(a, dataHoje) === 'atrasada'
          case 'hoje':
            return a.prazo === dataHoje
          case '7dias':
            return !!a.prazo && a.prazo >= dataHoje && a.prazo <= em7
          case 'sem-prazo':
            return !a.prazo
        }
      })
      .sort(
        (a, b) =>
          PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
          (a.prazo || '9999').localeCompare(b.prazo || '9999') ||
          a.titulo.localeCompare(b.titulo),
      )
  }, [atividades, fResp, fPrioridade, fPrazo, dataHoje])

  if (atividades.length === 0) {
    return (
      <EstadoVazio
        icone={KanbanSquare}
        titulo="Nenhuma atividade cadastrada. Crie uma atividade para organizar as entregas."
        acao="Adicionar atividade"
        onAcao={() => abrir({ tipo: 'atividade' })}
      />
    )
  }

  const ativos = [fResp, fPrioridade, fPrazo].filter((f) => f !== TODOS).length

  return (
    <div className="space-y-4">
      <BarraFiltros
        ativos={ativos}
        onLimpar={() => {
          setFResp(TODOS)
          setFPrioridade(TODOS)
          setFPrazo(TODOS)
        }}
      >
        <Filtro
          rotulo="Responsável"
          valor={fResp}
          onChange={setFResp}
          opcoes={[{ valor: TODOS, nome: 'Todos' }, ...RESPONSAVEIS.map((r) => ({ valor: r.id ?? SEM, nome: r.nome }))]}
        />
        <Filtro
          rotulo="Prioridade"
          valor={fPrioridade}
          onChange={setFPrioridade}
          opcoes={[{ valor: TODOS, nome: 'Todas' }, ...PRIORIDADES.map((p) => ({ valor: p, nome: p }))]}
        />
        <Filtro<FiltroPrazo>
          rotulo="Prazo"
          valor={fPrazo}
          onChange={setFPrazo}
          opcoes={[
            { valor: TODOS, nome: 'Todos' },
            { valor: 'atrasadas', nome: 'Atrasadas' },
            { valor: 'hoje', nome: 'Vencem hoje' },
            { valor: '7dias', nome: 'Próximos 7 dias' },
            { valor: 'sem-prazo', nome: 'Sem prazo' },
          ]}
        />
      </BarraFiltros>

      {ativos > 0 && filtradas.length === 0 && (
        <p className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Nenhuma atividade corresponde aos filtros selecionados.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STATUS_ATIVIDADE.map((status) => {
          const lista = filtradas.filter((a) => a.status === status)
          return (
            <section key={status} aria-labelledby={`coluna-${slug(status)}`} className="flex flex-col rounded-[var(--radius-card)] bg-surface-muted p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 id={`coluna-${slug(status)}`} className="text-sm font-semibold text-ink">
                  {status}
                  <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">{lista.length}</span>
                </h2>
                <button
                  type="button"
                  className="rounded p-1 text-ink-muted hover:bg-surface hover:text-ink"
                  onClick={() => abrir({ tipo: 'atividade', status })}
                  aria-label={`Adicionar atividade em ${status}`}
                  title="Adicionar atividade"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
              {lista.length === 0 ? (
                <p className="rounded-[var(--radius-control)] border border-dashed border-line-strong px-3 py-6 text-center text-xs text-ink-muted">
                  Nenhuma atividade
                </p>
              ) : (
                <ul className="space-y-2">
                  {lista.map((a) => (
                    <li key={a.id}>
                      <CartaoAtividade atividade={a} dataHoje={dataHoje} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function CartaoAtividade({ atividade: a, dataHoje }: { atividade: Atividade; dataHoje: string }) {
  const { atualizar, conteudos } = useDadosEmpresa()
  const { abrir } = useModais()
  const feedback = useFeedback()
  const [movendo, setMovendo] = useState(false)
  const idStatus = useId()
  const situacao = situacaoPrazo(a, dataHoje)
  const conteudo = a.conteudoId ? conteudos.find((c) => c.id === a.conteudoId) : undefined

  async function mudarStatus(status: StatusAtividade) {
    setMovendo(true)
    try {
      await atualizar('atividades', a.id, { status })
      feedback.sucesso(`Atividade movida para “${status}”.`)
    } catch (e) {
      feedback.erro(mensagemDeErro(e))
    } finally {
      setMovendo(false)
    }
  }

  return (
    <article className={cx('card p-3', situacao === 'atrasada' && 'border-l-4 border-l-danger')}>
      <button
        type="button"
        onClick={() => abrir({ tipo: 'atividade', registro: a })}
        className="block w-full rounded text-left text-sm font-medium text-ink hover:underline"
      >
        {a.titulo}
      </button>
      {a.descricao && <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{a.descricao}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <SeloPrioridade prioridade={a.prioridade} />
        <span
          className={cx(
            'inline-flex items-center gap-1 text-xs',
            situacao === 'atrasada' ? 'font-semibold text-danger' : situacao === 'hoje' ? 'font-semibold text-warning' : 'text-ink-muted',
          )}
        >
          {situacao === 'atrasada' ? <AlertCircle className="size-3.5" aria-hidden /> : <CalendarClock className="size-3.5" aria-hidden />}
          {a.prazo ? (
            <>
              <span className="sr-only">Prazo: </span>
              {formatarData(a.prazo)}
              {situacao === 'atrasada' && ' · Atrasada'}
              {situacao === 'hoje' && ' · Vence hoje'}
            </>
          ) : (
            'Sem prazo'
          )}
        </span>
      </div>
      {conteudo && (
        <p className="mt-2 flex items-center gap-1 truncate text-xs text-ink-muted">
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          <span className="sr-only">Conteúdo vinculado: </span>
          <span className="truncate">{conteudo.titulo}</span>
        </p>
      )}
      <div className="mt-2.5">
        <SeloResponsavel id={a.responsavel} />
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
        <label htmlFor={idStatus} className="shrink-0 text-xs font-medium text-ink-muted">
          Status<span className="sr-only"> de “{a.titulo}”</span>
        </label>
        <select
          id={idStatus}
          className="field-control py-1 text-xs"
          value={a.status}
          disabled={movendo}
          onChange={(e) => mudarStatus(e.target.value as StatusAtividade)}
        >
          {STATUS_ATIVIDADE.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </article>
  )
}
