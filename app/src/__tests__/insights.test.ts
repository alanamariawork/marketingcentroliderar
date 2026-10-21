import { describe, expect, it } from 'vitest'
import importados from '../data/importados/insights.json'
import type { RegistroInsight } from '../data/types'
import {
  agregar,
  calcularScore,
  deduplicarCollabs,
  etapaFunil,
  filtrarInsights,
  FILTROS_VAZIOS,
  linkCanonico,
  mesclarImportados,
  validarInsight,
} from '../lib/insights'

const dados = importados as RegistroInsight[]

function reg(p: Partial<RegistroInsight>): RegistroInsight {
  return {
    id: 'x', company: 'Centro Liderar', account: 'Centro Liderar', date: '2026-10-01', rule: '', collected: '', updated: '',
    notes: '', type: 'Feed', funnel: 'ESCALA', format: 'Reels', description: 'Post', link: '', category: 'Orgânico', ...p,
  }
}

describe('dados históricos importados do HTML', () => {
  it('tem exatamente 50 Centro Liderar, 29 MQA e 1.124 da Jaciara, com ids únicos', () => {
    const conta = (a: string) => dados.filter((x) => x.account === a).length
    expect(conta('Centro Liderar')).toBe(50)
    expect(conta('MQA')).toBe(29)
    expect(conta('Jaciara Mendes — Instagram')).toBe(1124)
    expect(dados).toHaveLength(1203)
    expect(new Set(dados.map((x) => x.id)).size).toBe(1203)
  })

  it('preserva valores ausentes como null e origem da planilha', () => {
    expect(dados.some((x) => x.clicks === null)).toBe(true)
    expect(dados.every((x) => x.notes.length > 0)).toBe(true)
    expect(dados.every((x) => x.sourceSheet)).toBe(true)
  })

  it('só aplica a regra Liderar à Jaciara quando a fórmula da planilha corresponde', () => {
    const jaci = dados.filter((x) => x.account === 'Jaciara Mendes — Instagram' && x.rule === 'liderar')
    expect(jaci.length).toBeGreaterThan(0)
    expect(jaci.every((x) => /\/3\)$/.test(x.sourceFormula ?? '') && /^=SUM\(/.test(x.sourceFormula ?? ''))).toBe(true)
    expect(dados.filter((x) => x.rule === 'mqa').every((x) => x.account === 'MQA')).toBe(true)
  })
})

describe('score', () => {
  it('Liderar divide só os novos seguidores por 3', () => {
    expect(calcularScore({ rule: 'liderar', plays: 100, shares: 10, follows: 9 })).toBe(113)
  })
  it('MQA soma os três campos', () => {
    expect(calcularScore({ rule: 'mqa', plays: 100, shares: 10, follows: 9 })).toBe(119)
  })
  it('não calcula com campo ausente ou sem regra; zero é válido', () => {
    expect(calcularScore({ rule: 'liderar', plays: 100, shares: null, follows: 9 })).toBeNull()
    expect(calcularScore({ rule: '', plays: 1, shares: 1, follows: 1 })).toBeNull()
    expect(calcularScore({ rule: 'mqa', plays: 0, shares: 0, follows: 0 })).toBe(0)
  })
  it('reproduz o score histórico das linhas Liderar importadas', () => {
    const r = dados.find((x) => x.id === 'jaci-99aa8a21542d')!
    expect(calcularScore(r)).toBe(r.sourceScore)
  })
})

describe('agregação', () => {
  it('ignora campos ausentes em vez de tratá-los como zero', () => {
    const rows = [reg({ reach: 10, watch: 20 }), reg({ reach: null, watch: null }), reg({ reach: 0, watch: 10 })]
    expect(agregar(rows, 'reach')).toBe(10)
    expect(agregar(rows, 'watch', true)).toBe(15)
    expect(agregar([reg({})], 'reach')).toBeNull()
  })
})

describe('collabs e duplicidade', () => {
  it('canoniza o link ignorando parâmetros e barra final', () => {
    expect(linkCanonico('https://www.instagram.com/p/ABC/?igsh=1')).toBe('www.instagram.com/p/ABC')
  })
  it('consolidado conta o post uma vez, mantendo a primeira medição', () => {
    const a = reg({ id: 'a', account: 'Centro Liderar', link: 'https://instagram.com/p/X/', reach: 100 })
    const b = reg({ id: 'b', account: 'MQA', link: 'https://instagram.com/p/X?x=1', reach: 80 })
    const r = deduplicarCollabs([a, b])
    expect(r.map((x) => x.id)).toEqual(['a'])
    // Filtrando a conta MQA, a medição dela continua disponível.
    expect(filtrarInsights([a, b], 'Centro Liderar', { ...FILTROS_VAZIOS, account: 'MQA' })[0].reach).toBe(80)
  })
  it('impede o mesmo post duas vezes na mesma conta, mas aceita outra conta (collab)', () => {
    const existentes = [reg({ id: 'a', account: 'MQA', link: 'https://instagram.com/p/X/' })]
    const base = {
      account: 'MQA', date: '2026-10-01', type: 'Feed', funnel: 'ESCALA', format: 'Reels', category: 'Orgânico',
      description: 'd', link: 'https://instagram.com/p/X?igsh=2', collected: '', rule: '' as const, notes: '', metricas: {},
    }
    const ctx = { hoje: '2026-10-21', company: 'Centro Liderar', existentes }
    expect(validarInsight(base, ctx).link).toMatch(/já está cadastrado/)
    expect(validarInsight({ ...base, account: 'Centro Liderar' }, ctx).link).toBeUndefined()
    expect(validarInsight(base, { ...ctx, id: 'a' }).link).toBeUndefined()
  })
})

describe('validações preservadas da referência', () => {
  const base = {
    account: 'MQA', date: '2026-10-01', type: 'Feed', funnel: 'ESCALA', format: 'Reels', category: 'Orgânico',
    description: 'd', link: '', collected: '2026-10-02', rule: '' as const, notes: '', metricas: {},
  }
  const ctx = { hoje: '2026-10-21', company: 'Centro Liderar', existentes: [] }
  it('percentuais devem somar 100% com tolerância de 0,2', () => {
    expect(validarInsight({ ...base, metricas: { nonfollowers: 60, followers: 40.1 } }, ctx).followers).toBeUndefined()
    expect(validarInsight({ ...base, metricas: { nonfollowers: 60, followers: 30 } }, ctx).followers).toMatch(/100%/)
  })
  it('exige data de coleta quando há métricas e não aceita coleta antes da publicação', () => {
    expect(validarInsight({ ...base, collected: '', metricas: { likes: 0 } }, ctx).collected).toMatch(/coleta/)
    expect(validarInsight({ ...base, collected: '2026-09-01' }, ctx).collected).toMatch(/anterior/)
  })
  it('exige link http(s)', () => {
    expect(validarInsight({ ...base, link: 'instagram.com/p/1' }, ctx).link).toMatch(/https/)
  })
})

describe('funil', () => {
  it('trata NUTRICAO/OBJECAO sem acento como as etapas oficiais na comparação', () => {
    expect(etapaFunil('NUTRICAO')).toBe('NUTRIÇÃO')
    expect(etapaFunil('OBJECAO')).toBe('OBJEÇÃO')
    expect(etapaFunil('')).toBe('')
  })
})

describe('importação sem apagar dados salvos', () => {
  it('não sobrescreve um registro importado que já foi editado', () => {
    const editado = { ...dados[0], reach: 999999 }
    const r = mesclarImportados([editado], dados)
    expect(r).toHaveLength(1203)
    expect(r[0].reach).toBe(999999)
  })
  it('mantém registros criados pela pessoa', () => {
    const meu = reg({ id: 'meu', link: 'https://instagram.com/p/novo' })
    expect(mesclarImportados([meu], dados).find((x) => x.id === 'meu')).toBeTruthy()
  })
})
