/**
 * Dashboard no modelo DashPortal, adaptado aos Insights orgânicos: períodos
 * (com comparação ao período anterior), totais, taxas, mês a mês, dia a dia e
 * ranking de publicações. Valores ausentes nunca entram como zero.
 */
import type { ChaveMetrica, RegistroInsight } from '../data/types'
import { calcularScore } from './insights'
import { diasEntre, formatarData, somarDias } from './dates'

/* ---------- Período ---------- */

export type PresetPeriodo = 'automatico' | 'hoje' | 'ontem' | 'este-mes' | 'ultimos' | 'avancado' | 'tudo'

export const PRESETS_PERIODO: { id: PresetPeriodo; rotulo: string }[] = [
  { id: 'automatico', rotulo: 'Período automático' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'ontem', rotulo: 'Ontem' },
  { id: 'este-mes', rotulo: 'Este mês' },
  { id: 'ultimos', rotulo: 'Últimos dias' },
  { id: 'avancado', rotulo: 'Avançado' },
  { id: 'tudo', rotulo: 'Todo o histórico' },
]

export interface EscolhaPeriodo {
  preset: PresetPeriodo
  /** "Últimos dias": quantos dias, contando hoje. */
  dias: number
  /** "Avançado": AAAA-MM-DD; vazio = sem limite. */
  de: string
  ate: string
}

export const PERIODO_PADRAO: EscolhaPeriodo = { preset: 'automatico', dias: 30, de: '', ate: '' }

/** Dias do período automático: os 30 dias que terminam na publicação mais recente. */
export const DIAS_AUTOMATICO = 30

export interface Periodo {
  /** Vazio = sem limite. */
  de: string
  ate: string
  rotulo: string
}

/**
 * Resolve a escolha em datas. O período automático termina na publicação mais
 * recente da seleção (os registros são coletados depois da postagem, então
 * "hoje" costuma estar vazio) e cobre 30 dias.
 */
export function resolverPeriodo(e: EscolhaPeriodo, hoje: string, ultimaPublicacao: string): Periodo {
  const intervalo = (de: string, ate: string, prefixo = '') => ({
    de,
    ate,
    rotulo: `${prefixo}${de === ate ? formatarData(de) : `${formatarData(de)} a ${formatarData(ate)}`}`,
  })
  switch (e.preset) {
    case 'hoje':
      return intervalo(hoje, hoje)
    case 'ontem':
      return intervalo(somarDias(hoje, -1), somarDias(hoje, -1))
    case 'este-mes':
      return intervalo(hoje.slice(0, 8) + '01', hoje)
    case 'ultimos': {
      const n = Math.max(1, Math.min(3650, Math.round(e.dias) || 1))
      return intervalo(somarDias(hoje, -(n - 1)), hoje)
    }
    case 'avancado':
      if (!e.de && !e.ate) return { de: '', ate: '', rotulo: 'Todo o histórico' }
      if (!e.de) return { de: '', ate: e.ate, rotulo: `Até ${formatarData(e.ate)}` }
      if (!e.ate) return { de: e.de, ate: '', rotulo: `Desde ${formatarData(e.de)}` }
      return intervalo(e.de, e.ate)
    case 'tudo':
      return { de: '', ate: '', rotulo: 'Todo o histórico' }
    case 'automatico': {
      const fim = ultimaPublicacao || hoje
      return intervalo(somarDias(fim, -(DIAS_AUTOMATICO - 1)), fim, 'Automático: ')
    }
  }
}

/** Período imediatamente anterior, do mesmo tamanho. `null` quando o período não tem início e fim. */
export function periodoAnterior(p: Periodo): Periodo | null {
  if (!p.de || !p.ate) return null
  const dias = diasEntre(p.de, p.ate) + 1
  const ate = somarDias(p.de, -1)
  const de = somarDias(ate, -(dias - 1))
  return { de, ate, rotulo: de === ate ? formatarData(de) : `${formatarData(de)} a ${formatarData(ate)}` }
}

/** Registros com data dentro do período. Sem limites, inclui também os registros sem data. */
export function noPeriodo(linhas: RegistroInsight[], p: Pick<Periodo, 'de' | 'ate'>): RegistroInsight[] {
  if (!p.de && !p.ate) return linhas
  return linhas.filter((x) => !!x.date && (!p.de || x.date >= p.de) && (!p.ate || x.date <= p.ate))
}

export const ultimaData = (linhas: RegistroInsight[]) => linhas.reduce((m, x) => (x.date > m ? x.date : m), '')

/* ---------- Totais e taxas ---------- */

const soma = (linhas: RegistroInsight[], k: ChaveMetrica): number | null => {
  const v = linhas.map((x) => x[k]).filter((n): n is number => typeof n === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}
const media = (linhas: RegistroInsight[], k: ChaveMetrica): number | null => {
  const v = linhas.map((x) => x[k]).filter((n): n is number => typeof n === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** Interações de um post (curtidas, comentários, compartilhamentos e salvamentos); `null` se nenhuma foi informada. */
export function interacoes(x: RegistroInsight): number | null {
  const v = [x.likes, x.comments, x.shares, x.saves].filter((n): n is number => typeof n === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}

export interface Totais {
  publicacoes: number
  alcance: number | null
  reproducoes: number | null
  curtidas: number | null
  comentarios: number | null
  compartilhamentos: number | null
  salvamentos: number | null
  interacoes: number | null
  seguidores: number | null
  cliques: number | null
  /** Interações ÷ alcance, só nos posts com os dois informados (%). */
  engajamento: number | null
  /** Alcance médio por publicação. */
  alcanceMedio: number | null
  /** Média simples do % de não seguidores informado. */
  naoSeguidores: number | null
  /** Média do tempo de visualização informado (s). */
  tempoMedio: number | null
}

export function totais(linhas: RegistroInsight[]): Totais {
  const comAmbos = linhas.filter((x) => typeof x.reach === 'number' && x.reach > 0 && interacoes(x) != null)
  const alcanceAmbos = comAmbos.reduce((a, x) => a + (x.reach as number), 0)
  const inter = linhas.map(interacoes).filter((n): n is number => n != null)
  return {
    publicacoes: linhas.length,
    alcance: soma(linhas, 'reach'),
    reproducoes: soma(linhas, 'plays'),
    curtidas: soma(linhas, 'likes'),
    comentarios: soma(linhas, 'comments'),
    compartilhamentos: soma(linhas, 'shares'),
    salvamentos: soma(linhas, 'saves'),
    interacoes: inter.length ? inter.reduce((a, b) => a + b, 0) : null,
    seguidores: soma(linhas, 'follows'),
    cliques: soma(linhas, 'clicks'),
    engajamento: alcanceAmbos ? (comAmbos.reduce((a, x) => a + interacoes(x)!, 0) / alcanceAmbos) * 100 : null,
    alcanceMedio: media(linhas, 'reach'),
    naoSeguidores: media(linhas, 'nonfollowers'),
    tempoMedio: media(linhas, 'watch'),
  }
}

/** Variação percentual em relação ao período anterior; `null` quando não há base para comparar. */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null || anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

/* ---------- Mês a mês e dia a dia ---------- */

export interface LinhaMes extends Totais {
  /** AAAA-MM */
  mes: string
}

/** Totais por mês (do mais antigo ao mais recente). Registros sem data ficam de fora. */
export function porMes(linhas: RegistroInsight[]): LinhaMes[] {
  const grupos = new Map<string, RegistroInsight[]>()
  for (const x of linhas) {
    if (!x.date) continue
    const m = x.date.slice(0, 7)
    grupos.set(m, [...(grupos.get(m) ?? []), x])
  }
  return [...grupos.keys()].sort().map((mes) => ({ mes, ...totais(grupos.get(mes)!) }))
}

export interface LinhaDia {
  dia: string
  publicacoes: number
  alcance: number | null
  interacoes: number | null
}

/** Todos os dias do período (inclusive os sem publicação), para a tendência diária. */
export function porDia(linhas: RegistroInsight[], p: Pick<Periodo, 'de' | 'ate'>): LinhaDia[] {
  const datas = linhas.map((x) => x.date).filter(Boolean).sort()
  const de = p.de || datas[0]
  const ate = p.ate || datas.at(-1)
  if (!de || !ate || de > ate) return []
  const total = Math.min(diasEntre(de, ate) + 1, 400)
  const inicio = somarDias(ate, -(total - 1))
  return Array.from({ length: total }, (_, i) => {
    const dia = somarDias(inicio, i)
    const t = totais(linhas.filter((x) => x.date === dia))
    return { dia, publicacoes: t.publicacoes, alcance: t.alcance, interacoes: t.interacoes }
  })
}

export const NOMES_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const rotuloMes = (mes: string) => `${NOMES_MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`

/* ---------- Ranking ---------- */

export type CriterioRanking = 'alcance' | 'reproducoes' | 'interacoes' | 'seguidores' | 'score-liderar' | 'score-mqa'

export const CRITERIOS_RANKING: { id: CriterioRanking; rotulo: string }[] = [
  { id: 'alcance', rotulo: 'Alcance' },
  { id: 'reproducoes', rotulo: 'Reproduções' },
  { id: 'interacoes', rotulo: 'Interações' },
  { id: 'seguidores', rotulo: 'Seguidores ganhos' },
  { id: 'score-liderar', rotulo: 'Score Liderar' },
  { id: 'score-mqa', rotulo: 'Score MQA' },
]

export function valorRanking(x: RegistroInsight, c: CriterioRanking): number | null {
  switch (c) {
    case 'alcance':
      return x.reach ?? null
    case 'reproducoes':
      return x.plays ?? null
    case 'interacoes':
      return interacoes(x)
    case 'seguidores':
      return x.follows ?? null
    case 'score-liderar':
      return x.rule === 'liderar' ? calcularScore(x) : null
    case 'score-mqa':
      return x.rule === 'mqa' ? calcularScore(x) : null
  }
}

/** Publicações com o critério informado, da maior para a menor (desempate: mais recente, depois ID). */
export function ranking(linhas: RegistroInsight[], c: CriterioRanking): { x: RegistroInsight; valor: number }[] {
  return linhas
    .map((x) => ({ x, valor: valorRanking(x, c) }))
    .filter((r): r is { x: RegistroInsight; valor: number } => r.valor != null)
    .sort((a, b) => b.valor - a.valor || b.x.date.localeCompare(a.x.date) || (a.x.id < b.x.id ? -1 : 1))
}
