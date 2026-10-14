import { describe, expect, it } from 'vitest'
import type { Conteudo, Metricas } from '../data/types'
import { calcularIndicadores, comparacaoContas, serieEvolucao, somar } from '../lib/indicadores'

const vazio: Metricas = { alcance: null, visualizacoes: null, curtidas: null, comentarios: null, compartilhamentos: null, salvamentos: null }

function conteudo(p: Partial<Conteudo>): Conteudo {
  return {
    id: Math.random().toString(36), empresaId: 'smart-games', criadoEm: '', atualizadoEm: '',
    titulo: 't', contaId: 'a', formato: 'Post', data: '2026-10-10', horario: '09:00', responsavel: null,
    status: 'Publicado', legenda: '', linkMaterial: '', metricas: null, metricasRegistradasEm: null, ...p,
  }
}

describe('indicadores', () => {
  it('diferencia ausência de dado de zero', () => {
    expect(somar([null, null])).toBeNull()
    expect(somar([0, null])).toBe(0)
  })

  it('soma alcance e interações apenas do que foi registrado', () => {
    const lista = [
      conteudo({ metricas: { ...vazio, alcance: 100, curtidas: 5, comentarios: 0 } }),
      conteudo({ metricas: null }),
      conteudo({ metricas: { ...vazio, alcance: 0 } }),
    ]
    const r = calcularIndicadores(lista, [], '2026-10-14')
    expect(r.publicados).toBe(3)
    expect(r.alcance).toBe(100)
    expect(r.comAlcance).toBe(2)
    expect(r.interacoes).toBe(5)
    expect(r.comInteracoes).toBe(1)
  })

  it('sem nenhum resultado, alcance e interações ficam sem dado', () => {
    const r = calcularIndicadores([conteudo({})], [], '2026-10-14')
    expect(r.alcance).toBeNull()
    expect(r.interacoes).toBeNull()
  })

  it('conta atividades pendentes e atrasadas', () => {
    const base = { id: '', empresaId: 'smart-games' as const, criadoEm: '', atualizadoEm: '', titulo: '', descricao: '', responsavel: null, prioridade: 'Média' as const, conteudoId: null }
    const r = calcularIndicadores([], [
      { ...base, status: 'A fazer', prazo: '2026-10-01' },
      { ...base, status: 'Em revisão', prazo: '' },
      { ...base, status: 'Concluído', prazo: '2026-10-01' },
    ], '2026-10-14')
    expect(r.pendentes).toBe(2)
    expect(r.atrasadas).toBe(1)
  })

  it('gera série diária para 7 dias e compara contas', () => {
    const lista = [conteudo({ data: '2026-10-10' }), conteudo({ data: '2026-10-10', contaId: 'b' })]
    const serie = serieEvolucao(lista, { inicio: '2026-10-08', fim: '2026-10-14' }, 'publicados')
    expect(serie).toHaveLength(7)
    expect(serie.find((p) => p.chave === '2026-10-10')?.valor).toBe(2)
    const contas = [
      { id: 'a', nome: 'A', plataforma: 'Instagram' as const, perfil: '@a', empresaId: 'smart-games' as const, criadoEm: '', atualizadoEm: '' },
      { id: 'b', nome: 'B', plataforma: 'TikTok' as const, perfil: '@b', empresaId: 'smart-games' as const, criadoEm: '', atualizadoEm: '' },
    ]
    expect(comparacaoContas(lista, contas, 'alcance').map((p) => p.valor)).toEqual([null, null])
  })
})
