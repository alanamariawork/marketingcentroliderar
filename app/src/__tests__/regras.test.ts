import { describe, expect, it } from 'vitest'
import { CHAVE_INSIGHTS, CHAVE_SIMULAR_ERRO, carregarInsights, ErroDeArmazenamento, salvarInsights } from '../data/armazenamento'
import type { RegistroInsight } from '../data/types'
import { aplicarAcao, podeDecidir } from '../lib/aprovacao'
import { navegar, periodoDe } from '../lib/calendario'
import { indexar, pesquisar } from '../lib/drive'
import { atividadesDemonstrativas } from '../state/Sessao'
import { RESPONSAVEIS_ATRIBUIVEIS } from '../data/constants'

class Memoria implements Storage {
  m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.get(k) ?? null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, v) }
}

const imp = [{ id: 'i1', company: 'Centro Liderar', account: 'MQA', link: 'https://x.com/p/1' } as RegistroInsight]

describe('armazenamento de Insights', () => {
  it('usa a chave da referência e acrescenta os importados', () => {
    const mem = new Memoria()
    const c = carregarInsights(imp, () => mem)
    expect(c.registros).toHaveLength(1)
    expect(JSON.parse(mem.getItem(CHAVE_INSIGHTS)!)).toHaveLength(1)
  })
  it('não apaga dados salvos ilegíveis e bloqueia novas gravações', () => {
    const mem = new Memoria()
    mem.setItem(CHAVE_INSIGHTS, '{corrompido')
    const c = carregarInsights(imp, () => mem)
    expect(c.gravacaoBloqueada).toBe(true)
    expect(mem.getItem(CHAVE_INSIGHTS)).toBe('{corrompido')
  })
  it('falha de gravação lança erro e mantém o que estava salvo', () => {
    const mem = new Memoria()
    carregarInsights(imp, () => mem)
    mem.setItem(CHAVE_SIMULAR_ERRO, '1')
    expect(() => salvarInsights([], () => mem)).toThrow(ErroDeArmazenamento)
    expect(JSON.parse(mem.getItem(CHAVE_INSIGHTS)!)).toHaveLength(1)
  })
})

describe('aprovação', () => {
  const [, aguardando] = atividadesDemonstrativas('2026-10-21')
  it('somente Kélvia aprova; Carlos não concede aprovação final', () => {
    expect(podeDecidir('Carlos', aguardando)).toBe(false)
    expect(() => aplicarAcao(aguardando, 'aprovar', 'Carlos')).toThrow()
    const ok = aplicarAcao(aguardando, 'aprovar', 'Kélvia', '', '2026-10-21T12:00:00Z')
    expect(ok.status).toBe('Aprovado')
    expect(ok.historico.at(-1)?.texto).toBe('Kélvia aprovou a versão 1.')
  })
  it('ajustes exigem orientação, voltam para Carlos e o reenvio gera nova versão', () => {
    expect(() => aplicarAcao(aguardando, 'ajustes', 'Kélvia', ' ')).toThrow()
    const ajustes = aplicarAcao(aguardando, 'ajustes', 'Kélvia', 'Trocar a capa')
    expect(ajustes.status).toBe('Ajustes solicitados')
    expect(() => aplicarAcao(ajustes, 'enviar', 'Kélvia')).toThrow()
    const reenvio = aplicarAcao(ajustes, 'enviar', 'Carlos')
    expect(reenvio.versao).toBe(2)
    expect(reenvio.historico.map((h) => h.autor)).toEqual(['Carlos', 'Kélvia', 'Carlos'])
  })
  it('Anny não aparece nas novas atribuições; Jordana sim', () => {
    expect(RESPONSAVEIS_ATRIBUIVEIS).not.toContain('Anny')
    expect(RESPONSAVEIS_ATRIBUIVEIS).toContain('Jordana')
  })
})

describe('cronograma', () => {
  it('semana tem 7 dias de segunda a domingo', () => {
    const p = periodoDe('Semanal', '2026-10-21')
    expect(p.dias).toHaveLength(7)
    expect(p.dias[0]).toBe('2026-10-19')
    expect(p.dias[6]).toBe('2026-10-25')
  })
  it('trimestre, semestre e ano têm 3, 6 e 12 meses', () => {
    expect(periodoDe('Trimestral', '2026-10-21').meses).toEqual(['2026-10-01', '2026-11-01', '2026-12-01'])
    expect(periodoDe('Semestral', '2026-10-21').meses[0]).toBe('2026-07-01')
    expect(periodoDe('Anual', '2026-10-21').meses).toHaveLength(12)
    expect(periodoDe('Anual', '2026-10-21').fim).toBe('2026-12-31')
  })
  it('navega períodos sem deslocar dias', () => {
    expect(navegar('Diária', '2026-12-31', 1)).toBe('2027-01-01')
    expect(navegar('Semanal', '2026-10-21', -1)).toBe('2026-10-14')
    expect(navegar('Semestral', '2026-10-21', 1)).toBe('2027-04-01')
  })
})

describe('pesquisa do Drive', () => {
  const indice = indexar([
    { name: 'FOTOS', url: 'https://drive.google.com/drive/folders/A', path: 'LIDERAR / FOTOS', type: 'Pasta' },
    { name: 'Jacy no palco.jpg', url: 'https://drive.google.com/file/d/B/view', path: 'LIDERAR / FOTOS / Jacy no palco.jpg', type: 'Foto' },
    { name: 'Gravação bruta.mp4', url: 'https://drive.google.com/file/d/C/view', path: 'LIDERAR / CAPTAÇÃO / Gravação bruta.mp4', type: 'Vídeo' },
  ])
  it('sem palavras mostra só o conteúdo direto da pasta', () => {
    expect(pesquisar(indice, { texto: '', tipo: '', pasta: 'LIDERAR', relacionados: true }).map((x) => x.name)).toEqual(['FOTOS'])
  })
  it('ignora acentos e maiúsculas e usa termos relacionados', () => {
    expect(pesquisar(indice, { texto: 'GRAVACAO', tipo: '', pasta: 'LIDERAR', relacionados: false })).toHaveLength(1)
    expect(pesquisar(indice, { texto: 'jaciara', tipo: '', pasta: 'LIDERAR', relacionados: true })).toHaveLength(1)
    expect(pesquisar(indice, { texto: 'jaciara', tipo: '', pasta: 'LIDERAR', relacionados: false })).toHaveLength(0)
  })
  it('usa a primeira foto da pasta como capa', () => {
    expect(indice.capas.get('LIDERAR / FOTOS')?.name).toBe('Jacy no palco.jpg')
  })
})
