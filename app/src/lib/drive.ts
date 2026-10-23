/**
 * Catálogo do Drive: classificação de mídia, índice, pesquisa e capas.
 *
 * A biblioteca mostra somente fotos, vídeos e as pastas que têm fotos ou vídeos
 * catalogados em sua árvore. Pesquisa por regras locais (nomes e caminhos, sem
 * acentos e sem maiúsculas, com o dicionário de termos relacionados da
 * referência). Não analisa o conteúdo das fotos e vídeos.
 */
import {
  DRIVE_EXTENSOES_CAPA,
  DRIVE_EXTENSOES_FOTO,
  DRIVE_EXTENSOES_NAO_MIDIA,
  DRIVE_EXTENSOES_VIDEO,
  DRIVE_PALAVRAS_IGNORADAS,
  DRIVE_PASTA_DE_FOTOS,
  DRIVE_SINONIMOS,
  DRIVE_TEMAS,
  type TemaDrive,
} from '../data/constants'
import type { ItemDrive, TipoMidia } from '../data/types'

export const normalizar = (v: string) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function extensao(nome: string): string {
  return /\.([a-z0-9]{1,5})$/i.exec(nome.trim())?.[1].toLowerCase() ?? ''
}

/**
 * Foto, vídeo ou nada. Evidência, nesta ordem: MIME type, tipo do catálogo
 * (gerado a partir do MIME) e, por último, a extensão. Sem evidência, não é mídia.
 */
export function tipoDeMidia(x: Pick<ItemDrive, 'name' | 'type' | 'mimeType'>): TipoMidia | null {
  if (x.type === 'Pasta') return null
  const ext = extensao(x.name)
  if (DRIVE_EXTENSOES_NAO_MIDIA.includes(ext)) return null
  if (x.mimeType) {
    if (x.mimeType.startsWith('image/')) return 'Foto'
    if (x.mimeType.startsWith('video/')) return 'Vídeo'
    return null
  }
  if (x.type === 'Foto' || x.type === 'Vídeo') return x.type
  if (x.type === 'Documento') return null
  if (DRIVE_EXTENSOES_FOTO.includes(ext)) return 'Foto'
  if (DRIVE_EXTENSOES_VIDEO.includes(ext)) return 'Vídeo'
  return null
}

/** Palavras do texto normalizado, para comparar termos inteiros ("ads" não casa com "cidades"). */
const palavras = (texto: string) => ` ${normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean).join(' ')} `
const contem = (textoEmPalavras: string, termos: string[]) => termos.some((t) => textoEmPalavras.includes(` ${t} `))

/** Tema da pasta: a pasta mais próxima no caminho (de baixo para cima, sem a raiz) com um termo do tema. */
export function temaDaPasta(caminho: string): TemaDrive | null {
  const partes = caminho.split(' / ').slice(1).reverse()
  for (const parte of partes) {
    const p = palavras(parte)
    const tema = DRIVE_TEMAS.find((t) => contem(p, t.termosPasta))
    if (tema) return tema
  }
  return null
}

export interface ItemIndexado extends ItemDrive {
  /** Posição no catálogo original. */
  indice: number
  nomeBusca: string
  busca: string
  pai: string
  /** Foto ou Vídeo; `null` para pastas. */
  midia: TipoMidia | null
}

export interface Contagem {
  fotos: number
  videos: number
}

export interface CapaPasta {
  tema: TemaDrive | null
  /** Foto real do acervo que representa a pasta; ausente = capa gráfica. */
  foto: ItemIndexado | null
}

export interface IndiceDrive {
  /** Somente fotos, vídeos e pastas com mídia catalogada na árvore. */
  itens: ItemIndexado[]
  /** Fotos e vídeos catalogados em cada pasta e subpastas. */
  contagens: Map<string, Contagem>
  /** Subpastas diretas (com mídia) de cada pasta. */
  subpastas: Map<string, ItemIndexado[]>
  /** Itens do catálogo que ficaram fora da biblioteca (documentos, atalhos, formatos sem evidência). */
  ignorados: number
  capaDe: (pasta: string) => CapaPasta
}

export function indexar(catalogo: ItemDrive[]): IndiceDrive {
  const contagens = new Map<string, Contagem>()
  // Candidatas a capa por pasta, na ordem do catálogo (escolha estável):
  // primeira foto direta, primeira da árvore e primeira identificada com o termo de cada tema.
  const fotoDireta = new Map<string, ItemIndexado>()
  const fotoDaArvore = new Map<string, ItemIndexado>()
  const fotoDoTema = new Map<string, ItemIndexado>()
  const temasComFoto = DRIVE_TEMAS.filter((t) => t.termosFoto)
  const pastas: ItemIndexado[] = []
  const midias: ItemIndexado[] = []
  let ignorados = 0

  catalogo.forEach((x, indice) => {
    const midia = tipoDeMidia(x)
    const item: ItemIndexado = {
      ...x,
      indice,
      nomeBusca: normalizar(x.name),
      busca: normalizar(x.name + ' ' + x.path),
      pai: x.path.slice(0, x.path.lastIndexOf(' / ')),
      midia,
    }
    if (x.type === 'Pasta') return void pastas.push(item)
    if (!midia) return void ignorados++
    midias.push(item)
    const partes = x.path.split(' / ')
    const boaParaCapa = midia === 'Foto' && DRIVE_EXTENSOES_CAPA.includes(extensao(x.name))
    // A foto só é "da Jaciara" (por exemplo) se o nome do arquivo ou a pasta de fotos imediata disser isso.
    const nomeFoto = boaParaCapa ? palavras(x.name) : ''
    const pastaImediata = boaParaCapa ? palavras(partes[partes.length - 2]) : ''
    const pastaDeFotos = contem(pastaImediata, DRIVE_PASTA_DE_FOTOS)
    const temasDaFoto = boaParaCapa
      ? temasComFoto.filter((t) => contem(nomeFoto, t.termosFoto!) || (pastaDeFotos && contem(pastaImediata, t.termosFoto!)))
      : []
    if (boaParaCapa && !fotoDireta.has(item.pai)) fotoDireta.set(item.pai, item)
    for (let n = 1; n < partes.length; n++) {
      const caminho = partes.slice(0, n).join(' / ')
      const c = contagens.get(caminho) ?? { fotos: 0, videos: 0 }
      if (midia === 'Foto') c.fotos++
      else c.videos++
      contagens.set(caminho, c)
      if (boaParaCapa && !fotoDaArvore.has(caminho)) fotoDaArvore.set(caminho, item)
      for (const t of temasDaFoto) if (!fotoDoTema.has(`${t.id}|${caminho}`)) fotoDoTema.set(`${t.id}|${caminho}`, item)
    }
  })

  const pastasComMidia = pastas.filter((p) => contagens.has(p.path))
  const subpastas = new Map<string, ItemIndexado[]>()
  for (const p of pastasComMidia) {
    const lista = subpastas.get(p.pai) ?? []
    lista.push(p)
    subpastas.set(p.pai, lista)
  }
  for (const lista of subpastas.values()) lista.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }))

  const capas = new Map<string, CapaPasta>()
  function capaDe(pasta: string): CapaPasta {
    const salva = capas.get(pasta)
    if (salva) return salva
    const tema = temaDaPasta(pasta)
    const foto = tema?.termosFoto
      ? (fotoDoTema.get(`${tema.id}|${pasta}`) ?? null)
      : (fotoDireta.get(pasta) ?? fotoDaArvore.get(pasta) ?? null)
    const capa = { tema, foto }
    capas.set(pasta, capa)
    return capa
  }

  return { itens: [...pastasComMidia, ...midias], contagens, subpastas, ignorados, capaDe }
}

export function termosDaBusca(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !DRIVE_PALAVRAS_IGNORADAS.includes(w))
}

export type FiltroTipoDrive = TipoMidia | 'Pasta' | ''

export interface ConsultaDrive {
  texto: string
  tipo: FiltroTipoDrive
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
  const palavrasBusca = termosDaBusca(c.texto)
  const prefixo = c.pasta + ' / '
  const variantes = palavrasBusca.map((w) => (c.relacionados ? (DRIVE_SINONIMOS.find((g) => g.includes(w)) ?? [w]) : [w]))
  const encontrados = indice.itens.filter(
    (x) =>
      (!c.tipo || (c.tipo === 'Pasta' ? x.type === 'Pasta' : x.midia === c.tipo)) &&
      x.path.startsWith(prefixo) &&
      (palavrasBusca.length ? variantes.every((vs) => vs.some((v) => x.busca.includes(v))) : x.pai === c.pasta),
  )
  const pontos = (x: ItemIndexado) =>
    palavrasBusca.reduce((n, w) => n + (x.nomeBusca.includes(w) ? 2 : x.busca.includes(w) ? 1 : 0), 0)
  return encontrados.sort((a, b) => {
    if (a.type === 'Pasta' && b.type !== 'Pasta') return -1
    if (b.type === 'Pasta' && a.type !== 'Pasta') return 1
    return pontos(b) - pontos(a) || a.name.localeCompare(b.name, 'pt-BR', { numeric: true })
  })
}

/**
 * Identificador de um ARQUIVO no Google Drive (links /file/d/<id>/… ou ?id=).
 * Links de pasta (/drive/folders/…) devolvem vazio: pasta não tem prévia.
 */
export function idDoArquivo(url: string | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    if (u.hostname !== 'drive.google.com' || u.pathname.includes('/folders/')) return ''
    return u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || u.searchParams.get('id') || ''
  } catch {
    return ''
  }
}

/** Miniatura gerada pelo Drive (não é o link de compartilhamento). Funciona para arquivos visíveis a quem está vendo. */
export const urlMiniatura = (id: string, largura = 480) =>
  `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${largura}`
/** Visualizador incorporável do Drive (player de vídeo com controles). */
export const urlPrevia = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
