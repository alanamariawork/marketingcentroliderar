import { ETAPAS_FUNIL, FORMATOS_INSIGHT, rotuloConta } from '../data/constants'
import { FILTROS_VAZIOS, type FiltrosInsight } from '../lib/insights'

/** Filtros compartilhados por Insights e Dashboard: conta, período, formato, funil e categoria. */
export function FiltrosInsights({
  filtros,
  onMudar,
  contas,
  categorias,
}: {
  filtros: FiltrosInsight
  onMudar: (f: FiltrosInsight) => void
  contas: string[]
  categorias: string[]
}) {
  const set = (k: keyof FiltrosInsight) => (e: { target: { value: string } }) => onMudar({ ...filtros, [k]: e.target.value })
  const select = (k: keyof FiltrosInsight, rotulo: string, opcoes: string[], rotular = (v: string) => v) => (
    <label className="text-sm text-ink-soft">
      {rotulo}
      <select className="field-control mt-1" value={filtros[k]} onChange={set(k)}>
        <option value="">Todos</option>
        {opcoes.map((v) => (
          <option key={v} value={v}>
            {rotular(v)}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {select('account', 'Conta', contas, rotuloConta)}
      <label className="text-sm text-ink-soft">
        De
        <input type="date" className="field-control mt-1" value={filtros.from} onChange={set('from')} />
      </label>
      <label className="text-sm text-ink-soft">
        Até
        <input type="date" className="field-control mt-1" value={filtros.to} onChange={set('to')} />
      </label>
      {select('format', 'Formato', FORMATOS_INSIGHT)}
      {select('funnel', 'Funil', [...ETAPAS_FUNIL])}
      {select('category', 'Categoria', categorias)}
      <div className="flex items-end">
        <button type="button" className="btn-secondary w-full" onClick={() => onMudar(FILTROS_VAZIOS)}>
          Limpar filtros
        </button>
      </div>
    </div>
  )
}
