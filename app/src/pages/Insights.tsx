import { useEffect, useMemo, useState } from 'react'
import { LineChart, Plus } from 'lucide-react'
import { CONTAS_CENTRO_LIDERAR, nomeEmpresa, rotuloConta } from '../data/constants'
import type { EmpresaId } from '../data/types'
import { useInsights } from '../state/Insights'
import { useDadosDaEmpresa } from '../state/Sessao'
import { useModais } from '../state/Modais'
import { contasDaEmpresa, filtrarInsights, FILTROS_VAZIOS } from '../lib/insights'
import { cx } from '../lib/format'
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados'
import { FiltrosInsights } from '../components/FiltrosInsights'
import { Paginacao, TabelaInsights } from '../components/TabelaInsights'
import { Nota } from '../components/Selos'

const POR_PAGINA = 50

export function Insights({ empresaId }: { empresaId: EmpresaId }) {
  const company = nomeEmpresa(empresaId)
  const ins = useInsights()
  const { contas } = useDadosDaEmpresa(empresaId)
  const { abrir } = useModais()
  const filtros = ins.filtrosDe(company)
  const [inicio, setInicio] = useState(0)
  useEffect(() => setInicio(0), [filtros])

  const linhas = useMemo(() => filtrarInsights(ins.registros, company, filtros), [ins.registros, company, filtros])
  const daEmpresa = useMemo(() => ins.registros.filter((x) => x.company === company), [ins.registros, company])
  const catalogo = company === 'Centro Liderar' ? CONTAS_CENTRO_LIDERAR.map((c) => c.id) : []
  const listaContas = contasDaEmpresa(company, ins.registros, catalogo, contas.map((c) => c.nome))
  const categorias = [...new Set(daEmpresa.map((x) => x.category).filter(Boolean))]

  if (ins.carregando) return <Carregando texto="Carregando os registros das planilhas…" />
  if (ins.erroCarga) return <EstadoErro mensagem={ins.erroCarga} onTentar={ins.recarregar} />

  const novo = () => abrir({ tipo: 'insight', empresaId })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Resultados por publicação</h2>
          <p className="text-sm text-ink-muted">
            {company === 'Centro Liderar'
              ? `${ins.totalImportados.toLocaleString('pt-BR')} registros importados das planilhas de funil e da Jaciara. `
              : ''}
            Os registros alimentam o Dashboard.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={novo}>
          <Plus className="size-4" aria-hidden />
          Adicionar dados
        </button>
      </div>

      {ins.aviso && <Nota tom="aviso">{ins.aviso}</Nota>}

      {listaContas.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Contas">
          {listaContas.map((c) => {
            const n = daEmpresa.filter((x) => x.account === c).length
            const ativo = filtros.account === c
            return (
              <button
                key={c}
                type="button"
                aria-pressed={ativo}
                onClick={() => ins.setFiltros(company, { ...FILTROS_VAZIOS, account: c })}
                className={cx(
                  'card px-3.5 py-3 text-left transition-colors hover:border-line-strong',
                  ativo && 'border-brand-600 bg-brand-50 ring-1 ring-brand-600',
                )}
              >
                <span className="block text-sm font-semibold text-ink">{rotuloConta(c)}</span>
                <span className="block text-xs text-ink-muted">
                  {n.toLocaleString('pt-BR')} {n === 1 ? 'registro' : 'registros'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {filtros.account === 'Jaciara Mendes — Instagram' && (
        <Nota>
          Importação: 1.124 publicações das abas mensais (2024–2026), com 3 repetições consolidadas. Mineração e análise
          de concorrência não entram nos totais. Uma publicação sem data e valores inconsistentes estão sinalizados nas
          observações. A regra Liderar só foi atribuída às linhas cuja fórmula na planilha corresponde a ela; scores
          históricos sem regra compatível ficam fora do ranking recalculado.
        </Nota>
      )}

      <FiltrosInsights filtros={filtros} onMudar={(f) => ins.setFiltros(company, f)} contas={listaContas} categorias={categorias} />

      {linhas.length ? (
        <>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {linhas.length.toLocaleString('pt-BR')} {linhas.length === 1 ? 'publicação' : 'publicações'} neste filtro
          </p>
          <TabelaInsights linhas={linhas.slice(inicio, inicio + POR_PAGINA)} onEditar={(id) => abrir({ tipo: 'insight', empresaId, id })} />
          <Paginacao inicio={inicio} porPagina={POR_PAGINA} total={linhas.length} onMudar={setInicio} />
        </>
      ) : (
        <EstadoVazio icone={LineChart} titulo="Nenhum resultado neste filtro." acao="Adicionar dados" onAcao={novo}>
          <p className="mt-1 max-w-md text-sm text-ink-muted">
            Limpe os filtros ou registre os resultados de uma publicação.
          </p>
        </EstadoVazio>
      )}
      <p className="text-xs text-ink-muted">
        Dados salvos neste navegador. Campo vazio significa “não informado”; zero é um resultado válido.
      </p>
    </div>
  )
}
