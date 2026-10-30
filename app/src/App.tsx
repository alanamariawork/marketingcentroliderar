import { useCallback, useEffect, useRef, useState } from 'react'
import { Menu, Plus } from 'lucide-react'
import { Sidebar, SidebarMovel } from './components/Sidebar'
import { ProvedorFeedback } from './components/Feedback'
import { ProvedorSessao } from './state/Sessao'
import { ProvedorCriativos } from './state/Criativos'
import { ProvedorInsights } from './state/Insights'
import { ProvedorModais, useModais } from './state/Modais'
import { nomeDaEmpresa, nomeDaPagina, useRota, type Rota } from './lib/rotas'
import { NOME_DO_SISTEMA } from './data/constants'
import { Cronograma } from './pages/Cronograma'
import { Atividades } from './pages/Atividades'
import { Insights } from './pages/Insights'
import { Drive } from './pages/Drive'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <ProvedorFeedback>
      <ProvedorCriativos>
        <ProvedorSessao>
          <ProvedorInsights>
            <ProvedorModais>
              <Estrutura />
            </ProvedorModais>
          </ProvedorInsights>
        </ProvedorSessao>
      </ProvedorCriativos>
    </ProvedorFeedback>
  )
}

function Estrutura() {
  const rota = useRota()
  const { abrir } = useModais()
  const [menuAberto, setMenuAberto] = useState(false)
  const fecharMenu = useCallback(() => setMenuAberto(false), [])
  const adicionarConta = useCallback(() => abrir({ tipo: 'conta', empresaId: rota.empresaId }), [abrir, rota.empresaId])

  useEffect(() => {
    document.title = `${nomeDaPagina(rota.pagina)} · ${NOME_DO_SISTEMA}`
  }, [rota])

  return (
    <>
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
      <div className="flex min-h-full">
        <aside className="hidden w-64 shrink-0 bg-sidebar lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar rota={rota} onAdicionarConta={adicionarConta} />
          </div>
        </aside>
        <SidebarMovel aberta={menuAberto} onFechar={fecharMenu} rota={rota} onAdicionarConta={adicionarConta} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Cabecalho rota={rota} onAbrirMenu={() => setMenuAberto(true)} />
          <main id="conteudo-principal" tabIndex={-1} className="flex-1 px-4 py-5 outline-none sm:px-6 lg:px-8">
            <Pagina rota={rota} />
          </main>
          <footer className="border-t border-line px-4 py-3 text-xs text-ink-muted sm:px-6 lg:px-8">
            Atividades demonstrativas e contas adicionadas ficam só nesta sessão · Insights importados das planilhas e
            salvos neste navegador · Tema neutro provisório · Sem integrações externas
          </footer>
        </div>
      </div>
    </>
  )
}

function Cabecalho({ rota, onAbrirMenu }: { rota: Rota; onAbrirMenu: () => void }) {
  const { abrir } = useModais()
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

  const acao =
    rota.pagina === 'atividades'
      ? 'Adicionar atividade'
      : rota.pagina === 'cronograma'
        ? 'Adicionar conteúdo'
        : null

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" className="btn-ghost -ml-2 p-2 lg:hidden" onClick={onAbrirMenu} aria-label="Abrir menu">
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            {nomeDaEmpresa(rota.empresaId)} / {nomeDaPagina(rota.pagina)}
          </p>
          <h1 ref={tituloRef} tabIndex={-1} className="font-display text-xl font-semibold text-ink outline-none">
            {nomeDaPagina(rota.pagina)}
          </h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {acao && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => abrir({ tipo: 'nova-atividade', empresaId: rota.empresaId, titulo: acao })}
            >
              <Plus className="size-4" aria-hidden />
              {acao}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function Pagina({ rota }: { rota: Rota }) {
  const { abrir } = useModais()
  const { empresaId } = rota
  switch (rota.pagina) {
    case 'cronograma':
      return <Cronograma key={empresaId} empresaId={empresaId} />
    case 'atividades':
      return (
        <Atividades
          key={empresaId}
          empresaId={empresaId}
          onNova={() => abrir({ tipo: 'nova-atividade', empresaId, titulo: 'Adicionar atividade' })}
        />
      )
    case 'insights':
      return <Insights key={empresaId} empresaId={empresaId} />
    case 'drive':
      return <Drive key={empresaId} empresaId={empresaId} />
    case 'dashboard':
      return <Dashboard key={empresaId} empresaId={empresaId} />
  }
}
