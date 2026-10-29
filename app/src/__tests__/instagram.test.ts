import { describe, expect, it } from 'vitest'
import type { RegistroInsight } from '../data/types'
import {
  aplicarColeta,
  CONTAS_INSTAGRAM,
  chaveDoPost,
  diaAlvo,
  diaEmFortaleza,
  metricasParaPedir,
  paraRegistro,
  publicacoesDoDia,
  type MidiaInstagram,
} from '../lib/instagram'

const reel: MidiaInstagram = {
  id: '179',
  caption: '\nVocê não está atrasada!\n#mqa',
  media_type: 'VIDEO',
  media_product_type: 'REELS',
  permalink: 'https://www.instagram.com/reel/DaBc123/',
  timestamp: '2026-10-22T02:30:00+0000',
}
const mqa = CONTAS_INSTAGRAM.find((c) => c.account === 'MQA')!

describe('agente de Insights: dia e seleção', () => {
  it('busca os posts de 7 dias atrás no fuso de Fortaleza', () => {
    // 29/10 às 8h em Fortaleza = 11h UTC
    expect(diaAlvo(new Date('2026-10-29T11:00:00Z'))).toBe('2026-10-22')
    // 01h UTC do dia 29 ainda é dia 28 em Fortaleza
    expect(diaAlvo(new Date('2026-10-29T01:00:00Z'))).toBe('2026-10-21')
    expect(diaAlvo(new Date('2026-03-05T12:00:00Z'))).toBe('2026-02-26')
  })
  it('converte o horário da API para o dia de Fortaleza', () => {
    // 02h30 UTC do dia 22 = 23h30 do dia 21 em Fortaleza
    expect(diaEmFortaleza(reel.timestamp)).toBe('2026-10-21')
  })
  it('seleciona só as publicações do dia, sem stories', () => {
    const story = { ...reel, id: 's', media_product_type: 'STORY' as const }
    const outro = { ...reel, id: 'o', timestamp: '2026-10-20T15:00:00+0000' }
    expect(publicacoesDoDia([reel, story, outro], '2026-10-21').map((m) => m.id)).toEqual(['179'])
  })
  it('pede métricas compatíveis com o tipo da publicação', () => {
    expect(metricasParaPedir(reel)).toContain('ig_reels_avg_watch_time')
    expect(metricasParaPedir({ media_product_type: 'FEED' })).toContain('follows')
    expect(metricasParaPedir({ media_product_type: 'FEED' })).not.toContain('ig_reels_avg_watch_time')
  })
})

describe('agente de Insights: conversão', () => {
  const r = paraRegistro(reel, { reach: 1200, views: 3400, likes: 80, comments: 5, shares: 7, saved: 9, ig_reels_avg_watch_time: 8450 }, mqa, new Date('2026-10-29T11:00:00Z'))
  it('preenche os campos do sistema', () => {
    expect(r).toMatchObject({
      id: 'ig-179', company: 'Centro Liderar', account: 'MQA', rule: 'mqa', date: '2026-10-21', collected: '2026-10-29',
      type: 'Reels', format: 'Reels', description: 'Você não está atrasada!', reach: 1200, plays: 3400, saves: 9, watch: 8.5,
    })
  })
  it('deixa vazio (não zero) o que a API não entrega', () => {
    for (const k of ['nonfollowers', 'followers', 'clicks', 'reposts', 'repeats', 'follows'] as const) expect(r[k]).toBeNull()
    expect(r.funnel).toBe('')
    expect(r.category).toBe('')
  })
  it('classifica carrossel e estático', () => {
    expect(paraRegistro({ ...reel, media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED' }, {}, mqa).format).toBe('Carrossel')
    expect(paraRegistro({ ...reel, media_type: 'IMAGE', media_product_type: 'FEED' }, {}, mqa).format).toBe('Estático')
  })
})

describe('agente de Insights: junção sem duplicar', () => {
  const manual = {
    id: 'manual-1', company: 'Centro Liderar', account: 'MQA', date: '2026-10-21', rule: 'mqa', collected: '2026-10-25', updated: '',
    notes: 'Anotação da equipe', type: 'Reels', funnel: 'NUTRIÇÃO', format: 'Reels', description: 'Texto da equipe',
    link: 'https://www.instagram.com/p/DaBc123/?igsh=x', category: 'Orgânico', reach: 900, followers: 70, nonfollowers: 30, follows: 4,
  } as RegistroInsight
  const coletado = paraRegistro(reel, { reach: 1200, views: 3400 }, mqa, new Date('2026-10-29T11:00:00Z'))

  it('reconhece o mesmo post em /p/ e /reel/', () => {
    expect(chaveDoPost(manual.link)).toBe(chaveDoPost(reel.permalink))
  })
  it('atualiza métricas sem apagar o que foi preenchido à mão', () => {
    const { registros, novos, atualizados } = aplicarColeta([manual], [coletado])
    expect([novos, atualizados, registros.length]).toEqual([0, 1, 1])
    expect(registros[0]).toMatchObject({
      id: 'manual-1', reach: 1200, plays: 3400, followers: 70, nonfollowers: 30, follows: 4,
      funnel: 'NUTRIÇÃO', category: 'Orgânico', notes: 'Anotação da equipe', description: 'Texto da equipe', collected: '2026-10-29',
    })
  })
  it('acrescenta post novo e não duplica na segunda execução', () => {
    const primeira = aplicarColeta([], [coletado])
    const segunda = aplicarColeta(primeira.registros, [coletado])
    expect([primeira.novos, segunda.novos, segunda.atualizados, segunda.registros.length]).toEqual([1, 0, 1, 1])
  })
  it('o mesmo post em outra conta (collab) é registro separado', () => {
    const outra = { ...coletado, account: 'Centro Liderar' }
    expect(aplicarColeta([manual], [outra]).novos).toBe(1)
  })
})
