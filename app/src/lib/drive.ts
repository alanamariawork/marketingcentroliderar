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
import { diaDoCarimbo } from './dates'

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
  /** Itens (fotos, vídeos e pastas exibidos) com cada data do Drive no catálogo. */
  datados: Record<BaseData, number>
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

  const itens = [...pastasComMidia, ...midias]
  const datados = {
    criacao: itens.filter((x) => diaDoCarimbo(x.createdTime)).length,
    modificacao: itens.filter((x) => diaDoCarimbo(x.modifiedTime)).length,
  }
  return { itens, contagens, subpastas, ignorados, datados, capaDe }
}

export function termosDaBusca(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !DRIVE_PALAVRAS_IGNORADAS.includes(w))
}

export type FiltroTipoDrive = TipoMidia | 'Pasta' | ''

/* ---------- Datas do Drive ---------- */

/** Qual data do Drive usar: criação ou última modificação (não é a data de gravação nem do evento). */
export type BaseData = 'criacao' | 'modificacao'
export const ROTULO_BASE_DATA: Record<BaseData, string> = {
  criacao: 'Criação no Drive',
  modificacao: 'Última modificação no Drive',
}

/** Ano e intervalo são modos alternativos: um exclui o outro. */
export type ModoData = 'todas' | 'ano' | 'intervalo' | 'sem-data'

export interface FiltroData {
  base: BaseData
  modo: ModoData
  ano: string
  /** AAAA-MM-DD (fuso de Fortaleza); vazio = sem limite. */
  de: string
  ate: string
}

export const FILTRO_DATA_VAZIO: FiltroData = { base: 'modificacao', modo: 'todas', ano: '', de: '', ate: '' }

/** Carimbo RFC 3339 da data escolhida, exatamente como veio do Drive. */
export const carimboDe = (x: Pick<ItemDrive, 'createdTime' | 'modifiedTime'>, base: BaseData) =>
  (base === 'criacao' ? x.createdTime : x.modifiedTime) ?? ''

/** Dia da data escolhida no fuso de Fortaleza; vazio = data não informada. Nunca deduz pelo nome do arquivo. */
export const diaDe = (x: Pick<ItemDrive, 'createdTime' | 'modifiedTime'>, base: BaseData) => diaDoCarimbo(carimboDe(x, base))

export function passaNaData(x: Pick<ItemDrive, 'createdTime' | 'modifiedTime'>, f: FiltroData): boolean {
  if (f.modo === 'todas') return true
  const dia = diaDe(x, f.base)
  if (f.modo === 'sem-data') return !dia
  if (!dia) return false
  if (f.modo === 'ano') return !f.ano || dia.startsWith(f.ano + '-')
  return (!f.de || dia >= f.de) && (!f.ate || dia <= f.ate)
}

/** Anos presentes no catálogo para a data escolhida, do mais recente ao mais antigo. */
export function anosDisponiveis(itens: Pick<ItemDrive, 'createdTime' | 'modifiedTime'>[], base: BaseData): string[] {
  const anos = new Set<string>()
  for (const x of itens) {
    const d = diaDe(x, base)
    if (d) anos.add(d.slice(0, 4))
  }
  return [...anos].sort().reverse()
}

/* ---------- Ordenação ---------- */

export type OrdemDrive = 'relevancia' | 'nome-asc' | 'nome-desc' | 'mod-desc' | 'mod-asc' | 'cri-desc' | 'cri-asc'

export const ORDENS_DRIVE: { id: OrdemDrive; rotulo: string }[] = [
  { id: 'relevancia', rotulo: 'Relevância da pesquisa' },
  { id: 'nome-asc', rotulo: 'Nome: A–Z' },
  { id: 'nome-desc', rotulo: 'Nome: Z–A' },
  { id: 'mod-desc', rotulo: 'Última modificação: mais recentes primeiro' },
  { id: 'mod-asc', rotulo: 'Última modificação: mais antigos primeiro' },
  { id: 'cri-desc', rotulo: 'Criação: mais recentes primeiro' },
  { id: 'cri-asc', rotulo: 'Criação: mais antigos primeiro' },
]

/** Identificador do item no Drive (arquivo ou pasta), para desempate estável. */
export function idDoItem(x: Pick<ItemDrive, 'url'>): string {
  return /\/(?:file\/d|folders)\/([\w-]+)/.exec(x.url)?.[1] ?? new URL(x.url, 'https://x').searchParams.get('id') ?? x.url
}

const compararNome = (a: ItemDrive, b: ItemDrive) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true })
const desempate = (a: ItemDrive, b: ItemDrive) => {
  const ia = idDoItem(a)
  const ib = idDoItem(b)
  return compararNome(a, b) || (ia < ib ? -1 : ia > ib ? 1 : 0)
}

/**
 * Ordena TODOS os resultados (antes da paginação). Pastas vêm antes dos
 * arquivos; nas datas, cada pasta usa a própria data. Sem data vai para o fim
 * em qualquer direção. Desempate por nome e ID.
 */
export function ordenar(itens: ItemIndexado[], ordem: OrdemDrive, pontos?: (x: ItemIndexado) => number): ItemIndexado[] {
  const base: BaseData | null = ordem.startsWith('mod') ? 'modificacao' : ordem.startsWith('cri') ? 'criacao' : null
  const tempos = new Map<ItemIndexado, number>()
  if (base) {
    for (const x of itens) {
      const t = Date.parse(carimboDe(x, base))
      tempos.set(x, Number.isNaN(t) ? NaN : t)
    }
  }
  const sentido = ordem.endsWith('desc') ? -1 : 1
  return [...itens].sort((a, b) => {
    if (a.type === 'Pasta' && b.type !== 'Pasta') return -1
    if (b.type === 'Pasta' && a.type !== 'Pasta') return 1
    if (base) {
      const ta = tempos.get(a)!
      const tb = tempos.get(b)!
      const sa = Number.isNaN(ta)
      const sb = Number.isNaN(tb)
      if (sa !== sb) return sa ? 1 : -1
      if (!sa && ta !== tb) return (ta - tb) * sentido
      return desempate(a, b)
    }
    if (ordem === 'nome-desc') return -desempate(a, b)
    if (ordem === 'relevancia' && pontos) return pontos(b) - pontos(a) || desempate(a, b)
    return desempate(a, b)
  })
}

export interface ConsultaDrive {
  texto: string
  tipo: FiltroTipoDrive
  pasta: string
  /** true = inclui termos relacionados; false = só as palavras digitadas. */
  relacionados: boolean
  data?: FiltroData
  ordem?: OrdemDrive
}

/** Com palavras-chave ou filtro de data, a pesquisa cobre a pasta e todas as subpastas. */
export const pesquisaNaArvore = (c: Pick<ConsultaDrive, 'texto' | 'data'>) =>
  termosDaBusca(c.texto).length > 0 || (!!c.data && c.data.modo !== 'todas')

/**
 * Sem palavras-chave nem filtro de data: mostra o conteúdo direto da pasta.
 * Caso contrário, pesquisa a pasta e todas as subpastas. A ordenação vale
 * para o conjunto inteiro de resultados.
 */
export function pesquisar(indice: IndiceDrive, c: ConsultaDrive): ItemIndexado[] {
  const palavrasBusca = termosDaBusca(c.texto)
  const prefixo = c.pasta + ' / '
  const arvore = pesquisaNaArvore(c)
  const variantes = palavrasBusca.map((w) => (c.relacionados ? (DRIVE_SINONIMOS.find((g) => g.includes(w)) ?? [w]) : [w]))
  const encontrados = indice.itens.filter(
    (x) =>
      (!c.tipo || (c.tipo === 'Pasta' ? x.type === 'Pasta' : x.midia === c.tipo)) &&
      x.path.startsWith(prefixo) &&
      (arvore ? true : x.pai === c.pasta) &&
      variantes.every((vs) => vs.some((v) => x.busca.includes(v))) &&
      (!c.data || passaNaData(x, c.data)),
  )
  const pontos = (x: ItemIndexado) =>
    palavrasBusca.reduce((n, w) => n + (x.nomeBusca.includes(w) ? 2 : x.busca.includes(w) ? 1 : 0), 0)
  return ordenar(encontrados, c.ordem ?? 'relevancia', pontos)
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
