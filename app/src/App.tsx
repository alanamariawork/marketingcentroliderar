import { useCallback, useEffect, useRef, useState } from 'react'
import { AtSign, Menu, Plus } from 'lucide-react'
import { Sidebar, SidebarMovel } from './components/Sidebar'
import { ProvedorFeedback } from './components/Feedback'
import { Carregando, EstadoErro } from './components/Estados'
import { ProvedorDadosEmpresa, useDadosEmpresa } from './state/DadosEmpresa'
import { ProvedorModais, useModais } from './state/Modais'
import { nomeDaEmpresa, nomeDaPagina, useRota, type Rota } from './lib/rotas'
import { Cronograma } from './pages/Cronograma'
import { Atividades } from './pages/Atividades'
import { Insights } from './pages/Insights'
import { Drive } from './pages/Drive'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  const rota = useRota()
  const [menuAberto, setMenuAberto] = useState(false)
  const fecharMenu = useCallback(() => setMenuAberto(false), [])

  useEffect(() => {
    document.title = `${nomeDaPagina(rota.pagina)} · ${nomeDaEmpresa(rota.empresaId)} · Grupo Mendes`
  }, [rota])

  return (
    <ProvedorFeedback>
      <a
        href="#conteudo-principal"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('conteudo-principal')?.focus()
        }}
        className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <div className="flex h-full">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar rota={rota} />
          </div>
        </aside>
        <SidebarMovel aberta={menuAberto} onFechar={fecharMenu} rota={rota} />

        {/* key: trocar de empresa recria todo o estado — os dados nunca se misturam */}
        <ProvedorDadosEmpresa key={rota.empresaId} empresaId={rota.empresaId}>
          <ProvedorModais>
            <div className="flex min-w-0 flex-1 flex-col">
              <Cabecalho rota={rota} onAbrirMenu={() => setMenuAberto(true)} />
              <main id="conteudo-principal" tabIndex={-1} className="flex-1 px-4 py-5 outline-none sm:px-6 lg:px-8">
                <Pagina rota={rota} />
              </main>
            </div>
          </ProvedorModais>
        </ProvedorDadosEmpresa>
      </div>
    </ProvedorFeedback>
  )
}

function Cabecalho({ rota, onAbrirMenu }: { rota: Rota; onAbrirMenu: () => void }) {
  const { abrir } = useModais()
  const { carregando, erro } = useDadosEmpresa()
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const primeira = useRef(true)

  // Ao trocar de página, o foco vai para o título (leitores de tela anunciam a nova página).
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    tituloRef.current?.focus()
  }, [rota.empresaId, rota.pagina])

  const acaoPrincipal = {
    cronograma: { rotulo: 'Adicionar conteúdo', abrir: () => abrir({ tipo: 'conteudo' }) },
    atividades: { rotulo: 'Adicionar atividade', abrir: () => abrir({ tipo: 'atividade' }) },
    insights: null,
    drive: { rotulo: 'Adicionar link', abrir: () => abrir({ tipo: 'link' }) },
    dashboard: { rotulo: 'Adicionar conteúdo', abrir: () => abrir({ tipo: 'conteudo' }) },
  }[rota.pagina]
  const desabilitado = carregando || !!erro

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onAbrirMenu} aria-label="Abrir menu">
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{nomeDaEmpresa(rota.empresaId)}</p>
          <h1 ref={tituloRef} tabIndex={-1} className="font-display text-xl font-semibold text-ink outline-none">
            {nomeDaPagina(rota.pagina)}
          </h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => abrir({ tipo: 'contas' })}
            disabled={desabilitado}
          >
            <AtSign className="size-4" aria-hidden />
            Contas
          </button>
          {rota.pagina !== 'drive' && rota.pagina !== 'atividades' && (
            <button
              type="button"
              className="btn-secondary hidden sm:inline-flex"
              onClick={() => abrir({ tipo: 'conta' })}
              disabled={desabilitado}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar conta
            </button>
          )}
          {acaoPrincipal && (
            <button type="button" className="btn-primary" onClick={acaoPrincipal.abrir} disabled={desabilitado}>
              <Plus className="size-4" aria-hidden />
              {acaoPrincipal.rotulo}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function Pagina({ rota }: { rota: Rota }) {
  const { carregando, erro, recarregar } = useDadosEmpresa()
  if (carregando) return <Carregando />
  if (erro) return <EstadoErro mensagem={erro} onTentar={recarregar} />
  switch (rota.pagina) {
    case 'cronograma':
      return <Cronograma />
    case 'atividades':
      return <Atividades />
    case 'insights':
      return <Insights />
    case 'drive':
      return <Drive />
    case 'dashboard':
      return <Dashboard />
  }
}
