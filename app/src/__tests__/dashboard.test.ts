import { describe, expect, it } from 'vitest'
import type { RegistroInsight } from '../data/types'
import {
  noPeriodo,
  periodoAnterior,
  porDia,
  porMes,
  PERIODO_PADRAO,
  ranking,
  resolverPeriodo,
  totais,
  ultimaData,
  variacao,
} from '../lib/dashboard'

const r = (id: string, date: string, m: Partial<RegistroInsight> = {}): RegistroInsight =>
  ({ id, company: 'Centro Liderar', account: 'MQA', date, rule: 'mqa', collected: '', updated: '', notes: '', type: '', funnel: '', format: 'Reels', description: id, link: '', category: '', ...m }) as RegistroInsight

const linhas = [
  r('a', '2026-10-09', { reach: 100, likes: 10, comments: 2, shares: 3, saves: 5, follows: 1 }),
  r('b', '2026-10-01', { reach: 300, likes: 20, comments: 0, shares: 0, saves: 0, plays: 900 }),
  r('c', '2026-09-05', { reach: 50 }),
  r('d', '2026-08-20', { reach: 0, likes: 0 }),
  r('e', '', { reach: 999 }),
]

describe('Dashboard: períodos', () => {
  it('período automático: 30 dias até a publicação mais recente, comparado aos 30 anteriores', () => {
    const p = resolverPeriodo(PERIODO_PADRAO, '2026-11-17', ultimaData(linhas))
    expect([p.de, p.ate]).toEqual(['2026-09-10', '2026-10-09'])
    expect(periodoAnterior(p)).toMatchObject({ de: '2026-08-11', ate: '2026-09-09' })
    expect(noPeriodo(linhas, p).map((x) => x.id)).toEqual(['a', 'b'])
  })
  it('hoje, ontem, este mês, últimos dias e avançado', () => {
    const h = '2026-11-17'
    const p = (preset: typeof PERIODO_PADRAO.preset, extra = {}) => resolverPeriodo({ ...PERIODO_PADRAO, preset, ...extra }, h, '')
    expect(p('hoje')).toMatchObject({ de: h, ate: h })
    expect(p('ontem')).toMatchObject({ de: '2026-11-16', ate: '2026-11-16' })
    expect(p('este-mes')).toMatchObject({ de: '2026-11-01', ate: h })
    expect(p('ultimos', { dias: 7 })).toMatchObject({ de: '2026-11-11', ate: h })
    expect(p('avancado', { de: '2026-01-01', ate: '2026-01-31' })).toMatchObject({ de: '2026-01-01', ate: '2026-01-31' })
    expect(periodoAnterior(p('avancado', { de: '2026-01-01', ate: '' }))).toBeNull()
  })
  it('todo o histórico inclui os registros sem data; períodos com limite, não', () => {
    expect(noPeriodo(linhas, { de: '', ate: '' })).toHaveLength(5)
    expect(noPeriodo(linhas, { de: '2000-01-01', ate: '2100-01-01' })).toHaveLength(4)
  })
})

describe('Dashboard: totais e comparação', () => {
  it('soma só o que foi informado e calcula o engajamento sobre posts com alcance e interações', () => {
    const t = totais(linhas.slice(0, 3))
    expect(t).toMatchObject({ publicacoes: 3, alcance: 450, reproducoes: 900, interacoes: 40, seguidores: 1, cliques: null })
    expect(t.engajamento).toBeCloseTo((40 / 400) * 100)
  })
  it('variação: queda de 100% quando zera; sem base, sem variação', () => {
    expect(variacao(0, 225)).toBe(-100)
    expect(variacao(50, 0)).toBeNull()
    expect(variacao(null, 10)).toBeNull()
  })
})

describe('Dashboard: mês a mês, dia a dia e ranking', () => {
  it('agrupa por mês sem os registros sem data', () => {
    expect(porMes(linhas).map((m) => [m.mes, m.publicacoes])).toEqual([['2026-08', 1], ['2026-09', 1], ['2026-10', 2]])
  })
  it('tendência diária cobre todos os dias do período', () => {
    const d = porDia(linhas, { de: '2026-10-01', ate: '2026-10-09' })
    expect(d).toHaveLength(9)
    expect(d[0]).toMatchObject({ dia: '2026-10-01', publicacoes: 1, alcance: 300 })
    expect(d[1]).toMatchObject({ publicacoes: 0, alcance: null })
  })
  it('ranking só com o critério informado, do maior para o menor', () => {
    expect(ranking(linhas, 'alcance').map((x) => x.x.id)).toEqual(['e', 'b', 'a', 'c', 'd'])
    expect(ranking(linhas, 'reproducoes').map((x) => x.x.id)).toEqual(['b'])
    expect(ranking(linhas, 'score-liderar')).toEqual([])
  })
})
