/**
 * Armazenamento dos criativos (neste navegador).
 *
 * - Cadastros (criativos, eventos e campanhas, versões e decisões): localStorage,
 *   no mesmo padrão dos Insights. Só texto: nenhum arquivo vai para o localStorage.
 * - Imagens e vídeos anexados: IndexedDB do navegador. Não são enviados ao
 *   Google Drive nem compartilhados com outras pessoas ou aparelhos.
 * Remover um criativo ou uma peça nunca exclui arquivos reais do Google Drive.
 */
import { CHAVE_SIMULAR_ERRO, ErroDeArmazenamento } from './armazenamento'
import type { Criativo, EventoCampanha } from './types'

export const CHAVE_CRIATIVOS = 'centro-liderar-criativos-v1'

export interface DadosCriativos {
  eventos: EventoCampanha[]
  criativos: Criativo[]
}

export interface CargaCriativos extends DadosCriativos {
  aviso: string | null
  /** Dados salvos existem mas não puderam ser lidos: gravar agora os apagaria. */
  gravacaoBloqueada: boolean
}

type ObterArmazenamento = () => Storage
const padrao: ObterArmazenamento = () => window.localStorage

export function carregarCriativos(obter: ObterArmazenamento = padrao): CargaCriativos {
  let bruto: string | null
  try {
    bruto = obter().getItem(CHAVE_CRIATIVOS)
  } catch {
    return {
      eventos: [],
      criativos: [],
      aviso: 'O navegador bloqueou o armazenamento local. Os criativos não poderão ser salvos.',
      gravacaoBloqueada: true,
    }
  }
  if (!bruto) return { eventos: [], criativos: [], aviso: null, gravacaoBloqueada: false }
  try {
    const d = JSON.parse(bruto) as Partial<DadosCriativos>
    if (!Array.isArray(d.eventos) || !Array.isArray(d.criativos)) throw new Error()
    return { eventos: d.eventos, criativos: d.criativos, aviso: null, gravacaoBloqueada: false }
  } catch {
    return {
      eventos: [],
      criativos: [],
      aviso:
        'Não foi possível ler os criativos salvos neste navegador. Para não sobrescrevê-los, novas gravações estão bloqueadas nesta sessão.',
      gravacaoBloqueada: true,
    }
  }
}

export function salvarCriativos(dados: DadosCriativos, obter: ObterArmazenamento = padrao): void {
  try {
    const armazenamento = obter()
    if (armazenamento.getItem(CHAVE_SIMULAR_ERRO) === '1') throw new Error('simulado')
    armazenamento.setItem(CHAVE_CRIATIVOS, JSON.stringify(dados))
  } catch {
    throw new ErroDeArmazenamento(
      'Não foi possível salvar o criativo. Verifique o espaço e as permissões do navegador e tente novamente.',
    )
  }
}

/* ---------- Arquivos (IndexedDB) ---------- */

const BANCO = 'centro-liderar-arquivos'
const LOJA = 'pecas'

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolver, rejeitar) => {
    if (typeof indexedDB === 'undefined') return rejeitar(new Error('IndexedDB indisponível'))
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => rejeitar(pedido.error)
  })
}

async function operar<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest): Promise<T> {
  const banco = await abrirBanco()
  try {
    return await new Promise<T>((resolver, rejeitar) => {
      const tx = banco.transaction(LOJA, modo)
      const pedido = fazer(tx.objectStore(LOJA))
      tx.oncomplete = () => resolver(pedido.result as T)
      tx.onerror = () => rejeitar(tx.error)
      tx.onabort = () => rejeitar(tx.error)
    })
  } finally {
    banco.close()
  }
}

export async function guardarArquivo(id: string, arquivo: Blob): Promise<void> {
  try {
    await operar('readwrite', (l) => l.put(arquivo, id))
  } catch {
    throw new ErroDeArmazenamento(
      'O navegador não permitiu guardar o arquivo (espaço insuficiente ou armazenamento bloqueado). Tente um arquivo menor ou use um link do Drive.',
    )
  }
}

export async function lerArquivo(id: string): Promise<Blob | null> {
  try {
    return ((await operar<Blob | undefined>('readonly', (l) => l.get(id))) ?? null)
  } catch {
    return null
  }
}

export async function apagarArquivos(ids: string[]): Promise<void> {
  if (!ids.length) return
  try {
    const banco = await abrirBanco()
    await new Promise<void>((resolver) => {
      const tx = banco.transaction(LOJA, 'readwrite')
      for (const id of ids) tx.objectStore(LOJA).delete(id)
      tx.oncomplete = tx.onerror = tx.onabort = () => resolver()
    })
    banco.close()
  } catch {
    // Se não der para apagar, o arquivo só ocupa espaço local; nenhum dado do sistema é afetado.
  }
}
