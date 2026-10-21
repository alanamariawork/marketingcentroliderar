import { useCallback, useEffect, useState } from 'react'
import { EMPRESAS, EMPRESA_DO_SISTEMA, PAGINAS } from '../data/constants'
import type { EmpresaId, PaginaId } from '../data/types'

/** O sistema é exclusivo do Centro Liderar: a empresa da rota é sempre ela. */
export interface Rota {
  empresaId: EmpresaId
  pagina: PaginaId
}

const PADRAO: Rota = { empresaId: EMPRESA_DO_SISTEMA, pagina: 'cronograma' }

export function nomeDaEmpresa(id: EmpresaId): string {
  return EMPRESAS.find((e) => e.id === id)?.nome ?? ''
}

export function nomeDaPagina(id: PaginaId): string {
  return PAGINAS.find((p) => p.id === id)?.nome ?? ''
}

export function hrefDaRota(r: Rota): string {
  return `#/${r.pagina}`
}

/**
 * Lê "#/pagina". Endereços antigos "#/centro-liderar/pagina" continuam
 * funcionando; os de outras empresas (fora do escopo desta versão) e
 * qualquer endereço desconhecido caem na rota padrão.
 */
export function lerRota(hash: string): Rota | null {
  const partes = hash.replace(/^#\/?/, '').split('/')
  const pagina = partes.length === 2 && partes[0] === EMPRESA_DO_SISTEMA ? partes[1] : partes.length === 1 ? partes[0] : ''
  const p = PAGINAS.find((x) => x.id === pagina)
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
    } else setRota(lida)
  }, [])

  useEffect(() => {
    sincronizar()
    window.addEventListener('hashchange', sincronizar)
    return () => window.removeEventListener('hashchange', sincronizar)
  }, [sincronizar])

  return rota
}
