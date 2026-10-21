import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarDays,
  ChevronDown,
  FolderOpen,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { EMPRESAS, PAGINAS } from '../data/constants'
import type { EmpresaId, PaginaId } from '../data/types'
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

const CHAVE_EXPANDIDAS = 'gm-marketing:menu-expandido'

function lerExpandidas(atual: EmpresaId): EmpresaId[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_EXPANDIDAS) ?? 'null')
    if (Array.isArray(salvo)) return Array.from(new Set([...salvo, atual]))
  } catch {
    /* preferência visual apenas */
  }
  return [atual]
}

interface PropsSidebar {
  rota: Rota
  aoNavegar?: () => void
  /** "Adicionar conta" de cada empresa. */
  onAdicionarConta: (empresaId: EmpresaId) => void
}

export function Sidebar({ rota, aoNavegar, onAdicionarConta }: PropsSidebar) {
  const [expandidas, setExpandidas] = useState<EmpresaId[]>(() => lerExpandidas(rota.empresaId))

  // A empresa ativa fica sempre aberta.
  useEffect(() => {
    setExpandidas((e) => (e.includes(rota.empresaId) ? e : [...e, rota.empresaId]))
  }, [rota.empresaId])

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_EXPANDIDAS, JSON.stringify(expandidas))
    } catch {
      /* ignora */
    }
  }, [expandidas])

  const alternar = (id: EmpresaId) =>
    setExpandidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-ink">
      <div className="px-5 pt-5 pb-4">
        <Marca />
      </div>
      <p className="px-5 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-sidebar-muted uppercase">Empresas</p>

      <nav aria-label="Empresas e páginas" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {EMPRESAS.map((empresa) => {
            const aberta = expandidas.includes(empresa.id)
            const ativa = rota.empresaId === empresa.id
            const idLista = `menu-${empresa.id}`
            return (
              <li key={empresa.id}>
                <button
                  type="button"
                  aria-expanded={aberta}
                  aria-controls={idLista}
                  onClick={() => alternar(empresa.id)}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm font-semibold transition-colors',
                    ativa ? 'text-white' : 'text-sidebar-ink/85 hover:bg-white/5',
                  )}
                >
                  <Building2 className={cx('size-4 shrink-0', ativa ? 'text-white' : 'text-sidebar-muted')} aria-hidden />
                  <span className="flex-1">{empresa.nome}</span>
                  {ativa && (
                    <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase">
                      Atual
                    </span>
                  )}
                  <ChevronDown
                    className={cx('size-4 shrink-0 text-sidebar-muted transition-transform', !aberta && '-rotate-90')}
                    aria-hidden
                  />
                </button>
                <ul id={idLista} hidden={!aberta} className="mt-0.5 mb-2 ml-4 space-y-0.5 border-l border-white/10 pl-2">
                  {PAGINAS.map((pagina) => {
                    const atual = ativa && rota.pagina === pagina.id
                    const Icone = ICONES_PAGINA[pagina.id]
                    return (
                      <li key={pagina.id}>
                        <a
                          href={hrefDaRota({ empresaId: empresa.id, pagina: pagina.id })}
                          aria-current={atual ? 'page' : undefined}
                          onClick={aoNavegar}
                          className={cx(
                            'flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-sm transition-colors',
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
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        aoNavegar?.()
                        onAdicionarConta(empresa.id)
                      }}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-left text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-ink"
                    >
                      <Plus className="size-4 shrink-0" aria-hidden />
                      Adicionar conta
                      <span className="sr-only"> em {empresa.nome}</span>
                    </button>
                  </li>
                </ul>
              </li>
            )
          })}
        </ul>
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
  onAdicionarConta: (empresaId: EmpresaId) => void
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
