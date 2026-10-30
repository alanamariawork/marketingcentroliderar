import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { EmpresaId } from '../data/types'
import { FormAtividade } from '../forms/FormAtividade'
import { DetalheAtividade } from '../forms/DetalheAtividade'
import { FormConta } from '../forms/FormConta'
import { FormInsight } from '../forms/FormInsight'
import { FormCriativo } from '../forms/FormCriativo'
import { DetalheCriativo } from '../forms/DetalheCriativo'
import { FormEvento } from '../forms/FormEvento'

export type Modal =
  | { tipo: 'nova-atividade'; empresaId: EmpresaId; titulo: string; data?: string }
  | { tipo: 'atividade'; id: string }
  | { tipo: 'conta'; empresaId: EmpresaId }
  | { tipo: 'insight'; empresaId: EmpresaId; id?: string }
  | { tipo: 'criativo'; id: string }
  | { tipo: 'form-criativo'; id?: string; eventoId?: string }
  | { tipo: 'evento'; id?: string }

interface ModaisApi {
  abrir: (m: Modal) => void
  fechar: () => void
}

const Contexto = createContext<ModaisApi | null>(null)

/** Um modal por vez; o foco volta ao botão de origem ao fechar (ver Dialog). */
export function ProvedorModais({ children }: { children: ReactNode }) {
  const [atual, setAtual] = useState<{ chave: number; modal: Modal } | null>(null)
  const abrir = useCallback((modal: Modal) => setAtual((a) => ({ chave: (a?.chave ?? 0) + 1, modal })), [])
  const fechar = useCallback(() => setAtual(null), [])
  const api = useMemo(() => ({ abrir, fechar }), [abrir, fechar])
  return (
    <Contexto.Provider value={api}>
      {children}
      {atual && <RenderizarModal key={atual.chave} modal={atual.modal} onFechar={fechar} />}
    </Contexto.Provider>
  )
}

function RenderizarModal({ modal, onFechar }: { modal: Modal; onFechar: () => void }) {
  switch (modal.tipo) {
    case 'nova-atividade':
      return <FormAtividade empresaId={modal.empresaId} titulo={modal.titulo} dataInicial={modal.data} onFechar={onFechar} />
    case 'atividade':
      return <DetalheAtividade id={modal.id} onFechar={onFechar} />
    case 'conta':
      return <FormConta empresaId={modal.empresaId} onFechar={onFechar} />
    case 'insight':
      return <FormInsight empresaId={modal.empresaId} id={modal.id} onFechar={onFechar} />
    case 'criativo':
      return <DetalheCriativo id={modal.id} onFechar={onFechar} />
    case 'form-criativo':
      return <FormCriativo id={modal.id} eventoId={modal.eventoId} onFechar={onFechar} />
    case 'evento':
      return <FormEvento id={modal.id} onFechar={onFechar} />
  }
}

export function useModais(): ModaisApi {
  const v = useContext(Contexto)
  if (!v) throw new Error('useModais fora do ProvedorModais')
  return v
}
