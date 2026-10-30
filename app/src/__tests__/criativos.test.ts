import { describe, expect, it } from 'vitest'
import type { Atividade, Criativo, EventoCampanha, ItemDrive, PecaCriativo } from '../data/types'
import { indexar, ordenar, pesquisar, passaNaData, anosDisponiveis, FILTRO_DATA_VAZIO, diaDe } from '../lib/drive'
import {
  agruparPorEvento,
  classificarLink,
  comCriativo,
  decidir,
  editar,
  filtrarCriativos,
  FILTROS_CRIATIVOS_VAZIOS,
  novoCriativo,
  podeDecidirCriativo,
  podeEnviarCriativo,
  rotuloEnvio,
  statusDoCriativo,
  versaoAtual,
  type DadosCriativo,
} from '../lib/criativos'
import { podeDecidir, podeEnviar } from '../lib/aprovacao'
import { carregarCriativos, CHAVE_CRIATIVOS, salvarCriativos } from '../data/criativosArmazenamento'

/* ---------- Acervo: datas e ordenação ---------- */

const arq = (name: string, id: string, extra: Partial<ItemDrive> = {}): ItemDrive => ({
  name,
  url: `https://drive.google.com/file/d/${id}/view`,
  path: `LIDERAR / FOTOS / ${name}`,
  type: 'Foto',
  ...extra,
})
const catalogo: ItemDrive[] = [
  { name: 'FOTOS', url: 'https://drive.google.com/drive/folders/P1', path: 'LIDERAR / FOTOS', type: 'Pasta', modifiedTime: '2025-03-01T12:00:00Z' },
  arq('b.jpg', 'B', { createdTime: '2024-05-10T12:00:00Z', modifiedTime: '2026-01-02T12:00:00Z' }),
  arq('a.jpg', 'A', { createdTime: '2025-12-31T23:30:00-03:00', modifiedTime: '2025-06-01T12:00:00Z' }),
  arq('c.jpg', 'C'),
  arq('a.jpg', 'A2', { modifiedTime: '2025-06-01T12:00:00Z' }),
  // sem data no catálogo, mas com "2023" no nome: o ano nunca é deduzido do nome
  arq('evento 2023.jpg', 'D'),
]
const indice = indexar(catalogo)
const consulta = { texto: '', tipo: '' as const, pasta: 'LIDERAR / FOTOS', relacionados: true }
const nomes = (l: { name: string; url: string }[]) => l.map((x) => `${x.name}#${x.url.match(/d\/(\w+)|folders\/(\w+)/)!.slice(1).find(Boolean)}`)

describe('Acervo: datas do Drive', () => {
  it('usa a data do Drive no fuso de Fortaleza e nunca deduz pelo nome', () => {
    expect(diaDe(catalogo[2], 'criacao')).toBe('2025-12-31')
    expect(diaDe(catalogo[5], 'criacao')).toBe('')
    expect(anosDisponiveis(indice.itens, 'criacao')).toEqual(['2025', '2024'])
    expect(anosDisponiveis(indice.itens, 'modificacao')).toEqual(['2026', '2025'])
  })
  it('ano e intervalo são modos alternativos, sobre a data escolhida', () => {
    const r = (data: typeof FILTRO_DATA_VAZIO) => pesquisar(indice, { ...consulta, data }).map((x) => x.name).sort()
    expect(r({ ...FILTRO_DATA_VAZIO, modo: 'ano', ano: '2025' })).toEqual(['a.jpg', 'a.jpg', 'FOTOS'].sort().filter((n) => n !== 'FOTOS'))
    expect(r({ ...FILTRO_DATA_VAZIO, base: 'criacao', modo: 'ano', ano: '2025' })).toEqual(['a.jpg'])
    // o intervalo ignora o ano guardado de antes
    expect(r({ ...FILTRO_DATA_VAZIO, modo: 'intervalo', ano: '2025', de: '2026-01-01', ate: '2026-12-31' })).toEqual(['b.jpg'])
  })
  it('consulta os arquivos sem data', () => {
    expect(passaNaData(catalogo[3], { ...FILTRO_DATA_VAZIO, modo: 'sem-data' })).toBe(true)
    expect(passaNaData(catalogo[1], { ...FILTRO_DATA_VAZIO, modo: 'sem-data' })).toBe(false)
    expect(pesquisar(indice, { ...consulta, data: { ...FILTRO_DATA_VAZIO, base: 'criacao', modo: 'sem-data' } }).map((x) => x.name).sort()).toEqual(['a.jpg', 'c.jpg', 'evento 2023.jpg'])
  })
  it('conta os itens com data (para avisar quando o catálogo não tem datas)', () => {
    expect(indice.datados).toEqual({ criacao: 2, modificacao: 4 })
    expect(indexar([arq('x.jpg', 'X')]).datados).toEqual({ criacao: 0, modificacao: 0 })
  })
})

describe('Acervo: ordenação global', () => {
  const pasta = { ...consulta, pasta: 'LIDERAR' }
  const todos = (ordem: Parameters<typeof ordenar>[1]) =>
    nomes(pesquisar(indice, { ...pasta, texto: '', data: { ...FILTRO_DATA_VAZIO, modo: 'ano', ano: '' }, ordem }))
  it('nome A–Z e Z–A, com desempate estável pelo ID', () => {
    const az = todos('nome-asc')
    expect(az).toEqual(['FOTOS#P1', 'a.jpg#A', 'a.jpg#A2', 'b.jpg#B'])
    expect(todos('nome-desc')).toEqual(['FOTOS#P1', 'b.jpg#B', 'a.jpg#A2', 'a.jpg#A'])
  })
  it('por data, sem data vai para o fim nas duas direções; pasta usa a própria data', () => {
    const base = { ...consulta, data: FILTRO_DATA_VAZIO }
    expect(nomes(ordenar(indice.itens, 'mod-desc'))).toEqual([
      'FOTOS#P1', 'b.jpg#B', 'a.jpg#A', 'a.jpg#A2', 'c.jpg#C', 'evento 2023.jpg#D',
    ])
    expect(nomes(pesquisar(indice, { ...base, texto: 'jpg', ordem: 'mod-asc' }))).toEqual([
      'a.jpg#A', 'a.jpg#A2', 'b.jpg#B', 'c.jpg#C', 'evento 2023.jpg#D',
    ])
    expect(nomes(pesquisar(indice, { ...base, texto: 'jpg', ordem: 'cri-desc' })).slice(0, 2)).toEqual(['a.jpg#A', 'b.jpg#B'])
    expect(nomes(pesquisar(indice, { ...base, texto: 'jpg', ordem: 'cri-asc' })).slice(-3)).toEqual(['a.jpg#A2', 'c.jpg#C', 'evento 2023.jpg#D'])
  })
  it('ordena tudo antes de paginar (a primeira página é a mesma do conjunto inteiro ordenado)', () => {
    const muitos: ItemDrive[] = Array.from({ length: 150 }, (_, i) =>
      arq(`f${String(i).padStart(3, '0')}.jpg`, `I${i}`, { modifiedTime: new Date(Date.UTC(2020, 0, 1 + ((i * 37) % 150))).toISOString() }),
    )
    const r = pesquisar(indexar(muitos), { ...consulta, ordem: 'mod-desc' })
    const esperado = [...muitos].sort((a, b) => b.modifiedTime!.localeCompare(a.modifiedTime!))
    expect(r.slice(0, 60).map((x) => x.name)).toEqual(esperado.slice(0, 60).map((x) => x.name))
  })
})

/* ---------- Criativos ---------- */

const peca = (id: string, midia: PecaCriativo['midia'] = 'Foto'): PecaCriativo => ({ id, origem: 'arquivo', nome: `${id}.png`, midia, arquivoId: `arq-${id}` })
const dados: DadosCriativo = {
  nome: 'Carrossel do encontro',
  eventoId: 'ev1',
  atividadeId: '',
  responsavel: 'Carlos',
  formato: 'Carrossel',
  canva: 'https://www.canva.com/design/DAF/edit',
  drive: '',
  observacoes: '',
}
const base = () => novoCriativo('c1', dados, [peca('p1'), peca('p2'), peca('p3')], 'Sem identificação', '2026-10-30T12:00:00Z')

describe('Criativos: revisão e aprovação', () => {
  it('sem login ninguém envia nem decide', () => {
    const c = base()
    expect(podeEnviarCriativo(null, c)).toBe(false)
    expect(() => decidir(c, 'enviar', null)).toThrow()
  })
  it('Carlos envia, Kélvia aprova; status e rótulos acompanham', () => {
    let c = base()
    expect(statusDoCriativo(c)).toBe('Em produção')
    expect(rotuloEnvio(c)).toBe('Enviar para revisão')
    expect(() => decidir(c, 'enviar', 'Kélvia')).toThrow()
    c = decidir(c, 'enviar', 'Carlos', '', '2026-10-30T13:00:00Z')
    expect(statusDoCriativo(c)).toBe('Em revisão')
    expect(podeDecidirCriativo('Carlos', c)).toBe(false)
    c = decidir(c, 'aprovar', 'Kélvia', '', '2026-10-30T14:00:00Z')
    expect(statusDoCriativo(c)).toBe('Aprovado')
    expect(c.decisoes.at(-1)).toEqual({ versao: 1, autor: 'Kélvia', quando: '2026-10-30T14:00:00Z', decisao: 'Aprovado', comentario: '' })
  })
  it('solicitar ajustes exige comentário; depois vem "Reenviar para revisão"', () => {
    let c = decidir(base(), 'enviar', 'Carlos')
    expect(() => decidir(c, 'ajustes', 'Kélvia', '  ')).toThrow(/precisa mudar/)
    c = decidir(c, 'ajustes', 'Kélvia', 'Trocar a foto da capa')
    expect(statusDoCriativo(c)).toBe('Ajustes solicitados')
    expect(rotuloEnvio(c)).toBe('Reenviar para revisão')
    expect(c.decisoes.at(-1)?.comentario).toBe('Trocar a foto da capa')
  })
  it('não envia sem material', () => {
    const c = novoCriativo('c2', dados, [], 'Sem identificação')
    expect(() => decidir(c, 'enviar', 'Carlos')).toThrow(/Anexe/)
  })
})

describe('Criativos: versões', () => {
  const aprovado = () => decidir(decidir(base(), 'enviar', 'Carlos'), 'aprovar', 'Kélvia')
  it('trocar o material aprovado cria nova versão, preserva a anterior e exige nova revisão', () => {
    const { criativo, novaVersao } = editar(aprovado(), dados, [peca('p1'), peca('p4')], 'Sem identificação')
    expect(novaVersao).toBe(true)
    expect(criativo.versoes.map((v) => v.numero)).toEqual([1, 2])
    expect(criativo.versoes[0].pecas.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
    expect(criativo.decisoes.filter((d) => d.versao === 1).at(-1)?.decisao).toBe('Aprovado')
    expect(statusDoCriativo(criativo)).toBe('Em produção')
    expect(rotuloEnvio(criativo)).toBe('Reenviar para revisão')
  })
  it('reordenar peças também é troca de material', () => {
    expect(editar(aprovado(), dados, [peca('p2'), peca('p1'), peca('p3')], 'Sem identificação').novaVersao).toBe(true)
  })
  it('alterar responsável, evento ou vínculo não invalida a aprovação', () => {
    const c = aprovado()
    const { criativo, novaVersao } = editar(c, { ...dados, responsavel: 'Jordana', eventoId: 'ev2', atividadeId: 'demo-1', canva: '' }, versaoAtual(c).pecas, 'Sem identificação')
    expect(novaVersao).toBe(false)
    expect(statusDoCriativo(criativo)).toBe('Aprovado')
    expect(criativo.historico.at(-1)?.texto).toMatch(/evento\/campanha, atividade vinculada, responsável, link do Canva/)
  })
  it('antes da primeira revisão o material é ajustado na própria versão', () => {
    const { criativo, novaVersao } = editar(base(), dados, [peca('p9')], 'Sem identificação')
    expect(novaVersao).toBe(false)
    expect(criativo.versoes).toHaveLength(1)
    expect(versaoAtual(criativo).pecas[0].id).toBe('p9')
  })
})

describe('Criativos: links', () => {
  it('diferencia Canva, arquivo do Drive e pasta do Drive', () => {
    expect(classificarLink('https://www.canva.com/design/DAF123/edit')).toBe('canva')
    expect(classificarLink('https://drive.google.com/file/d/1abc/view?usp=sharing')).toBe('drive-arquivo')
    expect(classificarLink('https://drive.google.com/open?id=1abc')).toBe('drive-arquivo')
    expect(classificarLink('https://drive.google.com/drive/folders/1xyz')).toBe('drive-pasta')
    expect(classificarLink('https://exemplo.com/a.png')).toBe('outro')
    expect(classificarLink('não é link')).toBe('invalido')
    expect(classificarLink('')).toBe('vazio')
  })
})

describe('Criativos: atividade vinculada (referência compartilhada)', () => {
  const atividade: Atividade = {
    id: 'demo-1', empresaId: 'centro-liderar', titulo: 'Roteiro', status: 'Aprovado', formato: 'Reels', responsavel: 'Carlos',
    dataPostagem: '', horaPostagem: '', versao: 1, material: null, historico: [], demonstrativa: true,
  }
  it('a atividade mostra o status e a versão do criativo e não decide sozinha', () => {
    const c = decidir({ ...base(), atividadeId: 'demo-1' }, 'enviar', 'Carlos')
    const a = comCriativo(atividade, [c])
    expect(a).toMatchObject({ status: 'Aguardando aprovação', versao: 1, criativoId: 'c1' })
    expect(podeDecidir('Kélvia', a)).toBe(false)
    expect(podeEnviar('Carlos', { ...a, status: 'Em produção' })).toBe(false)
    expect(comCriativo(atividade, [])).toBe(atividade)
  })
})

describe('Criativos: filtros e grupos', () => {
  const eventos: EventoCampanha[] = [
    { id: 'ev1', empresaId: 'centro-liderar', nome: 'Encontro Diamante', tipo: 'Evento', data: '', observacoes: '', criadoEm: '' },
    { id: 'ev2', empresaId: 'centro-liderar', nome: 'Black Friday', tipo: 'Campanha', data: '', observacoes: '', criadoEm: '' },
  ]
  const lista: Criativo[] = [
    base(),
    { ...novoCriativo('c2', { ...dados, nome: 'Reels convite', eventoId: '', formato: 'Reels', responsavel: 'Jordana' }, [], 'Sem identificação', '2026-09-01T12:00:00Z') },
    { ...novoCriativo('c3', { ...dados, nome: 'Story BF', eventoId: 'apagado' }, [], 'Sem identificação', '2026-10-01T12:00:00Z') },
  ]
  it('agrupa por evento e junta os sem evento (ou com evento inexistente)', () => {
    const g = agruparPorEvento(lista, eventos)
    expect(g.map((x) => [x.evento?.nome ?? 'Sem evento vinculado', x.criativos.length])).toEqual([
      ['Black Friday', 0], ['Encontro Diamante', 1], ['Sem evento vinculado', 2],
    ])
  })
  it('filtra por busca, evento, formato, responsável, status e data', () => {
    const f = (m: Partial<typeof FILTROS_CRIATIVOS_VAZIOS>) => filtrarCriativos(lista, { ...FILTROS_CRIATIVOS_VAZIOS, ...m }, eventos).map((c) => c.id)
    expect(f({ texto: 'diamante' })).toEqual(['c1'])
    expect(f({ eventoId: '-' })).toEqual(['c2', 'c3'])
    expect(f({ formato: 'Reels' })).toEqual(['c2'])
    expect(f({ responsavel: 'Jordana' })).toEqual(['c2'])
    expect(f({ status: 'Em revisão' })).toEqual([])
    expect(f({ de: '2026-10-01', ate: '2026-10-31' })).toEqual(['c1', 'c3'])
  })
})

describe('Criativos: armazenamento', () => {
  const memoria = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m } as unknown as Storage & { m: Map<string, string> }
  }
  it('salva e recarrega cadastros sem arquivos binários', () => {
    const s = memoria()
    salvarCriativos({ eventos: [], criativos: [base()] }, () => s)
    const bruto = s.getItem(CHAVE_CRIATIVOS)!
    expect(bruto).not.toMatch(/data:|base64/)
    expect(carregarCriativos(() => s).criativos[0].versoes[0].pecas).toHaveLength(3)
  })
  it('dados ilegíveis bloqueiam a gravação para não sobrescrever', () => {
    const s = memoria()
    s.setItem(CHAVE_CRIATIVOS, '{quebrado')
    expect(carregarCriativos(() => s).gravacaoBloqueada).toBe(true)
  })
})
