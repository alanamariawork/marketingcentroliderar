/**
 * Agente de atualização dos Insights: regras puras, sem acesso à rede.
 *
 * Usadas pelo botão da página Insights e pela função do servidor que roda
 * todos os dias às 8h. A coleta usa a API oficial do Instagram (Graph API);
 * nenhum login automatizado. Aqui ficam: quais contas são coletadas, qual dia
 * buscar (posts de 7 dias atrás), como converter as métricas da API para os
 * campos do sistema e como juntar o resultado sem duplicar nem apagar dados.
 */
import type { ChaveMetrica, RegistroInsight, RegraScore } from '../data/types'
import { linkCanonico } from './insights'

export const FUSO = 'America/Fortaleza'
export const DIAS_ATRAS = 7
export const HORA_DA_ROTINA = '08:00'

/** Contas de Instagram administradas pelo marketing (identificadores da referência). */
export const CONTAS_INSTAGRAM: { account: string; rotulo: string; rule: RegraScore }[] = [
  { account: 'Centro Liderar', rotulo: 'Centro Liderar — Instagram', rule: 'liderar' },
  { account: 'MQA', rotulo: 'MQA — Instagram', rule: 'mqa' },
  { account: 'Diamante Business', rotulo: 'Diamante Business — Instagram', rule: '' },
  { account: 'Jaciara Mendes — Instagram', rotulo: 'Jaciara Mendes — Instagram', rule: '' },
]

/** Campos que a API não entrega por publicação: ficam vazios (vazio ≠ zero). */
export const CAMPOS_SEM_API: ChaveMetrica[] = ['nonfollowers', 'followers', 'clicks', 'reposts', 'repeats']

/** Data (AAAA-MM-DD) no fuso de Fortaleza. */
export function diaEmFortaleza(instante: string | Date): string {
  const d = typeof instante === 'string' ? new Date(instante.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')) : instante
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Dia das publicações a coletar: 7 dias antes de hoje, no fuso de Fortaleza. */
export function diaAlvo(agora: Date = new Date(), dias = DIAS_ATRAS): string {
  const [a, m, d] = diaEmFortaleza(agora).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10)
}

/** Publicação como a Graph API devolve em /{ig-user-id}/media. */
export interface MidiaInstagram {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_product_type?: 'FEED' | 'REELS' | 'STORY' | 'AD'
  permalink: string
  timestamp: string
}

/** Métricas por publicação, já lidas da resposta de /{media-id}/insights (nome → valor). */
export type MetricasApi = Partial<Record<string, number>>

/** Métricas pedidas à API por tipo de publicação (pedir uma métrica que o tipo não tem faz a API recusar tudo). */
export function metricasParaPedir(m: Pick<MidiaInstagram, 'media_product_type'>): string[] {
  if (m.media_product_type === 'REELS') {
    return ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'ig_reels_avg_watch_time']
  }
  return ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'follows']
}

/** Publicações feitas no dia indicado (fuso de Fortaleza). Stories somem em 24 h e não entram. */
export function publicacoesDoDia(midias: MidiaInstagram[], dia: string): MidiaInstagram[] {
  return midias.filter((m) => m.media_product_type !== 'STORY' && diaEmFortaleza(m.timestamp) === dia)
}

const numero = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Converte uma publicação e suas métricas para um registro de Insights. */
export function paraRegistro(
  m: MidiaInstagram,
  metricas: MetricasApi,
  conta: (typeof CONTAS_INSTAGRAM)[number],
  coletadoEm: Date = new Date(),
): RegistroInsight {
  const reels = m.media_product_type === 'REELS'
  const espera = numero(metricas.ig_reels_avg_watch_time)
  const legenda = (m.caption ?? '').split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  const dia = diaEmFortaleza(coletadoEm)
  return {
    id: `ig-${m.id}`,
    company: 'Centro Liderar',
    account: conta.account,
    date: diaEmFortaleza(m.timestamp),
    rule: conta.rule,
    collected: dia,
    updated: coletadoEm.toISOString(),
    notes: `Coletado automaticamente pela API do Instagram em ${dia.split('-').reverse().join('/')}.`,
    type: reels ? 'Reels' : 'Feed',
    funnel: '',
    format: reels ? 'Reels' : m.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : m.media_type === 'VIDEO' ? 'Reels' : 'Estático',
    description: legenda.length > 120 ? legenda.slice(0, 117) + '…' : legenda,
    link: m.permalink,
    category: '',
    reach: numero(metricas.reach),
    plays: numero(metricas.views),
    likes: numero(metricas.likes),
    comments: numero(metricas.comments),
    shares: numero(metricas.shares),
    saves: numero(metricas.saved),
    follows: numero(metricas.follows),
    watch: espera === null ? null : Math.round(espera / 100) / 10,
    ...Object.fromEntries(CAMPOS_SEM_API.map((k) => [k, null])),
  }
}

/**
 * Chave do post: o código depois de /p/, /reel/ ou /tv/ (o mesmo post aparece
 * como /p/ numa planilha e /reel/ na API). Fora do Instagram, o link canônico.
 */
export function chaveDoPost(link: string): string {
  const codigo = /instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]+)/i.exec(link)?.[1]
  return codigo ? `ig:${codigo}` : linkCanonico(link)
}

export interface ResultadoColeta {
  registros: RegistroInsight[]
  novos: number
  atualizados: number
}

/**
 * Junta a coleta aos registros existentes. O mesmo post na mesma conta
 * (mesmo código de post) é atualizado, não duplicado: as métricas da API substituem as
 * anteriores, mas um valor vazio na API nunca apaga um valor preenchido à mão, e
 * os campos editoriais (funil, categoria, descrição, observações, regra) são mantidos.
 */
export function aplicarColeta(existentes: RegistroInsight[], coletados: RegistroInsight[]): ResultadoColeta {
  const registros = [...existentes]
  let novos = 0
  let atualizados = 0
  for (const c of coletados) {
    const i = registros.findIndex(
      (x) => x.company === c.company && x.account === c.account && !!x.link && chaveDoPost(x.link) === chaveDoPost(c.link),
    )
    if (i < 0) {
      registros.push(c)
      novos++
      continue
    }
    const atual = registros[i]
    const metricas = Object.fromEntries(
      (['reach', 'plays', 'likes', 'comments', 'shares', 'saves', 'follows', 'watch'] as const).map((k) => [k, c[k] ?? atual[k] ?? null]),
    )
    registros[i] = { ...atual, ...metricas, collected: c.collected, updated: c.updated }
    atualizados++
  }
  return { registros, novos, atualizados }
}
