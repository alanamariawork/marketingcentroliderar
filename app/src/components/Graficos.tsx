import { useState } from 'react'
import type { Ponto } from '../lib/indicadores'
import { cx, formatarCompacto, formatarNumero } from '../lib/format'

function topoAgradavel(max: number): number {
  if (max <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(max)))
  const passo = [1, 2, 2.5, 5, 10].find((m) => m * exp >= max)! * exp
  return Math.max(passo, max <= 4 ? 4 : passo)
}

/** Cartão de gráfico com título, alternância para tabela e área do gráfico. */
export function CartaoGrafico({
  titulo,
  subtitulo,
  pontos,
  rotuloValor,
  rotuloCategoria,
  children,
}: {
  titulo: string
  subtitulo?: string
  pontos: Ponto[]
  rotuloValor: string
  rotuloCategoria: string
  children: React.ReactNode
}) {
  const [tabela, setTabela] = useState(false)
  return (
    <section className="card p-4" aria-label={titulo}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-ink">{titulo}</h2>
          {subtitulo && <p className="text-xs text-ink-muted">{subtitulo}</p>}
        </div>
        <button type="button" className="btn-ghost px-2 py-1 text-xs" aria-pressed={tabela} onClick={() => setTabela((t) => !t)}>
          {tabela ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>
      {tabela ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-ink-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  {rotuloCategoria}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {rotuloValor}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pontos.map((p) => (
                <tr key={p.chave}>
                  <td className="py-1.5 pr-3 text-ink-soft">{p.detalhe ? `${p.rotulo} (${p.detalhe})` : p.rotulo}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink">
                    {p.valor === null ? <span className="text-ink-muted">Sem registro</span> : formatarNumero(p.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

/** Barras verticais (evolução no tempo). Uma série só: a cor não codifica categoria. */
export function BarrasVerticais({ pontos, rotuloValor }: { pontos: Ponto[]; rotuloValor: string }) {
  const max = topoAgradavel(Math.max(0, ...pontos.map((p) => p.valor ?? 0)))
  const linhas = [1, 0.75, 0.5, 0.25, 0]
  const pularRotulos = Math.ceil(pontos.length / 7)
  return (
    <div className="flex gap-2">
      <div className="flex h-56 flex-col justify-between pb-5 text-right text-[11px] text-ink-muted tabular-nums" aria-hidden>
        {linhas.map((l) => (
          <span key={l} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {formatarCompacto(Math.round(max * l))}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1 px-3">
        <div className="pointer-events-none absolute inset-x-3 top-0 bottom-5 flex flex-col justify-between" aria-hidden>
          {linhas.map((l) => (
            <div key={l} className={cx('border-t', l === 0 ? 'border-line-strong' : 'border-line/70')} />
          ))}
        </div>
        <ul className="relative flex h-56 items-stretch gap-[2px]" aria-label={`${rotuloValor} por período`}>
          {pontos.map((p, i) => (
            <li key={p.chave} className="group relative flex min-w-0 flex-1 flex-col">
              <div
                tabIndex={0}
                aria-label={`${p.detalhe}: ${p.valor === null ? 'sem resultados registrados' : `${formatarNumero(p.valor)}`}`}
                className="relative flex flex-1 items-end justify-center rounded-sm outline-offset-0 hover:bg-surface-muted/70 focus-visible:bg-surface-muted/70"
              >
                {p.valor !== null && p.valor > 0 && (
                  <div
                    className="w-full max-w-10 rounded-t-[4px] bg-chart transition-colors group-hover:bg-chart-hover"
                    style={{ height: `${(p.valor / max) * 100}%` }}
                  />
                )}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-[var(--shadow-overlay)] group-focus-within:block group-hover:block"
                >
                  <p className="text-ink-muted">{p.detalhe}</p>
                  <p className="font-semibold text-ink tabular-nums">
                    {p.valor === null ? 'Sem resultados registrados' : `${rotuloValor}: ${formatarNumero(p.valor)}`}
                  </p>
                </div>
              </div>
              <span className="relative mt-1 h-4 text-[11px] text-ink-muted" aria-hidden>
                {i % pularRotulos === 0 && (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{p.rotulo}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Barras horizontais (comparação entre contas), com rótulo direto do valor. */
export function BarrasHorizontais({ pontos, rotuloValor }: { pontos: Ponto[]; rotuloValor: string }) {
  const max = Math.max(1, ...pontos.map((p) => p.valor ?? 0))
  return (
    <ul className="space-y-3" aria-label={`${rotuloValor} por conta`}>
      {pontos.map((p) => (
        <li key={p.chave} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr]">
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink-soft" title={p.rotulo}>
              {p.rotulo}
            </span>
            <span className="block text-xs text-ink-muted">{p.detalhe}</span>
          </span>
          <span className="flex items-center gap-2">
            {p.valor === null ? (
              <span className="text-xs text-ink-muted">Sem resultados registrados</span>
            ) : (
              <>
                <span
                  className="h-5 rounded-r-[4px] bg-chart"
                  style={{ width: `${Math.max((p.valor / max) * 85, p.valor > 0 ? 1 : 0)}%` }}
                  aria-hidden
                />
                <span className="text-xs font-semibold text-ink tabular-nums">{formatarNumero(p.valor)}</span>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
