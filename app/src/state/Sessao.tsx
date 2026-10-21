/**
 * Estado da sessão: perfil simulado, atividades e contas.
 *
 * Como no HTML de referência, atividades e contas ficam só na memória desta aba
 * do navegador: recarregar a página volta às atividades demonstrativas. Os
 * anexos de vídeo são endereços `blob:` locais, válidos apenas nesta aba.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Atividade, Conta, EmpresaId, EventoHistorico, Perfil } from '../data/types'
import { hoje } from '../lib/dates'

export function gerarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** As três entregas de exemplo da referência (Centro Liderar, postagem hoje). */
export function atividadesDemonstrativas(dia: string = hoje()): Atividade[] {
  const base = { empresaId: 'centro-liderar' as const, responsavel: 'Carlos' as const, dataPostagem: dia, versao: 1, material: null, demonstrativa: true }
  const ev = (autor: EventoHistorico['autor'], texto: string): EventoHistorico => ({ quando: null, autor, texto })
  return [
    { ...base, id: 'demo-1', titulo: 'Roteiro · Conheça o Diamante Business', status: 'Em produção', formato: 'Reels', horaPostagem: '09:00', historico: [] },
    { ...base, id: 'demo-2', titulo: 'Carrossel · Gestão que gera crescimento', status: 'Aguardando aprovação', formato: 'Carrossel', horaPostagem: '12:00', historico: [ev('Carlos', 'Carlos enviou a versão 1 para aprovação.')] },
    { ...base, id: 'demo-3', titulo: 'Bastidores · Encontro de mentoria', status: 'Aprovado', formato: 'Story', horaPostagem: '16:30', historico: [ev('Kélvia', 'Kélvia aprovou a versão 1.')] },
  ]
}

interface Sessao {
  perfil: Perfil
  setPerfil: (p: Perfil) => void
  atividades: Atividade[]
  criarAtividade: (a: Omit<Atividade, 'id'>) => Atividade
  atualizarAtividade: (id: string, mudar: (a: Atividade) => Atividade) => void
  excluirAtividade: (id: string) => void
  contas: Conta[]
  criarConta: (c: Omit<Conta, 'id'>) => Conta
}

const Contexto = createContext<Sessao | null>(null)

export function ProvedorSessao({ children, inicial }: { children: ReactNode; inicial?: Atividade[] }) {
  const [perfil, setPerfil] = useState<Perfil>('Carlos')
  const [atividades, setAtividades] = useState<Atividade[]>(() => inicial ?? atividadesDemonstrativas())
  const [contas, setContas] = useState<Conta[]>([])

  const criarAtividade = useCallback((a: Omit<Atividade, 'id'>) => {
    const nova = { ...a, id: gerarId() }
    setAtividades((l) => [...l, nova])
    return nova
  }, [])
  const atualizarAtividade = useCallback((id: string, mudar: (a: Atividade) => Atividade) => {
    setAtividades((l) => l.map((a) => (a.id === id ? mudar(a) : a)))
  }, [])
  const excluirAtividade = useCallback((id: string) => {
    setAtividades((l) => {
      const alvo = l.find((a) => a.id === id)
      if (alvo?.material?.video) URL.revokeObjectURL(alvo.material.video)
      return l.filter((a) => a.id !== id)
    })
  }, [])
  const criarConta = useCallback((c: Omit<Conta, 'id'>) => {
    const nova = { ...c, id: gerarId() }
    setContas((l) => [...l, nova])
    return nova
  }, [])

  const valor = useMemo(
    () => ({ perfil, setPerfil, atividades, criarAtividade, atualizarAtividade, excluirAtividade, contas, criarConta }),
    [perfil, atividades, criarAtividade, atualizarAtividade, excluirAtividade, contas, criarConta],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao(): Sessao {
  const v = useContext(Contexto)
  if (!v) throw new Error('useSessao fora do ProvedorSessao')
  return v
}

/** Atividades e contas de uma empresa — os dados de empresas diferentes nunca se misturam. */
export function useDadosDaEmpresa(empresaId: EmpresaId) {
  const s = useSessao()
  const atividades = useMemo(() => s.atividades.filter((a) => a.empresaId === empresaId), [s.atividades, empresaId])
  const contas = useMemo(() => s.contas.filter((c) => c.empresaId === empresaId), [s.contas, empresaId])
  return { atividades, contas }
}

export function registrar(autor: EventoHistorico['autor'], texto: string): EventoHistorico {
  return { quando: new Date().toISOString(), autor, texto }
}
