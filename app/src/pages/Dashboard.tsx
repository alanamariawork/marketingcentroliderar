import { useMemo } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { CAMPOS_METRICAS, CONTAS_CENTRO_LIDERAR, DISTRIBUICAO_EDITORIAL, ETAPAS_FUNIL, nomeEmpresa } from '../data/constants'
import type { EmpresaId, RegistroInsight } from '../data/types'
import { useInsights } from '../state/Insights'
import { useDadosDaEmpresa } from '../state/Sessao'
import { useModais } from '../state/Modais'
import {
  agregar,
  calcularScore,
  contasDaEmpresa,
  deduplicarCollabs,
  etapaFunil,
  filtrarInsights,
  FORMULAS,
  informados,
} from '../lib/insights'
import { formatarDecimal } from '../lib/format'
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados'
import { FiltrosInsights } from '../components/FiltrosInsights'
import { TabelaInsights } from '../components/TabelaInsights'
import { Nota } from '../components/Selos'

const REGRAS = ['liderar', 'mqa'] as const

/** Alimentado pelos registros de Insights: nada é cadastrado de novo aqui. */
export function Dashboard({ empresaId }: { empresaId: EmpresaId }) {
  const company = nomeEmpresa(empresaId)
  const ins = useInsights()
  const { contas } = useDadosDaEmpresa(empresaId)
  const { abrir } = useModais()
  const filtros = ins.filtrosDe(company)
  const filtrados = useMemo(() => filtrarInsights(ins.registros, company, filtros), [ins.registros, company, filtros])
  const linhas = useMemo(() => deduplicarCollabs(filtrados), [filtrados])

  if (ins.carregando) return <Carregando texto="Carregando os registros de Insights…" />
  if (ins.erroCarga) return <EstadoErro mensagem={ins.erroCarga} onTentar={ins.recarregar} />

  const daEmpresa = ins.registros.filter((x) => x.company === company)
  const catalogo = company === 'Centro Liderar' ? CONTAS_CENTRO_LIDERAR.map((c) => c.id) : []
  const listaContas = contasDaEmpresa(company, ins.registros, catalogo, contas.map((c) => c.nome))
  const categorias = [...new Set(daEmpresa.map((x) => x.category).filter(Boolean))]
  const repetidos = filtrados.length - linhas.length
  const editar = (id: string) => abrir({ tipo: 'insight', empresaId, id })

  return (
    <div className="space-y-5">
      <FiltrosInsights filtros={filtros} onMudar={(f) => ins.setFiltros(company, f)} contas={listaContas} categorias={categorias} />
      <p className="text-xs text-ink-muted">
        Collabs: o mesmo post (mesmo link, sem parâmetros) conta uma vez no consolidado — {repetidos}{' '}
        {repetidos === 1 ? 'registro repetido excluído' : 'registros repetidos excluídos'} neste filtro. Quando as contas
        participantes têm medições diferentes, utiliza-se o primeiro registro na ordem dos dados (importados primeiro).
        Filtre uma conta para ver a medição específica dela.
      </p>

      {!linhas.length ? (
        <EstadoVazio icone={LayoutDashboard} titulo="Sem dados para análise neste filtro.">
          <p className="mt-1 max-w-md text-sm text-ink-muted">Cadastre os resultados na aba Insights ou limpe os filtros.</p>
        </EstadoVazio>
      ) : (
        <>
          <section aria-labelledby="titulo-totais" className="space-y-3">
            <h2 id="titulo-totais" className="font-display text-lg font-semibold text-ink">
              Desempenho dos conteúdos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <Kpi rotulo="Publicações registradas" valor={linhas.length.toLocaleString('pt-BR')} />
              {CAMPOS_METRICAS.map(([k, rotulo, unidade]) => {
                const media = unidade === 'pct' || unidade === 'sec'
                return (
                  <Kpi
                    key={k}
                    rotulo={`${media ? 'Média por post · ' : k === 'reach' ? 'Soma por post · ' : ''}${rotulo}`}
                    valor={formatarDecimal(agregar(linhas, k, media), unidade === 'pct' ? '%' : unidade === 'sec' ? ' s' : '')}
                    detalhe={`${informados(linhas, k).length}/${linhas.length} informados`}
                  />
                )
              })}
            </div>
            <Nota>
              A soma de alcance por post não representa pessoas únicas. Percentuais e tempo médio são médias simples dos
              valores informados. Campos ausentes não entram como zero.
            </Nota>
          </section>

          <section aria-labelledby="titulo-scores" className="space-y-3">
            <h2 id="titulo-scores" className="font-display text-lg font-semibold text-ink">
              Score por regra
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {REGRAS.map((rule) => {
                const vals = linhas.filter((x) => x.rule === rule).map(calcularScore).filter((v): v is number => v != null)
                return (
                  <Kpi
                    key={rule}
                    rotulo={`Score médio · ${rule === 'liderar' ? 'Liderar' : 'MQA'}`}
                    valor={formatarDecimal(vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null)}
                    detalhe={`${FORMULAS[rule]} · ${vals.length} registros completos`}
                  />
                )
              })}
              <Kpi
                rotulo="Score histórico sem regra compatível"
                valor={linhas.filter((x) => !x.rule && x.sourceScore != null).length.toLocaleString('pt-BR')}
                detalhe="Registros com score da planilha preservado, fora dos rankings recalculados"
              />
            </div>
          </section>

          <Funil linhas={linhas} objetivo={ins.objetivo} onObjetivo={ins.setObjetivo} />
          <PorFormato linhas={linhas} />

          <section aria-labelledby="titulo-ranking" className="space-y-3">
            <h2 id="titulo-ranking" className="font-display text-lg font-semibold text-ink">
              Ranking por score — regras separadas
            </h2>
            {REGRAS.map((rule) => {
              const ranking = linhas
                .filter((x) => x.rule === rule && calcularScore(x) != null)
                .sort((a, b) => calcularScore(b)! - calcularScore(a)!)
              return (
                <div key={rule} className="space-y-2">
                  <h3 className="text-sm font-semibold text-ink-soft">
                    {rule === 'liderar' ? 'Liderar' : 'MQA'} · {FORMULAS[rule].toLowerCase()}
                  </h3>
                  {ranking.length ? (
                    <TabelaInsights linhas={ranking.slice(0, 5)} onEditar={editar} rotuloAcao="Ver / editar" />
                  ) : (
                    <p className="text-sm text-ink-muted">Sem score completo para esta regra.</p>
                  )}
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="card p-3.5">
      <p className="text-xs text-ink-muted">{rotulo}</p>
      <p className="mt-1 text-xl font-semibold text-ink tabular-nums">{valor}</p>
      {detalhe && <p className="mt-0.5 text-[11px] text-ink-muted">{detalhe}</p>}
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
