import { useCallback, useEffect, useState } from 'react'
import { EMPRESAS, PAGINAS } from '../data/constants'
import type { EmpresaId, PaginaId } from '../data/types'

export interface Rota {
  empresaId: EmpresaId
  pagina: PaginaId
}

const PADRAO: Rota = { empresaId: 'centro-liderar', pagina: 'cronograma' }

export function nomeDaEmpresa(id: EmpresaId): string {
  return EMPRESAS.find((e) => e.id === id)?.nome ?? ''
}

export function nomeDaPagina(id: PaginaId): string {
  return PAGINAS.find((p) => p.id === id)?.nome ?? ''
}

export function hrefDaRota(r: Rota): string {
  return `#/${r.empresaId}/${r.pagina}`
}

/** Lê "#/empresa/pagina"; qualquer endereço desconhecido cai na rota padrão. */
export function lerRota(hash: string): Rota | null {
  const [, empresa, pagina] = hash.replace(/^#/, '').split('/')
  const e = EMPRESAS.find((x) => x.id === empresa)
  const p = PAGINAS.find((x) => x.id === pagina)
  return e && p ? { empresaId: e.id, pagina: p.id } : null
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
