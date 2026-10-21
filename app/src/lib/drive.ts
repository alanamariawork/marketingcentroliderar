/**
 * Catálogo do Drive: índice, pesquisa e capas. Pesquisa por regras locais
 * (nomes e caminhos, sem acentos e sem maiúsculas, com o dicionário de termos
 * relacionados da referência). Não analisa o conteúdo das fotos e vídeos.
 */
import { DRIVE_PALAVRAS_IGNORADAS, DRIVE_SINONIMOS } from '../data/constants'
import type { ItemDrive, TipoItemDrive } from '../data/types'

export const normalizar = (v: string) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export interface ItemIndexado extends ItemDrive {
  /** Posição no catálogo original. */
  indice: number
  nomeBusca: string
  busca: string
  pai: string
}

export interface IndiceDrive {
  itens: ItemIndexado[]
  /** Primeira foto encontrada dentro de cada pasta (capa da pasta). */
  capas: Map<string, ItemIndexado>
  /** Subpastas diretas de cada pasta, para o filtro de pastas. */
  subpastas: Map<string, ItemIndexado[]>
}

export function indexar(catalogo: ItemDrive[]): IndiceDrive {
  const itens = catalogo.map((x, indice) => ({
    ...x,
    indice,
    nomeBusca: normalizar(x.name),
    busca: normalizar(x.name + ' ' + x.path),
    pai: x.path.slice(0, x.path.lastIndexOf(' / ')),
  }))
  const capas = new Map<string, ItemIndexado>()
  const subpastas = new Map<string, ItemIndexado[]>()
  for (const x of itens) {
    if (x.type === 'Pasta') {
      const lista = subpastas.get(x.pai) ?? []
      lista.push(x)
      subpastas.set(x.pai, lista)
    }
    if (x.type !== 'Foto') continue
    const partes = x.path.split(' / ')
    for (let n = 1; n < partes.length; n++) {
      const caminho = partes.slice(0, n).join(' / ')
      if (!capas.has(caminho)) capas.set(caminho, x)
    }
  }
  for (const lista of subpastas.values()) lista.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))
  return { itens, capas, subpastas }
}

export function termosDaBusca(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !DRIVE_PALAVRAS_IGNORADAS.includes(w))
}

export interface ConsultaDrive {
  texto: string
  tipo: TipoItemDrive | ''
  pasta: string
  /** true = inclui termos relacionados; false = só as palavras digitadas. */
  relacionados: boolean
}

/**
 * Sem palavras-chave: mostra o conteúdo direto da pasta. Com palavras-chave:
 * pesquisa a pasta e todas as subpastas. Pastas vêm primeiro; depois, os itens
 * com o termo no nome; desempate pelo nome.
 */
export function pesquisar(indice: IndiceDrive, c: ConsultaDrive): ItemIndexado[] {
  const palavras = termosDaBusca(c.texto)
  const prefixo = c.pasta + ' / '
  const variantes = palavras.map((w) => (c.relacionados ? (DRIVE_SINONIMOS.find((g) => g.includes(w)) ?? [w]) : [w]))
  const encontrados = indice.itens.filter(
    (x) =>
      (!c.tipo || x.type === c.tipo) &&
      x.path.startsWith(prefixo) &&
      (palavras.length ? variantes.every((vs) => vs.some((v) => x.busca.includes(v))) : x.pai === c.pasta),
  )
  const pontos = (x: ItemIndexado) =>
    palavras.reduce((n, w) => n + (x.nomeBusca.includes(w) ? 2 : x.busca.includes(w) ? 1 : 0), 0)
  return encontrados.sort((a, b) => {
    if (a.type === 'Pasta' && b.type !== 'Pasta') return -1
    if (b.type === 'Pasta' && a.type !== 'Pasta') return 1
    return pontos(b) - pontos(a) || a.name.localeCompare(b.name, 'pt-BR', { numeric: true })
  })
}

/** Identificador do arquivo no Google Drive, extraído da URL original. */
export function idDoArquivo(url: string | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    return u.pathname.match(/\/(?:d|folders)\/([\w-]+)/)?.[1] || u.searchParams.get('id') || ''
  } catch {
    return ''
  }
}

export const urlMiniatura = (id: string) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w480`
export const urlPrevia = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
