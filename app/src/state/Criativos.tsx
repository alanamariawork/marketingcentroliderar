/**
 * Criativos e eventos/campanhas do Drive › Criativos › Produção.
 * Persistidos neste navegador (ver data/criativosArmazenamento.ts).
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  apagarArquivos,
  carregarCriativos,
  guardarArquivo,
  lerArquivo,
  salvarCriativos,
  type DadosCriativos,
} from '../data/criativosArmazenamento'
import { ErroDeArmazenamento } from '../data/armazenamento'
import type { Criativo, EventoCampanha, PecaCriativo } from '../data/types'
import { gerarId } from '../lib/id'

/** Limite por arquivo anexado no navegador (vídeos maiores: use o link do Drive). */
export const TAMANHO_MAXIMO_ARQUIVO = 200 * 1024 * 1024

interface EstadoCriativos extends DadosCriativos {
  aviso: string | null
  gravacaoBloqueada: boolean
  salvarCriativo: (c: Criativo) => Promise<void>
  excluirCriativo: (id: string) => Promise<void>
  salvarEvento: (e: EventoCampanha) => Promise<void>
  /** Guarda o arquivo no navegador e devolve a peça (não envia ao Google Drive). */
  anexarArquivo: (arquivo: File) => Promise<PecaCriativo>
  /** Apaga do navegador arquivos que nenhuma versão usa (ex.: anexados e cancelados). */
  descartarArquivos: (ids: string[]) => Promise<void>
  urlDoArquivo: (arquivoId: string) => Promise<string | null>
}

const Contexto = createContext<EstadoCriativos | null>(null)

const arquivosDe = (c: Criativo) => c.versoes.flatMap((v) => v.pecas.map((p) => p.arquivoId).filter((x): x is string => !!x))

export function ProvedorCriativos({ children }: { children: ReactNode }) {
  const [carga] = useState(() => carregarCriativos())
  const [dados, setDados] = useState<DadosCriativos>({ eventos: carga.eventos, criativos: carga.criativos })
  const atual = useRef(dados)
  const urls = useRef(new Map<string, string>())

  const gravar = useCallback(
    (novo: DadosCriativos) => {
      if (carga.gravacaoBloqueada) throw new ErroDeArmazenamento(carga.aviso ?? 'Gravação bloqueada.')
      salvarCriativos(novo)
      atual.current = novo
      setDados(novo)
    },
    [carga],
  )

  const salvarCriativo = useCallback(
    async (c: Criativo) => {
      const d = atual.current
      if (c.atividadeId && d.criativos.some((x) => x.id !== c.id && x.atividadeId === c.atividadeId)) {
        throw new ErroDeArmazenamento('Esta atividade já está vinculada a outro criativo.')
      }
      const antes = d.criativos.find((x) => x.id === c.id)
      gravar({ ...d, criativos: antes ? d.criativos.map((x) => (x.id === c.id ? c : x)) : [...d.criativos, c] })
      if (antes) {
        const usados = new Set(arquivosDe(c))
        await apagarArquivos(arquivosDe(antes).filter((id) => !usados.has(id)))
      }
    },
    [gravar],
  )

  const excluirCriativo = useCallback(
    async (id: string) => {
      const d = atual.current
      const alvo = d.criativos.find((x) => x.id === id)
      if (!alvo) return
      gravar({ ...d, criativos: d.criativos.filter((x) => x.id !== id) })
      await apagarArquivos(arquivosDe(alvo))
    },
    [gravar],
  )

  const salvarEvento = useCallback(
    async (e: EventoCampanha) => {
      const d = atual.current
      const existe = d.eventos.some((x) => x.id === e.id)
      gravar({ ...d, eventos: existe ? d.eventos.map((x) => (x.id === e.id ? e : x)) : [...d.eventos, e] })
    },
    [gravar],
  )

  const anexarArquivo = useCallback(async (arquivo: File): Promise<PecaCriativo> => {
    const video = arquivo.type.startsWith('video/')
    if (!video && !arquivo.type.startsWith('image/')) throw new ErroDeArmazenamento(`“${arquivo.name}” não é uma imagem nem um vídeo.`)
    if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
      throw new ErroDeArmazenamento(`“${arquivo.name}” passa de 200 MB. Para arquivos grandes, use o link do arquivo no Drive.`)
    }
    const arquivoId = gerarId()
    await guardarArquivo(arquivoId, arquivo)
    return {
      id: gerarId(),
      origem: 'arquivo',
      nome: arquivo.name,
      midia: video ? 'Vídeo' : 'Foto',
      arquivoId,
      tamanho: arquivo.size,
      mime: arquivo.type,
    }
  }, [])

  const descartarArquivos = useCallback(async (ids: string[]) => {
    const usados = new Set(atual.current.criativos.flatMap(arquivosDe))
    await apagarArquivos(ids.filter((id) => !usados.has(id)))
  }, [])

  const urlDoArquivo = useCallback(async (arquivoId: string) => {
    const salva = urls.current.get(arquivoId)
    if (salva) return salva
    const blob = await lerArquivo(arquivoId)
    if (!blob) return null
    const url = URL.createObjectURL(blob)
    urls.current.set(arquivoId, url)
    return url
  }, [])

  const valor = useMemo(
    () => ({
      ...dados,
      aviso: carga.aviso,
      gravacaoBloqueada: carga.gravacaoBloqueada,
      salvarCriativo,
      excluirCriativo,
      salvarEvento,
      anexarArquivo,
      descartarArquivos,
      urlDoArquivo,
    }),
    [dados, carga, salvarCriativo, excluirCriativo, salvarEvento, anexarArquivo, descartarArquivos, urlDoArquivo],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useCriativos(): EstadoCriativos {
  const v = useContext(Contexto)
  if (!v) throw new Error('useCriativos fora do ProvedorCriativos')
  return v
}

/** Para quem pode estar fora do provedor (ex.: testes da sessão). */
export const useCriativosOpcional = () => useContext(Contexto)
