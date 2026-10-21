import { useEffect } from 'react'
import {
  CalendarDays,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { PAGINAS } from '../data/constants'
import type { PaginaId } from '../data/types'
import { hrefDaRota, type Rota } from '../lib/rotas'
import { cx } from '../lib/format'
import { Marca } from './Marca'

export const ICONES_PAGINA: Record<PaginaId, LucideIcon> = {
  cronograma: CalendarDays,
  atividades: KanbanSquare,
  insights: LineChart,
  drive: FolderOpen,
  dashboard: LayoutDashboard,
}

interface PropsSidebar {
  rota: Rota
  aoNavegar?: () => void
  /** "Adicionar conta": a conta é sempre vinculada ao Centro Liderar. */
  onAdicionarConta: () => void
}

/** Menu exclusivo do Centro Liderar: as cinco páginas, sem seletor de empresas. */
export function Sidebar({ rota, aoNavegar, onAdicionarConta }: PropsSidebar) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-ink">
      <div className="px-5 pt-5 pb-5">
        <Marca />
      </div>

      <nav aria-label="Páginas" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {PAGINAS.map((pagina) => {
            const atual = rota.pagina === pagina.id
            const Icone = ICONES_PAGINA[pagina.id]
            return (
              <li key={pagina.id}>
                <a
                  href={hrefDaRota({ ...rota, pagina: pagina.id })}
                  aria-current={atual ? 'page' : undefined}
                  onClick={aoNavegar}
                  className={cx(
                    'flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors',
                    atual
                      ? 'bg-sidebar-active font-medium text-white shadow-[inset_3px_0_0_0_#fff]'
                      : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-ink',
                  )}
                >
                  <Icone className="size-4 shrink-0" aria-hidden />
                  {pagina.nome}
                </a>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            aoNavegar?.()
            onAdicionarConta()
          }}
          className="mt-4 flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-white/15 px-3 py-2 text-left text-sm text-sidebar-ink transition-colors hover:bg-white/5"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          Adicionar conta
        </button>
      </nav>

      <div className="space-y-1 border-t border-white/10 px-5 py-4 text-[11px] leading-snug text-sidebar-muted">
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase">Aprovação centralizada</p>
        <p className="flex items-center gap-2 text-sm text-sidebar-ink">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-semibold" aria-hidden>
            K
          </span>
          Kélvia · aprovação final
        </p>
        <p>Demonstração local · sem integrações externas</p>
      </div>
    </div>
  )
}

/** Versão para celular: painel lateral sobreposto, com foco preso e Esc para fechar. */
export function SidebarMovel({
  aberta,
  onFechar,
  rota,
  onAdicionarConta,
}: {
  aberta: boolean
  onFechar: () => void
  rota: Rota
  onAdicionarConta: () => void
}) {
  useEffect(() => {
    if (!aberta) return
    const anterior = document.activeElement as HTMLElement | null
    const painel = document.getElementById('menu-movel')
    painel?.querySelector<HTMLElement>('a[aria-current="page"], button')?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
      if (e.key === 'Tab' && painel) {
        const itens = Array.from(painel.querySelectorAll<HTMLElement>('a[href], button')).filter(
          (n) => n.offsetParent !== null,
        )
        const a = itens[0]
        const b = itens[itens.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          b.focus()
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      anterior?.focus()
    }
  }, [aberta, onFechar])

  if (!aberta) return null
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-gray-900/50" aria-hidden onClick={onFechar} />
      <div
        id="menu-movel"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-[var(--shadow-overlay)]"
      >
        <Sidebar rota={rota} aoNavegar={onFechar} onAdicionarConta={onAdicionarConta} />
        <button
          type="button"
          onClick={onFechar}
          className="absolute top-4 right-3 rounded-[var(--radius-control)] p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white"
          aria-label="Fechar menu"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
