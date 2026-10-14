import { useMemo, useState } from 'react'
import { BarChart3, LineChart, Pencil } from 'lucide-react'
import { Etiqueta, SeloResponsavel } from '../components/Badges'
import { EstadoVazio } from '../components/Estados'
import { BarraFiltros, Filtro } from '../components/Filtros'
import { CAMPOS_METRICAS, FORMATOS } from '../data/constants'
import type { Conteudo } from '../data/types'
import { PERIODOS, dentroDoIntervalo, formatarCarimbo, formatarData, intervaloDoPeriodo, type Periodo } from '../lib/dates'
import { formatarNumero, cx } from '../lib/format'
import { hrefDaRota } from '../lib/rotas'
import { useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'

const TODOS = 'todos'
type Situacao = typeof TODOS | 'pendentes' | 'registrados'

export function temResultados(c: Conteudo): boolean {
  return !!c.metricas && CAMPOS_METRICAS.some(({ chave }) => c.metricas![chave] !== null)
}

export function Insights() {
  const { conteudos, contas, empresaId } = useDadosEmpresa()
  const { abrir } = useModais()
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [fConta, setFConta] = useState(TODOS)
  const [fFormato, setFFormato] = useState(TODOS)
  const [fSituacao, setFSituacao] = useState<Situacao>(TODOS)

  const publicados = useMemo(() => conteudos.filter((c) => c.status === 'Publicado'), [conteudos])

  const lista = useMemo(() => {
    const intervalo = intervaloDoPeriodo(periodo)
    return publicados
      .filter((c) => dentroDoIntervalo(c.data, intervalo))
      .filter((c) => fConta === TODOS || c.contaId === fConta)
      .filter((c) => fFormato === TODOS || c.formato === fFormato)
      .filter((c) =>
        fSituacao === TODOS ? true : fSituacao === 'registrados' ? temResultados(c) : !temResultados(c),
      )
      .sort((a, b) => (b.data + b.horario).localeCompare(a.data + a.horario))
  }, [publicados, periodo, fConta, fFormato, fSituacao])

  if (publicados.length === 0) {
    return (
      <EstadoVazio icone={LineChart} titulo="Ainda não há resultados. Registre as métricas de um conteúdo publicado.">
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          Nenhum conteúdo desta empresa está com status “Publicado”. Atualize o status no cronograma para registrar os
          resultados aqui.
        </p>
        <a href={hrefDaRota({ empresaId, pagina: 'cronograma' })} className="btn-primary mt-5">
          Abrir cronograma
        </a>
      </EstadoVazio>
    )
  }

  const pendentes = publicados.filter((c) => !temResultados(c))
  const ativos = [periodo !== 'todos', fConta !== TODOS, fFormato !== TODOS, fSituacao !== TODOS].filter(Boolean).length

  return (
    <div className="space-y-4">
      {!publicados.some(temResultados) && (
        <EstadoVazio
          icone={BarChart3}
          titulo="Ainda não há resultados. Registre as métricas de um conteúdo publicado."
          acao="Registrar resultados"
          onAcao={() => abrir({ tipo: 'resultados', id: pendentes[0].id })}
        />
      )}

      <BarraFiltros
        ativos={ativos}
        onLimpar={() => {
          setPeriodo('todos')
          setFConta(TODOS)
          setFFormato(TODOS)
          setFSituacao(TODOS)
        }}
      >
        <Filtro<Periodo>
          rotulo="Período"
          valor={periodo}
          onChange={setPeriodo}
          opcoes={PERIODOS.map((p) => ({ valor: p.id, nome: p.nome }))}
        />
        <Filtro
          rotulo="Conta"
          valor={fConta}
          onChange={setFConta}
          opcoes={[{ valor: TODOS, nome: 'Todas as contas' }, ...contas.map((c) => ({ valor: c.id, nome: c.nome }))]}
        />
        <Filtro
          rotulo="Formato"
          valor={fFormato}
          onChange={setFFormato}
          opcoes={[{ valor: TODOS, nome: 'Todos' }, ...FORMATOS.map((f) => ({ valor: f, nome: f }))]}
        />
        <Filtro<Situacao>
          rotulo="Resultados"
          valor={fSituacao}
          onChange={setFSituacao}
          opcoes={[
            { valor: TODOS, nome: 'Todos' },
            { valor: 'pendentes', nome: 'Sem resultados' },
            { valor: 'registrados', nome: 'Com resultados' },
          ]}
        />
      </BarraFiltros>

      <p className="text-sm text-ink-muted" aria-live="polite">
        {lista.length === 1 ? '1 conteúdo publicado' : `${lista.length} conteúdos publicados`}
        {pendentes.length > 0 && ` · ${pendentes.length} aguardando resultados`}
        <span className="ml-2 inline-flex items-center gap-1">
          · <span className="font-semibold text-ink-muted">—</span> = não preenchido
        </span>
      </p>

      {lista.length === 0 ? (
        <p className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Nenhum conteúdo publicado corresponde aos filtros selecionados.
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => {
            const conta = contas.find((x) => x.id === c.contaId)
            const registrado = temResultados(c)
            return (
              <li key={c.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left font-medium text-ink hover:underline"
                      onClick={() => abrir({ tipo: 'detalhe-conteudo', id: c.id })}
                    >
                      {c.titulo}
                    </button>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span>{conta?.nome ?? 'Conta removida'}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {formatarData(c.data)} às {c.horario}
                      </span>
                      <Etiqueta>{c.formato}</Etiqueta>
                      <SeloResponsavel id={c.responsavel} />
                    </p>
                  </div>
                  <button
                    type="button"
                    className={registrado ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => abrir({ tipo: 'resultados', id: c.id })}
                  >
                    {registrado ? <Pencil className="size-4" aria-hidden /> : <BarChart3 className="size-4" aria-hidden />}
                    {registrado ? 'Editar resultados' : 'Registrar resultados'}
                    <span className="sr-only"> de “{c.titulo}”</span>
                  </button>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {CAMPOS_METRICAS.map(({ chave, rotulo }) => {
                    const v = c.metricas?.[chave] ?? null
                    return (
                      <div key={chave} className="rounded-[var(--radius-control)] bg-surface-muted px-2.5 py-2">
                        <dt className="text-xs text-ink-muted">{rotulo}</dt>
                        <dd className={cx('text-base font-semibold tabular-nums', v === null ? 'text-ink-muted' : 'text-ink')}>
                          {v === null ? (
                            <>
                              <span aria-hidden>—</span>
                              <span className="sr-only">Não preenchido</span>
                            </>
                          ) : (
                            formatarNumero(v)
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
                {c.metricasRegistradasEm && (
                  <p className="mt-2 text-xs text-ink-muted">Resultados registrados em {formatarCarimbo(c.metricasRegistradasEm)}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
