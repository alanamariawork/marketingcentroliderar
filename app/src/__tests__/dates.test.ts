import { describe, expect, it } from 'vitest'
import { ehDataValida, gradeDoMes, hoje, inicioDaSemana, somarDias, somarMeses, formatarData } from '../lib/dates'

describe('datas (America/Fortaleza)', () => {
  it('calcula "hoje" no fuso de Fortaleza, não no UTC', () => {
    // 02:30 UTC de 15/10 ainda é 23:30 de 14/10 em Fortaleza (UTC-3)
    expect(hoje(new Date('2026-10-15T02:30:00Z'))).toBe('2026-10-14')
    expect(hoje(new Date('2026-10-15T03:00:00Z'))).toBe('2026-10-15')
  })

  it('soma dias e meses sem deslocar o dia', () => {
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('monta a grade do mês em semanas de segunda a domingo', () => {
    const grade = gradeDoMes('2026-10-14')
    expect(grade[0]).toBe('2026-09-28')
    expect(grade.length % 7).toBe(0)
    expect(grade).toContain('2026-10-31')
    expect(inicioDaSemana('2026-10-14')).toBe('2026-10-12')
    expect(inicioDaSemana('2026-10-18')).toBe('2026-10-12') // domingo pertence à semana anterior
    expect(inicioDaSemana('2026-10-12')).toBe('2026-10-12')
  })

  it('valida e formata datas no padrão brasileiro', () => {
    expect(ehDataValida('2026-02-30')).toBe(false)
    expect(ehDataValida('2026-02-28')).toBe(true)
    expect(formatarData('2026-10-04')).toBe('04/10/2026')
  })
})
