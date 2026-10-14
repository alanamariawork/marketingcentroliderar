import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Atividade, Conta, Conteudo, LinkDrive, StatusAtividade } from '../data/types'
import { FormConteudo } from '../forms/FormConteudo'
import { DetalheConteudo } from '../forms/DetalheConteudo'
import { FormAtividade } from '../forms/FormAtividade'
import { FormConta, PainelContas } from '../forms/Contas'
import { FormLink } from '../forms/FormLink'
import { FormResultados } from '../forms/FormResultados'

export type Modal =
  | { tipo: 'conteudo'; registro?: Conteudo; data?: string }
  | { tipo: 'detalhe-conteudo'; id: string }
  | { tipo: 'atividade'; registro?: Atividade; status?: StatusAtividade }
  | { tipo: 'conta'; registro?: Conta; aoSalvar?: (c: Conta) => void }
  | { tipo: 'contas' }
  | { tipo: 'link'; registro?: LinkDrive }
  | { tipo: 'resultados'; id: string }

interface ModaisApi {
  abrir: (m: Modal) => void
  /** Fecha o modal do topo e abre outro no lugar. */
  substituir: (m: Modal) => void
  fechar: () => void
}

const Contexto = createContext<ModaisApi | null>(null)

/** Pilha de modais: permite, por exemplo, cadastrar uma conta sem perder o conteúdo em edição. */
export function ProvedorModais({ children }: { children: ReactNode }) {
  const [pilha, setPilha] = useState<{ chave: number; modal: Modal }[]>([])
  const contador = useRef(0)

  const abrir = useCallback((modal: Modal) => {
    const chave = contador.current++
    setPilha((p) => [...p, { chave, modal }])
  }, [])
  const fechar = useCallback(() => setPilha((p) => p.slice(0, -1)), [])
  const substituir = useCallback((modal: Modal) => {
    const chave = contador.current++
    setPilha((p) => [...p.slice(0, -1), { chave, modal }])
  }, [])

  const api = useMemo(() => ({ abrir, fechar, substituir }), [abrir, fechar, substituir])

  return (
    <Contexto.Provider value={api}>
      {children}
      {pilha.map(({ chave, modal }) => (
        <RenderizarModal key={chave} modal={modal} onFechar={fechar} />
      ))}
    </Contexto.Provider>
  )
}

function RenderizarModal({ modal, onFechar }: { modal: Modal; onFechar: () => void }) {
  switch (modal.tipo) {
    case 'conteudo':
      return <FormConteudo registro={modal.registro} dataInicial={modal.data} onFechar={onFechar} />
    case 'detalhe-conteudo':
      return <DetalheConteudo id={modal.id} onFechar={onFechar} />
    case 'atividade':
      return <FormAtividade registro={modal.registro} statusInicial={modal.status} onFechar={onFechar} />
    case 'conta':
      return <FormConta registro={modal.registro} aoSalvar={modal.aoSalvar} onFechar={onFechar} />
    case 'contas':
      return <PainelContas onFechar={onFechar} />
    case 'link':
      return <FormLink registro={modal.registro} onFechar={onFechar} />
    case 'resultados':
      return <FormResultados id={modal.id} onFechar={onFechar} />
  }
}

export function useModais(): ModaisApi {
  const v = useContext(Contexto)
  if (!v) throw new Error('useModais fora do ProvedorModais')
  return v
}
