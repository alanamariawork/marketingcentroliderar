import { ExternalLink } from 'lucide-react'
import { rotuloConta } from '../data/constants'
import type { RegistroInsight } from '../data/types'
import { calcularScore, nomeRegra, temResultados } from '../lib/insights'
import { formatarData } from '../lib/dates'
import { formatarDecimal } from '../lib/format'

/** Tabela de publicações. Score recalculado e score histórico da planilha aparecem separados. */
export function TabelaInsights({
  linhas,
  onEditar,
  rotuloAcao = 'Registrar / editar',
}: {
  linhas: RegistroInsight[]
  onEditar: (id: string) => void
  rotuloAcao?: string
}) {
  return (
    <div className="card relative overflow-x-auto">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-line bg-surface-muted text-xs text-ink-muted">
          <tr>
            {['Publicação / conta', 'Data', 'Funil / formato', 'Alcance', 'Reproduções', 'Score', 'Coleta', 'Ação'].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {linhas.map((x) => {
            const score = calcularScore(x)
            return (
              <tr key={x.id} className="align-top">
                <td className="max-w-72 px-3 py-2.5">
                  <p className="font-medium text-ink">{x.description || 'Sem descrição'}</p>
                  <p className="text-xs text-ink-muted">
                    {rotuloConta(x.account)} · {x.category || 'Categoria não informada'}
                  </p>
                  {x.link && (
                    <a href={x.link} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                      Abrir post <ExternalLink className="size-3" aria-hidden />
                      <span className="sr-only">(abre em outra aba)</span>
                    </a>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-ink-soft">{x.date ? formatarData(x.date) : 'Data não informada'}</td>
                <td className="px-3 py-2.5 text-ink-soft">
                  {x.funnel || '—'}
                  <span className="block text-xs text-ink-muted">{x.format || '—'}</span>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{formatarDecimal(x.reach)}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatarDecimal(x.plays)}</td>
                <td className="px-3 py-2.5">
                  <span className="tabular-nums">{formatarDecimal(score)}</span>
                  <span className="block text-xs text-ink-muted">{score == null && x.rule ? `${nomeRegra(x.rule)} · campos incompletos` : nomeRegra(x.rule)}</span>
                  {x.sourceScore != null && (
                    <span className="block text-xs text-ink-muted">Planilha: {formatarDecimal(x.sourceScore)}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-ink-soft">
                  {temResultados(x) ? 'Resultados registrados' : 'Aguardando resultados'}
                  <span className="block text-ink-muted">{x.collected ? formatarData(x.collected) : 'Coleta não informada'}</span>
                </td>
                <td className="px-3 py-2.5">
                  <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => onEditar(x.id)}>
                    {rotuloAcao}
                    <span className="sr-only">: {x.description}</span>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Paginacao({
  inicio,
  porPagina,
  total,
  onMudar,
}: {
  inicio: number
  porPagina: number
  total: number
  onMudar: (inicio: number) => void
}) {
  if (total <= porPagina) return null
  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-end gap-3 text-sm text-ink-soft">
      <button type="button" className="btn-secondary" disabled={inicio === 0} onClick={() => onMudar(Math.max(0, inicio - porPagina))}>
        Anterior
      </button>
      <span aria-live="polite" className="tabular-nums">
        {(inicio + 1).toLocaleString('pt-BR')}–{Math.min(inicio + porPagina, total).toLocaleString('pt-BR')} de {total.toLocaleString('pt-BR')}
      </span>
      <button type="button" className="btn-secondary" disabled={inicio + porPagina >= total} onClick={() => onMudar(inicio + porPagina)}>
        Próxima
      </button>
    </nav>
  )
}
