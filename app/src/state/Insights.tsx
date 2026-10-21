import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarInsights, carregarInsightsImportados, ErroDeArmazenamento, salvarInsights } from '../data/armazenamento'
import type { RegistroInsight } from '../data/types'
import { FILTROS_VAZIOS, type FiltrosInsight } from '../lib/insights'

interface EstadoInsights {
  carregando: boolean
  erroCarga: string | null
  aviso: string | null
  gravacaoBloqueada: boolean
  registros: RegistroInsight[]
  /** Quantidade de registros importados das planilhas. */
  totalImportados: number
  recarregar: () => void
  /** Cria ou atualiza; só resolve depois que a gravação terminou. */
  salvar: (registro: RegistroInsight) => Promise<void>
  excluir: (id: string) => Promise<void>
  filtrosDe: (empresa: string) => FiltrosInsight
  setFiltros: (empresa: string, f: FiltrosInsight) => void
  objetivo: string
  setObjetivo: (o: string) => void
}

const Contexto = createContext<EstadoInsights | null>(null)

/** Filtro inicial da referência: Centro Liderar abre na conta da Jaciara no Instagram. */
const FILTROS_INICIAIS: Record<string, FiltrosInsight> = {
  'Centro Liderar': { ...FILTROS_VAZIOS, account: 'Jaciara Mendes — Instagram' },
}

export function ProvedorInsights({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [gravacaoBloqueada, setGravacaoBloqueada] = useState(false)
  const [registros, setRegistros] = useState<RegistroInsight[]>([])
  const [totalImportados, setTotalImportados] = useState(0)
  const [versao, setVersao] = useState(0)
  const [filtros, setFiltrosMapa] = useState<Record<string, FiltrosInsight>>(FILTROS_INICIAIS)
  const [objetivo, setObjetivo] = useState('Alcance')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErroCarga(null)
    carregarInsightsImportados()
      .then((importados) => {
        if (!ativo) return
        const carga = carregarInsights(importados)
        setRegistros(carga.registros)
        setAviso(carga.aviso)
        setGravacaoBloqueada(carga.gravacaoBloqueada)
        setTotalImportados(importados.length)
      })
      .catch(() => ativo && setErroCarga('Não foi possível carregar os dados importados das planilhas.'))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [versao])

  const gravar = useCallback(
    async (proxima: RegistroInsight[]) => {
      if (gravacaoBloqueada) {
        throw new ErroDeArmazenamento(
          'As gravações estão bloqueadas nesta sessão porque os dados salvos não puderam ser lidos. Nada foi alterado.',
        )
      }
      salvarInsights(proxima)
      setRegistros(proxima)
    },
    [gravacaoBloqueada],
  )

  const salvar = useCallback(
    (registro: RegistroInsight) => {
      const existe = registros.some((r) => r.id === registro.id)
      return gravar(existe ? registros.map((r) => (r.id === registro.id ? registro : r)) : [...registros, registro])
    },
    [registros, gravar],
  )
  const excluir = useCallback((id: string) => gravar(registros.filter((r) => r.id !== id)), [registros, gravar])

  const filtrosDe = useCallback((empresa: string) => filtros[empresa] ?? FILTROS_VAZIOS, [filtros])
  const setFiltros = useCallback(
    (empresa: string, f: FiltrosInsight) => setFiltrosMapa((m) => ({ ...m, [empresa]: f })),
    [],
  )

  const valor = useMemo(
    () => ({
      carregando,
      erroCarga,
      aviso,
      gravacaoBloqueada,
      registros,
      totalImportados,
      recarregar: () => setVersao((v) => v + 1),
      salvar,
      excluir,
      filtrosDe,
      setFiltros,
      objetivo,
      setObjetivo,
    }),
    [carregando, erroCarga, aviso, gravacaoBloqueada, registros, totalImportados, salvar, excluir, filtrosDe, setFiltros, objetivo],
  )
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useInsights(): EstadoInsights {
  const v = useContext(Contexto)
  if (!v) throw new Error('useInsights fora do ProvedorInsights')
  return v
}
