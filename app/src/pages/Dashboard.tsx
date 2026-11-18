import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, ExternalLink, LayoutDashboard, Minus, Plus, RefreshCw } from 'lucide-react'
import { CONTAS_CENTRO_LIDERAR, DISTRIBUICAO_EDITORIAL, ETAPAS_FUNIL, FORMATOS_INSIGHT, nomeEmpresa, rotuloConta } from '../data/constants'
import type { EmpresaId, RegistroInsight } from '../data/types'
import { useInsights } from '../state/Insights'
import { useDadosDaEmpresa } from '../state/Sessao'
import { useModais } from '../state/Modais'
import { agregar, calcularScore, contasDaEmpresa, deduplicarCollabs, etapaFunil, filtrarInsights, FORMULAS, FILTROS_VAZIOS } from '../lib/insights'
import {
  CRITERIOS_RANKING,
  noPeriodo,
  PERIODO_PADRAO,
  periodoAnterior,
  porDia,
  porMes,
  PRESETS_PERIODO,
  ranking,
  resolverPeriodo,
  rotuloMes,
  totais,
  ultimaData,
  variacao,
  type CriterioRanking,
  type EscolhaPeriodo,
  type PresetPeriodo,
  type Totais,
} from '../lib/dashboard'
import { formatarCarimbo, formatarData, hoje } from '../lib/dates'
import { hrefDaRota, SECOES_DASHBOARD, type SecaoDashboard } from '../lib/rotas'
import { cx, formatarDecimal } from '../lib/format'
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados'
import { Paginacao, TabelaInsights } from '../components/TabelaInsights'
import { Nota } from '../components/Selos'

const REGRAS = ['liderar', 'mqa'] as const
const POR_PAGINA = 50
/** Releitura automática dos dados, como no DashPortal. */
const ATUALIZAR_A_CADA_MS = 60 * 60 * 1000

const ROTULO_SECAO: Record<SecaoDashboard, string> = {
  consolidados: 'Consolidados',
  detalhamento: 'Detalhamento',
  publicacoes: 'Publicações',
  registros: 'Registros (Insights)',
}

/**
 * Dashboard no modelo DashPortal, com os Insights dentro dele: cabeçalho de
 * dados, abas por conta, filtro de período e subabas (Consolidados,
 * Detalhamento, Publicações e Registros, onde os resultados são cadastrados).
 */
export function Dashboard({ empresaId, secao }: { empresaId: EmpresaId; secao: SecaoDashboard }) {
  const company = nomeEmpresa(empresaId)
  const ins = useInsights()
  const { contas } = useDadosDaEmpresa(empresaId)
  const filtros = ins.filtrosDe(company)
  const [escolha, setEscolha] = useState<EscolhaPeriodo>(PERIODO_PADRAO)

  // Atualização automática a cada 60 minutos (relê planilhas importadas e registros do navegador).
  const recarregar = ins.recarregar
  useEffect(() => {
    const t = setInterval(recarregar, ATUALIZAR_A_CADA_MS)
    return () => clearInterval(t)
  }, [recarregar])

  // Conta e filtros extras (formato, funil, categoria); o período é escolhido à parte.
  const semPeriodo = useMemo(() => ({ ...filtros, from: '', to: '' }), [filtros])
  const daSelecao = useMemo(() => filtrarInsights(ins.registros, company, semPeriodo), [ins.registros, company, semPeriodo])
  const base = useMemo(() => (semPeriodo.account ? daSelecao : deduplicarCollabs(daSelecao)), [daSelecao, semPeriodo.account])
  const periodo = useMemo(() => resolverPeriodo(escolha, hoje(), ultimaData(base)), [escolha, base])
  const anterior = useMemo(() => periodoAnterior(periodo), [periodo])
  const atuais = useMemo(() => noPeriodo(base, periodo), [base, periodo])
  const doAnterior = useMemo(() => (anterior ? noPeriodo(base, anterior) : null), [base, anterior])

  if (ins.carregando && !ins.registros.length) return <Carregando texto="Carregando os registros de Insights…" />
  if (ins.erroCarga) return <EstadoErro mensagem={ins.erroCarga} onTentar={ins.recarregar} />

  const catalogo = company === 'Centro Liderar' ? CONTAS_CENTRO_LIDERAR.map((c) => c.id) : []
  const listaContas = contasDaEmpresa(company, ins.registros, catalogo, contas.map((c) => c.nome))
  const daEmpresa = ins.registros.filter((x) => x.company === company)
  const categorias = [...new Set(daEmpresa.map((x) => x.category).filter(Boolean))]
  const semData = base.filter((x) => !x.date).length

  return (
    <div className="space-y-5">
      <header className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="eyebrow">Insights · {company}</p>
          <p className="mt-1 text-sm text-ink-soft">
            <span className="font-medium text-ink">Fonte:</span> planilhas importadas ({ins.totalImportados.toLocaleString('pt-BR')}{' '}
            registros) + registros salvos neste navegador
          </p>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {ins.carregando
              ? 'Atualizando…'
              : `Última atualização: ${ins.carregadoEm ? formatarCarimbo(ins.carregadoEm) : '—'} · atualiza sozinho a cada 60 minutos`}
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={ins.recarregar} disabled={ins.carregando} aria-busy={ins.carregando}>
          <RefreshCw className={cx('size-4', ins.carregando && 'motion-safe:animate-spin')} aria-hidden />
          Atualizar
        </button>
      </header>

      {ins.aviso && <Nota tom="aviso">{ins.aviso}</Nota>}

      <div role="group" aria-label="Contas" className="flex flex-wrap gap-2">
        {['', ...listaContas].map((c) => {
          const n = c ? daEmpresa.filter((x) => x.account === c).length : daEmpresa.length
          const ativo = filtros.account === c
          return (
            <button
              key={c || 'todas'}
              type="button"
              aria-pressed={ativo}
              onClick={() => ins.setFiltros(company, { ...filtros, account: c })}
              className={cx(
                'rounded-[var(--radius-control)] border px-3 py-2 text-left text-sm transition-colors',
                ativo ? 'border-brand-700 bg-brand-700 text-brand-contrast' : 'border-line bg-surface text-ink hover:border-line-strong',
              )}
            >
              <span className="block font-semibold">{c ? rotuloConta(c) : 'Todas as contas'}</span>
              <span className={cx('block text-xs', ativo ? 'opacity-80' : 'text-ink-muted')}>
                {n.toLocaleString('pt-BR')} {n === 1 ? 'registro' : 'registros'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
        <SeletorPeriodo escolha={escolha} onMudar={setEscolha} />
        <FiltroSimples rotulo="Formato" valor={filtros.format} opcoes={FORMATOS_INSIGHT} onMudar={(v) => ins.setFiltros(company, { ...filtros, format: v })} />
        <FiltroSimples rotulo="Funil" valor={filtros.funnel} opcoes={[...ETAPAS_FUNIL]} onMudar={(v) => ins.setFiltros(company, { ...filtros, funnel: v })} />
        <FiltroSimples rotulo="Categoria" valor={filtros.category} opcoes={categorias} onMudar={(v) => ins.setFiltros(company, { ...filtros, category: v })} />
        <div className="flex items-end">
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              ins.setFiltros(company, { ...FILTROS_VAZIOS, account: filtros.account })
              setEscolha(PERIODO_PADRAO)
            }}
          >
            Limpar filtros
          </button>
        </div>
        <p className="text-sm text-ink-soft sm:col-span-2 lg:col-span-5" aria-live="polite">
          <span className="font-medium text-ink">Período:</span> {periodo.rotulo}
          {anterior ? ` · comparado com ${anterior.rotulo}` : ' · sem comparação'}
          {escolha.preset === 'automatico' && (
            <span className="block text-xs text-ink-muted">
              Os 30 dias que terminam na publicação mais recente desta seleção (os resultados são registrados depois da
              postagem).
            </span>
          )}
          {(periodo.de || periodo.ate) && semData > 0 && (
            <span className="block text-xs text-ink-muted">
              {semData} {semData === 1 ? 'registro sem data fica' : 'registros sem data ficam'} fora dos períodos (aparecem em “Todo o histórico”).
            </span>
          )}
        </p>
      </div>

      <nav aria-label="Subabas do Dashboard" className="flex gap-1 overflow-x-auto border-b border-line">
        {SECOES_DASHBOARD.map((s) => (
          <a
            key={s}
            href={hrefDaRota({ empresaId, pagina: 'dashboard', secao: s })}
            aria-current={secao === s ? 'page' : undefined}
            className={cx(
              '-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm whitespace-nowrap',
              secao === s ? 'border-accent-ink font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {ROTULO_SECAO[s]}
          </a>
        ))}
      </nav>

      {secao === 'registros' ? (
        <Registros empresaId={empresaId} linhas={noPeriodo(daSelecao, periodo)} conta={filtros.account} />
      ) : !base.length ? (
        <EstadoVazio icone={LayoutDashboard} titulo="Sem dados para análise nesta seleção.">
          <p className="mt-1 max-w-md text-sm text-ink-muted">Cadastre os resultados em “Registros (Insights)” ou limpe os filtros.</p>
        </EstadoVazio>
      ) : secao === 'consolidados' ? (
        <Consolidados atuais={atuais} anteriores={doAnterior} historico={base} objetivo={ins.objetivo} onObjetivo={ins.setObjetivo} />
      ) : secao === 'detalhamento' ? (
        <Detalhamento historico={base} atuais={atuais} />
      ) : (
        <Publicacoes atuais={atuais} periodo={periodo} empresaId={empresaId} />
      )}

      {!semPeriodo.account && secao !== 'registros' && (
        <p className="text-xs text-ink-muted">
          Em “Todas as contas”, um post em collab (mesmo link) conta uma vez. Escolha uma conta para ver a medição dela.
        </p>
      )}
    </div>
  )
}

function FiltroSimples({ rotulo, valor, opcoes, onMudar }: { rotulo: string; valor: string; opcoes: string[]; onMudar: (v: string) => void }) {
  return (
    <label className="text-sm text-ink-soft">
      {rotulo}
      <select className="field-control mt-1" value={valor} onChange={(e) => onMudar(e.target.value)}>
        <option value="">Todos</option>
        {opcoes.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </label>
  )
}

function SeletorPeriodo({ escolha, onMudar }: { escolha: EscolhaPeriodo; onMudar: (e: EscolhaPeriodo) => void }) {
  return (
    <div className="space-y-2 text-sm text-ink-soft">
      <label className="block">
        Período
        <select className="field-control mt-1" value={escolha.preset} onChange={(e) => onMudar({ ...escolha, preset: e.target.value as PresetPeriodo })}>
          {PRESETS_PERIODO.map((p) => (
            <option key={p.id} value={p.id}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </label>
      {escolha.preset === 'ultimos' && (
        <label className="block">
          Quantidade de dias
          <input
            type="number"
            min={1}
            max={3650}
            className="field-control mt-1"
            value={escolha.dias}
            onChange={(e) => onMudar({ ...escolha, dias: Number(e.target.value) })}
          />
        </label>
      )}
      {escolha.preset === 'avancado' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            De
            <input type="date" className="field-control mt-1" value={escolha.de} max={escolha.ate || undefined} onChange={(e) => onMudar({ ...escolha, de: e.target.value })} />
          </label>
          <label className="block">
            Até
            <input type="date" className="field-control mt-1" value={escolha.ate} min={escolha.de || undefined} onChange={(e) => onMudar({ ...escolha, ate: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  )
}

/* ---------- Consolidados ---------- */

const fmt = (v: number | null, sufixo = '') => formatarDecimal(v, sufixo)

function Variacao({ atual, anterior, temComparacao }: { atual: number | null; anterior: number | null | undefined; temComparacao: boolean }) {
  if (!temComparacao) return null
  const v = variacao(atual, anterior ?? null)
  if (v == null) {
    return <p className="mt-1 text-[11px] text-ink-muted">Período anterior: {anterior == null ? 'sem dado' : fmt(anterior)}</p>
  }
  const Icone = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : Minus
  return (
    <p className={cx('mt-1 flex items-center gap-1 text-[11px] font-medium', v > 0 ? 'text-success' : v < 0 ? 'text-danger' : 'text-ink-muted')}>
      <Icone className="size-3.5" aria-hidden />
      {v > 0 ? 'Alta' : v < 0 ? 'Queda' : 'Estável'} de {formatarDecimal(Math.abs(v))}%
      <span className="font-normal text-ink-muted">· antes {fmt(anterior ?? null)}</span>
    </p>
  )
}

function Kpi({ rotulo, valor, detalhe, children }: { rotulo: string; valor: string; detalhe?: string; children?: ReactNode }) {
  return (
    <div className="card p-3.5">
      <p className="text-xs text-ink-muted">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold text-ink tabular-nums">{valor}</p>
      {detalhe && <p className="mt-0.5 text-[11px] text-ink-muted">{detalhe}</p>}
      {children}
    </div>
  )
}

const PRINCIPAIS: { k: keyof Totais; rotulo: string }[] = [
  { k: 'publicacoes', rotulo: 'Publicações' },
  { k: 'alcance', rotulo: 'Alcance (soma por post)' },
  { k: 'reproducoes', rotulo: 'Reproduções' },
  { k: 'interacoes', rotulo: 'Interações' },
  { k: 'seguidores', rotulo: 'Seguidores ganhos' },
  { k: 'compartilhamentos', rotulo: 'Compartilhamentos' },
  { k: 'salvamentos', rotulo: 'Salvamentos' },
  { k: 'cliques', rotulo: 'Cliques no link' },
]

function Consolidados({
  atuais,
  anteriores,
  historico,
  objetivo,
  onObjetivo,
}: {
  atuais: RegistroInsight[]
  anteriores: RegistroInsight[] | null
  historico: RegistroInsight[]
  objetivo: string
  onObjetivo: (o: string) => void
}) {
  const t = totais(atuais)
  const a = anteriores ? totais(anteriores) : null
  const meses = porMes(historico).slice(-12)
  return (
    <div className="space-y-5">
      <section aria-labelledby="titulo-indicadores" className="space-y-3">
        <h2 id="titulo-indicadores" className="font-display text-lg font-semibold text-ink">
          Indicadores principais
        </h2>
        {!atuais.length && (
          <Nota>Nenhuma publicação neste período. Escolha outro período ou “Todo o histórico”.</Nota>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPAIS.map(({ k, rotulo }) => (
            <Kpi key={k} rotulo={rotulo} valor={fmt(t[k])}>
              <Variacao atual={t[k]} anterior={a?.[k]} temComparacao={!!a} />
            </Kpi>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-taxas" className="space-y-3">
        <h2 id="titulo-taxas" className="font-display text-lg font-semibold text-ink">
          Taxas e médias
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi rotulo="Taxa de engajamento" valor={fmt(t.engajamento, '%')} detalhe="Interações ÷ alcance (posts com os dois informados)">
            <Variacao atual={t.engajamento} anterior={a?.engajamento} temComparacao={!!a} />
          </Kpi>
          <Kpi rotulo="Alcance médio por post" valor={fmt(t.alcanceMedio)}>
            <Variacao atual={t.alcanceMedio} anterior={a?.alcanceMedio} temComparacao={!!a} />
          </Kpi>
          <Kpi rotulo="Alcance de não seguidores" valor={fmt(t.naoSeguidores, '%')} detalhe="Média dos posts informados" />
          <Kpi rotulo="Tempo médio de visualização" valor={fmt(t.tempoMedio, ' s')} detalhe="Média dos posts informados" />
        </div>
        <Nota>
          A soma de alcance por post não representa pessoas únicas. Taxas usam só os valores informados: campos vazios não
          entram como zero.
        </Nota>
      </section>

      <GraficoMensal meses={meses} />

      <section aria-labelledby="titulo-scores" className="space-y-3">
        <h2 id="titulo-scores" className="font-display text-lg font-semibold text-ink">
          Score por regra
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {REGRAS.map((rule) => {
            const vals = atuais.filter((x) => x.rule === rule).map(calcularScore).filter((v): v is number => v != null)
            return (
              <Kpi
                key={rule}
                rotulo={`Score médio · ${rule === 'liderar' ? 'Liderar' : 'MQA'}`}
                valor={formatarDecimal(vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null)}
                detalhe={`${FORMULAS[rule]} · ${vals.length} registros completos`}
              />
            )
          })}
        </div>
      </section>

      {atuais.length > 0 && <Funil linhas={atuais} objetivo={objetivo} onObjetivo={onObjetivo} />}
    </div>
  )
}

/** Barras de alcance por mês (últimos 12 meses com dados), com a tabela equivalente para leitores de tela. */
function GraficoMensal({ meses }: { meses: ReturnType<typeof porMes> }) {
  const max = Math.max(1, ...meses.map((m) => m.alcance ?? 0))
  return (
    <section aria-labelledby="titulo-mensal" className="card space-y-3 p-4">
      <h2 id="titulo-mensal" className="font-display text-lg font-semibold text-ink">
        Alcance por mês
      </h2>
      <p className="text-xs text-ink-muted">Histórico da seleção (últimos 12 meses com publicações), independente do período.</p>
      {meses.length ? (
        <div className="flex items-end gap-2 overflow-x-auto pb-1" aria-hidden>
          {meses.map((m) => (
            <div key={m.mes} className="flex min-w-12 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-ink-muted tabular-nums">{formatarDecimal(m.alcance)}</span>
              <div className="flex h-36 w-full items-end">
                <div className="w-full rounded-t bg-chart" style={{ height: `${((m.alcance ?? 0) / max) * 100}%` }} />
              </div>
              <span className="text-[11px] text-ink-soft">{rotuloMes(m.mes)}</span>
              <span className="text-[10px] text-ink-muted">{m.publicacoes} posts</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Sem publicações com data.</p>
      )}
      <table className="sr-only">
        <caption>Alcance por mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Publicações</th>
            <th>Alcance</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}>
              <td>{rotuloMes(m.mes)}</td>
              <td>{m.publicacoes}</td>
              <td>{formatarDecimal(m.alcance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* ---------- Detalhamento ---------- */

const COLUNAS_MES: { k: keyof Totais; rotulo: string; sufixo?: string }[] = [
  { k: 'publicacoes', rotulo: 'Posts' },
  { k: 'alcance', rotulo: 'Alcance' },
  { k: 'reproducoes', rotulo: 'Reproduções' },
  { k: 'curtidas', rotulo: 'Curtidas' },
  { k: 'comentarios', rotulo: 'Comentários' },
  { k: 'compartilhamentos', rotulo: 'Compart.' },
  { k: 'salvamentos', rotulo: 'Salvam.' },
  { k: 'seguidores', rotulo: 'Seguidores' },
  { k: 'cliques', rotulo: 'Cliques' },
  { k: 'engajamento', rotulo: 'Engajamento', sufixo: '%' },
]

function Detalhamento({ historico, atuais }: { historico: RegistroInsight[]; atuais: RegistroInsight[] }) {
  const meses = porMes(historico)
  const total = totais(historico.filter((x) => x.date))
  const melhor = [...meses].sort((a, b) => (b.alcance ?? -1) - (a.alcance ?? -1))[0]
  const maisPosts = [...meses].sort((a, b) => b.publicacoes - a.publicacoes)[0]
  return (
    <div className="space-y-5">
      <section aria-labelledby="titulo-resumo" className="space-y-3">
        <h2 id="titulo-resumo" className="font-display text-lg font-semibold text-ink">
          Resumo do histórico
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            rotulo="Histórico"
            valor={meses.length ? `${rotuloMes(meses[0].mes)} a ${rotuloMes(meses.at(-1)!.mes)}` : '—'}
            detalhe={`${meses.length} ${meses.length === 1 ? 'mês' : 'meses'} com publicações`}
          />
          <Kpi rotulo="Publicações no histórico" valor={fmt(total.publicacoes)} detalhe={`Média de ${formatarDecimal(meses.length ? total.publicacoes / meses.length : null)} por mês`} />
          <Kpi rotulo="Melhor mês em alcance" valor={melhor ? rotuloMes(melhor.mes) : '—'} detalhe={melhor ? `${fmt(melhor.alcance)} de alcance` : undefined} />
          <Kpi rotulo="Mês com mais publicações" valor={maisPosts ? rotuloMes(maisPosts.mes) : '—'} detalhe={maisPosts ? `${maisPosts.publicacoes} posts` : undefined} />
        </div>
      </section>

      <section aria-labelledby="titulo-meses" className="space-y-3">
        <h2 id="titulo-meses" className="font-display text-lg font-semibold text-ink">
          Mês a mês
        </h2>
        <p className="text-xs text-ink-muted">Histórico completo da seleção, independente do período. Registros sem data ficam de fora.</p>
        <div className="card relative overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Mês
                </th>
                {COLUNAS_MES.map((c) => (
                  <th key={c.k} scope="col" className="px-3 py-2 text-right font-semibold">
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...meses].reverse().map((m) => (
                <tr key={m.mes}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                    {rotuloMes(m.mes)}
                  </th>
                  {COLUNAS_MES.map((c) => (
                    <td key={c.k} className="px-3 py-2 text-right tabular-nums">
                      {fmt(m[c.k] as number | null, c.sufixo)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-line-strong bg-surface-muted font-semibold">
              <tr>
                <th scope="row" className="px-3 py-2 text-left text-ink">
                  Total
                </th>
                {COLUNAS_MES.map((c) => (
                  <td key={c.k} className="px-3 py-2 text-right tabular-nums">
                    {fmt(total[c.k] as number | null, c.sufixo)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {atuais.length > 0 && <PorFormato linhas={atuais} />}
    </div>
  )
}

/* ---------- Publicações ---------- */

function Publicacoes({ atuais, periodo, empresaId }: { atuais: RegistroInsight[]; periodo: { de: string; ate: string }; empresaId: EmpresaId }) {
  const { abrir } = useModais()
  const [criterio, setCriterio] = useState<CriterioRanking>('alcance')
  const dias = porDia(atuais, periodo).slice(-92)
  const max = Math.max(1, ...dias.map((d) => d.alcance ?? 0))
  const lista = ranking(atuais, criterio).slice(0, 30)
  const rotulo = CRITERIOS_RANKING.find((c) => c.id === criterio)!.rotulo
  return (
    <div className="space-y-5">
      <section aria-labelledby="titulo-diaria" className="card space-y-3 p-4">
        <h2 id="titulo-diaria" className="font-display text-lg font-semibold text-ink">
          Tendência diária
        </h2>
        <p className="text-xs text-ink-muted">
          Alcance somado das publicações de cada dia do período{dias.length === 92 ? ' (últimos 92 dias)' : ''}. Dias sem barra
          não tiveram publicação registrada.
        </p>
        {dias.length ? (
          <div className="flex h-40 items-end gap-px overflow-x-auto" aria-hidden>
            {dias.map((d) => (
              <div
                key={d.dia}
                title={`${formatarData(d.dia)} · ${d.publicacoes} posts · alcance ${formatarDecimal(d.alcance)}`}
                className={cx('min-w-1.5 flex-1 rounded-t', d.publicacoes ? 'bg-chart' : 'bg-chart-track')}
                style={{ height: d.publicacoes ? `${Math.max(4, ((d.alcance ?? 0) / max) * 100)}%` : '2px' }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Sem publicações com data neste período.</p>
        )}
        {dias.length > 0 && (
          <p className="flex justify-between text-[11px] text-ink-muted">
            <span>{formatarData(dias[0].dia)}</span>
            <span>{formatarData(dias.at(-1)!.dia)}</span>
          </p>
        )}
        <table className="sr-only">
          <caption>Alcance por dia</caption>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Publicações</th>
              <th>Alcance</th>
            </tr>
          </thead>
          <tbody>
            {dias
              .filter((d) => d.publicacoes)
              .map((d) => (
                <tr key={d.dia}>
                  <td>{formatarData(d.dia)}</td>
                  <td>{d.publicacoes}</td>
                  <td>{formatarDecimal(d.alcance)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="titulo-ranking" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="titulo-ranking" className="font-display text-lg font-semibold text-ink">
            Ranking de publicações
          </h2>
          <label className="text-sm text-ink-soft">
            Ordenar por
            <select className="field-control mt-1" value={criterio} onChange={(e) => setCriterio(e.target.value as CriterioRanking)}>
              {CRITERIOS_RANKING.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-ink-muted">
          As 30 publicações do período com maior {rotulo.toLowerCase()}. Só entram as que têm esse dado informado
          {criterio.startsWith('score') ? '; scores Liderar e MQA ficam separados' : ''}.
        </p>
        {lista.length ? (
          <ol className="space-y-2">
            {lista.map(({ x, valor }, i) => (
              <li key={x.id} className="card flex flex-wrap items-center gap-3 p-3">
                <span className="w-7 text-center text-lg font-semibold text-ink-muted tabular-nums">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words text-ink">{x.description || 'Sem descrição'}</p>
                  <p className="text-xs text-ink-muted">
                    {rotuloConta(x.account)} · {x.date ? formatarData(x.date) : 'Data não informada'} · {x.format || 'Formato não informado'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-ink tabular-nums">{formatarDecimal(valor)}</p>
                  <p className="text-[11px] text-ink-muted">{rotulo}</p>
                </div>
                <div className="flex gap-2">
                  {x.link && (
                    <a href={x.link} target="_blank" rel="noopener noreferrer" className="btn-secondary px-2.5 py-1 text-xs">
                      Abrir no Instagram
                      <ExternalLink className="size-3" aria-hidden />
                      <span className="sr-only">: {x.description} (abre em outra aba)</span>
                    </a>
                  )}
                  <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => abrir({ tipo: 'insight', empresaId, id: x.id })}>
                    Ver / editar
                    <span className="sr-only">: {x.description}</span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Nota>Nenhuma publicação do período tem {rotulo.toLowerCase()} informado.</Nota>
        )}
      </section>
    </div>
  )
}

/* ---------- Registros (antiga aba Insights) ---------- */

function Registros({ empresaId, linhas, conta }: { empresaId: EmpresaId; linhas: RegistroInsight[]; conta: string }) {
  const ins = useInsights()
  const { abrir } = useModais()
  const [inicio, setInicio] = useState(0)
  const topo = useRef<HTMLDivElement>(null)
  useEffect(() => setInicio(0), [linhas])
  const ordenadas = useMemo(() => [...linhas].sort((a, b) => b.date.localeCompare(a.date)), [linhas])
  const novo = () => abrir({ tipo: 'insight', empresaId })
  return (
    <div className="space-y-4" ref={topo}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Resultados por publicação</h2>
          <p className="text-sm text-ink-muted">
            {ins.totalImportados.toLocaleString('pt-BR')} registros importados das planilhas de funil e da Jaciara. Os
            registros alimentam as outras subabas do Dashboard.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={novo}>
          <Plus className="size-4" aria-hidden />
          Adicionar dados
        </button>
      </div>

      {conta === 'Jaciara Mendes — Instagram' && (
        <Nota>
          Importação: 1.124 publicações das abas mensais (2024–2026), com 3 repetições consolidadas. Mineração e análise
          de concorrência não entram nos totais. Uma publicação sem data e valores inconsistentes estão sinalizados nas
          observações. A regra Liderar só foi atribuída às linhas cuja fórmula na planilha corresponde a ela; scores
          históricos sem regra compatível ficam fora do ranking recalculado.
        </Nota>
      )}

      {ordenadas.length ? (
        <>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {ordenadas.length.toLocaleString('pt-BR')} {ordenadas.length === 1 ? 'publicação' : 'publicações'} nesta seleção
          </p>
          <TabelaInsights linhas={ordenadas.slice(inicio, inicio + POR_PAGINA)} onEditar={(id) => abrir({ tipo: 'insight', empresaId, id })} />
          <Paginacao
            inicio={inicio}
            porPagina={POR_PAGINA}
            total={ordenadas.length}
            onMudar={(n) => {
              setInicio(n)
              topo.current?.scrollIntoView({ block: 'start' })
            }}
          />
        </>
      ) : (
        <EstadoVazio icone={LayoutDashboard} titulo="Nenhum resultado nesta seleção." acao="Adicionar dados" onAcao={novo}>
          <p className="mt-1 max-w-md text-sm text-ink-muted">Escolha outro período ou conta, ou registre os resultados de uma publicação.</p>
        </EstadoVazio>
      )}
      <p className="text-xs text-ink-muted">
        Dados salvos neste navegador. Campo vazio significa “não informado”; zero é um resultado válido.
      </p>
    </div>
  )
}

function Funil({ linhas, objetivo, onObjetivo }: { linhas: RegistroInsight[]; objetivo: string; onObjetivo: (o: string) => void }) {
  const referencia = DISTRIBUICAO_EDITORIAL[objetivo]
  const semEtapa = linhas.filter((x) => !etapaFunil(x.funnel)).length
  return (
    <section aria-labelledby="titulo-funil" className="card space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="titulo-funil" className="font-display text-lg font-semibold text-ink">
          Distribuição do funil
        </h2>
        <label className="text-sm text-ink-soft">
          Objetivo estratégico
          <select className="field-control mt-1" value={objetivo} onChange={(e) => onObjetivo(e.target.value)}>
            {Object.keys(DISTRIBUICAO_EDITORIAL).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <ul className="space-y-3">
        {ETAPAS_FUNIL.map((etapa, i) => {
          const n = linhas.filter((x) => etapaFunil(x.funnel) === etapa).length
          const p = (n / linhas.length) * 100
          return (
            <li key={etapa} className="grid gap-1.5 sm:grid-cols-[10rem_1fr_13rem] sm:items-center">
              <span className="text-sm font-medium text-ink">
                {etapa} · {n} posts
              </span>
              <div className="relative h-3 rounded-full bg-chart-track" aria-hidden>
                <div className="h-full rounded-full bg-chart" style={{ width: `${p}%` }} />
                <div className="absolute -top-1 h-5 w-0.5 bg-chart-ref" style={{ left: `${referencia[i]}%` }} title={`Referência ${referencia[i]}%`} />
              </div>
              <span className="text-sm text-ink-soft tabular-nums">
                {formatarDecimal(p)}% · referência {referencia[i]}%
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-ink-muted">
        {semEtapa} posts sem classificação nestas três etapas. Referências da aba “ESTRATÉGIA DE FUNIL” (Alcance 60/30/10,
        Nutrição 40/40/20, Conversão 40/30/30). Esta é uma comparação de <strong>distribuição editorial</strong>, não uma
        taxa de conversão comercial. A linha vertical marca a referência.
      </p>
    </section>
  )
}

function PorFormato({ linhas }: { linhas: RegistroInsight[] }) {
  const formatos = [...new Set(linhas.map((x) => x.format))]
  return (
    <section aria-labelledby="titulo-formato" className="space-y-3">
      <h2 id="titulo-formato" className="font-display text-lg font-semibold text-ink">
        Desempenho por formato
      </h2>
      <div className="card relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
            <tr>
              {['Formato', 'Posts', 'Soma de alcance', 'Reproduções', 'Compartilhamentos'].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {formatos.map((f) => {
              const a = linhas.filter((x) => x.format === f)
              return (
                <tr key={f || 'sem-formato'}>
                  <td className="px-3 py-2 font-medium text-ink">{f || 'Não informado'}</td>
                  <td className="px-3 py-2 tabular-nums">{a.length}</td>
                  <td className="px-3 py-2 tabular-nums">{formatarDecimal(agregar(a, 'reach'))}</td>
                  <td className="px-3 py-2 tabular-nums">{formatarDecimal(agregar(a, 'plays'))}</td>
                  <td className="px-3 py-2 tabular-nums">{formatarDecimal(agregar(a, 'shares'))}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
