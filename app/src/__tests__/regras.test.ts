import { describe, expect, it } from 'vitest'
import { CHAVE_INSIGHTS, CHAVE_SIMULAR_ERRO, carregarInsights, ErroDeArmazenamento, salvarInsights } from '../data/armazenamento'
import type { ItemDrive, RegistroInsight } from '../data/types'
import { aplicarAcao, podeDecidir, podeEnviar } from '../lib/aprovacao'
import { navegar, periodoDe } from '../lib/calendario'
import { idDoArquivo, indexar, pesquisar, tipoDeMidia } from '../lib/drive'
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
  it('sem usuário autenticado ninguém envia nem aprova', () => {
    const [emProducao] = atividadesDemonstrativas('2026-10-21')
    expect(podeEnviar(null, emProducao)).toBe(false)
    expect(podeDecidir(null, aguardando)).toBe(false)
    expect(() => aplicarAcao(aguardando, 'aprovar', null)).toThrow()
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

describe('biblioteca do Drive (somente fotos e vídeos)', () => {
  const f = (path: string, type: ItemDrive['type'], id: string, mimeType?: string): ItemDrive => ({
    name: path.split(' / ').at(-1)!,
    url: type === 'Pasta' ? `https://drive.google.com/drive/folders/${id}` : `https://drive.google.com/file/d/${id}/view`,
    path,
    type,
    ...(mimeType ? { mimeType } : {}),
  })
  const indice = indexar([
    f('LIDERAR / FOTOS', 'Pasta', 'A'),
    f('LIDERAR / FOTOS / evento.jpg', 'Foto', 'B'),
    f('LIDERAR / FOTOS / Jacy no palco.jpg', 'Foto', 'C'),
    f('LIDERAR / CAPTAÇÃO', 'Pasta', 'D'),
    f('LIDERAR / CAPTAÇÃO / Gravação bruta.mp4', 'Vídeo', 'E'),
    f('LIDERAR / DOCUMENTOS', 'Pasta', 'F'),
    f('LIDERAR / DOCUMENTOS / contrato.pdf', 'Documento', 'G'),
    f('LIDERAR / DOCUMENTOS / atalho.jpg', 'Documento', 'H'),
    f('LIDERAR / DOCUMENTOS / banner.psd', 'Foto', 'I'),
    f('LIDERAR / JACIARA', 'Pasta', 'J'),
    f('LIDERAR / JACIARA / EVENTO', 'Pasta', 'P'),
    f('LIDERAR / JACIARA / TRABALHOS JACIARA', 'Pasta', 'Q'),
    f('LIDERAR / JACIARA / TRABALHOS JACIARA / outdoor.jpg', 'Foto', 'R'),
    f('LIDERAR / JACIARA / EVENTO / palestra.jpg', 'Foto', 'K'),
    f('LIDERAR / JACIARA / EVENTO / Jaci-01.jpg', 'Foto', 'L'),
    f('LIDERAR / MQA 8', 'Pasta', 'M'),
    f('LIDERAR / MQA 8 / IMG_1.HEIC', 'Foto', 'N'),
  ])
  const nomes = (xs: { name: string }[]) => xs.map((x) => x.name)

  it('classifica pelo MIME, depois pelo tipo do catálogo e só então pela extensão', () => {
    expect(tipoDeMidia({ name: 'sem extensão', type: 'Documento', mimeType: 'video/mp4' })).toBe('Vídeo')
    expect(tipoDeMidia({ name: 'Call', type: 'Vídeo' })).toBe('Vídeo')
    expect(tipoDeMidia({ name: 'atalho.jpg', type: 'Documento' })).toBeNull()
    expect(tipoDeMidia({ name: 'arte.cdr', type: 'Foto', mimeType: 'image/x-coreldraw' })).toBeNull()
    expect(tipoDeMidia({ name: 'audio.mp3', type: 'Documento', mimeType: 'audio/mpeg' })).toBeNull()
  })
  it('exclui documentos e pastas sem mídia catalogada', () => {
    expect(nomes(pesquisar(indice, { texto: '', tipo: '', pasta: 'LIDERAR', relacionados: true }))).toEqual(['CAPTAÇÃO', 'FOTOS', 'JACIARA', 'MQA 8'])
    expect(indice.ignorados).toBe(3)
    expect(indice.contagens.get('LIDERAR')).toEqual({ fotos: 6, videos: 1 })
  })
  it('pesquisa e filtra só entre fotos, vídeos e pastas', () => {
    expect(pesquisar(indice, { texto: 'GRAVACAO', tipo: '', pasta: 'LIDERAR', relacionados: false })).toHaveLength(1)
    expect(pesquisar(indice, { texto: 'contrato', tipo: '', pasta: 'LIDERAR', relacionados: false })).toHaveLength(0)
    expect(nomes(pesquisar(indice, { texto: 'jaciara', tipo: 'Foto', pasta: 'LIDERAR', relacionados: true })).sort()).toEqual(['Jaci-01.jpg', 'Jacy no palco.jpg', 'outdoor.jpg', 'palestra.jpg'])
  })
  it('capa temática: Jaciara só com foto identificada como dela; evento usa foto da pasta', () => {
    expect(indice.capaDe('LIDERAR / JACIARA')).toMatchObject({ tema: { id: 'jaciara' }, foto: { name: 'Jaci-01.jpg' } })
    expect(indice.capaDe('LIDERAR / JACIARA / TRABALHOS JACIARA')).toMatchObject({ tema: { id: 'jaciara' }, foto: null })
    expect(indice.capaDe('LIDERAR / FOTOS').foto?.name).toBe('evento.jpg')
    // HEIC pode não ter miniatura: a pasta MQA fica com capa gráfica do tema.
    expect(indice.capaDe('LIDERAR / MQA 8')).toMatchObject({ tema: { id: 'mqa' }, foto: null })
    expect(indice.capaDe('LIDERAR / JACIARA')).toBe(indice.capaDe('LIDERAR / JACIARA'))
  })
  it('extrai o ID só de arquivos; pastas não têm prévia', () => {
    expect(idDoArquivo('https://drive.google.com/file/d/abc_1-2/view?usp=drivesdk')).toBe('abc_1-2')
    expect(idDoArquivo('https://drive.google.com/drive/folders/abc')).toBe('')
    expect(idDoArquivo('https://docs.google.com/document/d/abc/edit')).toBe('')
  })
})

describe('rotas (sistema exclusivo do Centro Liderar)', async () => {
  const { lerRota, hrefDaRota } = await import('../lib/rotas')
  it('lê "#/pagina" e o formato antigo do Centro Liderar', () => {
    expect(lerRota('#/insights')).toEqual({ empresaId: 'centro-liderar', pagina: 'insights' })
    expect(lerRota('#/centro-liderar/drive')).toEqual({ empresaId: 'centro-liderar', pagina: 'drive' })
    expect(hrefDaRota({ empresaId: 'centro-liderar', pagina: 'dashboard' })).toBe('#/dashboard')
  })
  it('não abre rotas de outras empresas', () => {
    expect(lerRota('#/smart-games/atividades')).toBeNull()
    expect(lerRota('#/up-machines/insights')).toBeNull()
  })
})
