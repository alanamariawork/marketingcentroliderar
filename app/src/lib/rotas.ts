import { useCallback, useEffect, useState } from 'react'
import { EMPRESAS, EMPRESA_DO_SISTEMA, PAGINAS } from '../data/constants'
import type { EmpresaId, PaginaId } from '../data/types'

/** O sistema é exclusivo do Centro Liderar: a empresa da rota é sempre ela. */
export interface Rota {
  empresaId: EmpresaId
  pagina: PaginaId
  /** Subaba do Dashboard (consolidados, detalhamento, publicacoes, registros). */
  secao?: SecaoDashboard
}

export const SECOES_DASHBOARD = ['consolidados', 'detalhamento', 'publicacoes', 'registros'] as const
export type SecaoDashboard = (typeof SECOES_DASHBOARD)[number]

const PADRAO: Rota = { empresaId: EMPRESA_DO_SISTEMA, pagina: 'cronograma' }

export function nomeDaEmpresa(id: EmpresaId): string {
  return EMPRESAS.find((e) => e.id === id)?.nome ?? ''
}

export function nomeDaPagina(id: PaginaId): string {
  return PAGINAS.find((p) => p.id === id)?.nome ?? ''
}

export function hrefDaRota(r: Rota): string {
  return r.pagina === 'dashboard' && r.secao ? `#/dashboard/${r.secao}` : `#/${r.pagina}`
}

/**
 * Lê "#/pagina" e "#/dashboard/subaba". Endereços antigos "#/centro-liderar/pagina"
 * continuam funcionando, e "#/insights" (Insights agora fica dentro do Dashboard)
 * abre o Dashboard na subaba Registros. Os de outras empresas e qualquer
 * endereço desconhecido caem na rota padrão.
 */
export function lerRota(hash: string): Rota | null {
  let partes = hash.replace(/^#\/?/, '').split('/')
  if (partes[0] === EMPRESA_DO_SISTEMA && partes.length >= 2) partes = partes.slice(1)
  if (partes.length === 1 && partes[0] === 'insights') return { empresaId: EMPRESA_DO_SISTEMA, pagina: 'dashboard', secao: 'registros' }
  if (partes.length === 2 && partes[0] === 'dashboard') {
    const secao = SECOES_DASHBOARD.find((s) => s === partes[1])
    return secao ? { empresaId: EMPRESA_DO_SISTEMA, pagina: 'dashboard', secao } : null
  }
  if (partes.length !== 1) return null
  const p = PAGINAS.find((x) => x.id === partes[0])
  return p ? { empresaId: EMPRESA_DO_SISTEMA, pagina: p.id } : null
}

/** Roteamento por hash: funciona em qualquer hospedagem estática, sem servidor. */
export function useRota(): Rota {
  const [rota, setRota] = useState<Rota>(() => lerRota(window.location.hash) ?? PADRAO)

  const sincronizar = useCallback(() => {
    const lida = lerRota(window.location.hash)
    if (!lida) {
      window.history.replaceState(null, '', hrefDaRota(PADRAO))
      setRota(PADRAO)
      return
    }
    // Endereços antigos passam a mostrar o endereço atual (ex.: #/insights → #/dashboard/registros).
    if (window.location.hash !== hrefDaRota(lida)) window.history.replaceState(null, '', hrefDaRota(lida))
    setRota(lida)
  }, [])

  useEffect(() => {
    sincronizar()
    window.addEventListener('hashchange', sincronizar)
    return () => window.removeEventListener('hashchange', sincronizar)
  }, [sincronizar])

  return rota
}
