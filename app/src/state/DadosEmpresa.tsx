import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ErroDeDados, repositorio, type Colecao, type MapaColecoes } from '../data/repositorio'
import type { Atividade, Conta, Conteudo, EmpresaId, LinkDrive, NovoRegistro } from '../data/types'

interface Estado {
  contas: Conta[]
  conteudos: Conteudo[]
  atividades: Atividade[]
  links: LinkDrive[]
}

const VAZIO: Estado = { contas: [], conteudos: [], atividades: [], links: [] }

export interface DadosEmpresa extends Estado {
  empresaId: EmpresaId
  carregando: boolean
  erro: string | null
  recarregar: () => void
  criar: <C extends Colecao>(colecao: C, dados: NovoRegistro<MapaColecoes[C]>) => Promise<MapaColecoes[C]>
  atualizar: <C extends Colecao>(
    colecao: C,
    id: string,
    dados: Partial<NovoRegistro<MapaColecoes[C]>>,
  ) => Promise<MapaColecoes[C]>
  excluir: (colecao: Colecao, id: string) => Promise<void>
}

const Contexto = createContext<DadosEmpresa | null>(null)

export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroDeDados) return e.message
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

/**
 * Carrega e mantém os registros de UMA empresa. O provedor é montado com
 * `key={empresaId}`, então trocar de empresa descarta todo o estado anterior
 * e os registros nunca se misturam.
 */
export function ProvedorDadosEmpresa({ empresaId, children }: { empresaId: EmpresaId; children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    Promise.all([
      repositorio.listar(empresaId, 'contas'),
      repositorio.listar(empresaId, 'conteudos'),
      repositorio.listar(empresaId, 'atividades'),
      repositorio.listar(empresaId, 'links'),
    ])
      .then(([contas, conteudos, atividades, links]) => {
        if (ativo) setEstado({ contas, conteudos, atividades, links })
      })
      .catch((e) => ativo && setErro(mensagemDeErro(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [empresaId, versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  const criar = useCallback<DadosEmpresa['criar']>(
    async (colecao, dados) => {
      const novo = await repositorio.criar(empresaId, colecao, dados)
      setEstado((s) => ({ ...s, [colecao]: [...s[colecao], novo] }))
      return novo
    },
    [empresaId],
  )

  const atualizar = useCallback<DadosEmpresa['atualizar']>(
    async (colecao, id, dados) => {
      const salvo = await repositorio.atualizar(empresaId, colecao, id, dados)
      setEstado((s) => ({
        ...s,
        [colecao]: (s[colecao] as { id: string }[]).map((r) => (r.id === id ? salvo : r)),
      }))
      return salvo
    },
    [empresaId],
  )

  const excluir = useCallback<DadosEmpresa['excluir']>(
    async (colecao, id) => {
      if (colecao === 'contas') {
        const emUso = estado.conteudos.filter((c) => c.contaId === id).length
        if (emUso > 0) {
          throw new ErroDeDados(
            `Esta conta está vinculada a ${emUso} conteúdo(s). Altere ou exclua esses conteúdos antes de remover a conta.`,
          )
        }
      }
      await repositorio.excluir(empresaId, colecao, id)
      // Atividades que apontavam para o conteúdo excluído perdem apenas o vínculo.
      if (colecao === 'conteudos') {
        for (const a of estado.atividades.filter((a) => a.conteudoId === id)) {
          await repositorio.atualizar(empresaId, 'atividades', a.id, { conteudoId: null })
        }
      }
      setEstado((s) => ({
        ...s,
        [colecao]: (s[colecao] as { id: string }[]).filter((r) => r.id !== id),
        ...(colecao === 'conteudos'
          ? { atividades: s.atividades.map((a) => (a.conteudoId === id ? { ...a, conteudoId: null } : a)) }
          : {}),
      }))
    },
    [empresaId, estado.conteudos, estado.atividades],
  )

  const valor = useMemo<DadosEmpresa>(
    () => ({ ...estado, empresaId, carregando, erro, recarregar, criar, atualizar, excluir }),
    [estado, empresaId, carregando, erro, recarregar, criar, atualizar, excluir],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useDadosEmpresa(): DadosEmpresa {
  const v = useContext(Contexto)
  if (!v) throw new Error('useDadosEmpresa fora do ProvedorDadosEmpresa')
  return v
}
