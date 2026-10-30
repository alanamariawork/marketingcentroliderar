/**
 * Criativos: status, versões, decisões, links e filtros. Regras puras.
 *
 * O fluxo segue o das atividades: Carlos envia para revisão; somente Kélvia
 * aprova ou solicita ajustes. Sem usuário autenticado (`null`), nenhuma ação é
 * permitida. A aprovação vale para uma versão: trocar o material de uma versão
 * já enviada cria uma versão nova (a anterior e a decisão dela ficam
 * preservadas) e exige nova revisão.
 */
import type {
  Atividade,
  Criativo,
  DecisaoCriativo,
  EventoCampanha,
  FormatoPostagem,
  PecaCriativo,
  Perfil,
  Responsavel,
  StatusAtividade,
  StatusCriativo,
  VersaoCriativo,
} from '../data/types'
import { diaDoCarimbo } from './dates'
import { idDoArquivo, normalizar } from './drive'

export const STATUS_CRIATIVO: StatusCriativo[] = ['Em produção', 'Em revisão', 'Ajustes solicitados', 'Aprovado']

export function versaoAtual(c: Pick<Criativo, 'versoes'>): VersaoCriativo {
  return c.versoes[c.versoes.length - 1]
}

const decisoesDa = (c: Pick<Criativo, 'decisoes'>, versao: number) => c.decisoes.filter((d) => d.versao === versao)

/** Status da versão atual, derivado das decisões registradas para ela. */
export function statusDoCriativo(c: Pick<Criativo, 'versoes' | 'decisoes'>): StatusCriativo {
  const ultima = decisoesDa(c, versaoAtual(c).numero).at(-1)
  if (!ultima) return 'Em produção'
  if (ultima.decisao === 'Enviado para revisão') return 'Em revisão'
  return ultima.decisao
}

/** A versão atual já passou por revisão (foi enviada ou decidida). */
export const versaoAtualRevisada = (c: Pick<Criativo, 'versoes' | 'decisoes'>) =>
  decisoesDa(c, versaoAtual(c).numero).length > 0

/** "Reenviar" quando já houve algum envio antes (nesta ou em outra versão). */
export const rotuloEnvio = (c: Pick<Criativo, 'decisoes'>) =>
  c.decisoes.some((d) => d.decisao === 'Enviado para revisão') ? 'Reenviar para revisão' : 'Enviar para revisão'

export function podeEnviarCriativo(usuario: Perfil | null, c: Pick<Criativo, 'versoes' | 'decisoes'>): boolean {
  const s = statusDoCriativo(c)
  return usuario === 'Carlos' && (s === 'Em produção' || s === 'Ajustes solicitados') && versaoAtual(c).pecas.length > 0
}

export function podeDecidirCriativo(usuario: Perfil | null, c: Pick<Criativo, 'versoes' | 'decisoes'>): boolean {
  return usuario === 'Kélvia' && statusDoCriativo(c) === 'Em revisão'
}

export type AcaoCriativo = 'enviar' | 'aprovar' | 'ajustes'

/** Registra a decisão para a versão atual. Lança erro se a pessoa não puder executá-la. */
export function decidir(
  c: Criativo,
  acao: AcaoCriativo,
  usuario: Perfil | null,
  comentario = '',
  quando: string = new Date().toISOString(),
): Criativo {
  let decisao: DecisaoCriativo
  if (acao === 'enviar') {
    if (!podeEnviarCriativo(usuario, c)) {
      if (!versaoAtual(c).pecas.length) throw new Error('Anexe ao menos uma imagem ou um vídeo antes de enviar para revisão.')
      throw new Error('Somente Carlos envia criativos para revisão.')
    }
    decisao = 'Enviado para revisão'
  } else {
    if (!podeDecidirCriativo(usuario, c)) throw new Error('Somente Kélvia aprova ou solicita ajustes, e só em criativos em revisão.')
    if (acao === 'ajustes' && !comentario.trim()) throw new Error('Explique o que precisa mudar para solicitar ajustes.')
    decisao = acao === 'aprovar' ? 'Aprovado' : 'Ajustes solicitados'
  }
  return {
    ...c,
    decisoes: [...c.decisoes, { versao: versaoAtual(c).numero, autor: usuario!, quando, decisao, comentario: comentario.trim() }],
    atualizadoEm: quando,
  }
}

/** Mesmo material: as mesmas peças, na mesma ordem. */
export function mesmasPecas(a: PecaCriativo[], b: PecaCriativo[]): boolean {
  return a.length === b.length && a.every((p, i) => p.id === b[i].id)
}

export type DadosCriativo = Pick<
  Criativo,
  'nome' | 'eventoId' | 'atividadeId' | 'responsavel' | 'formato' | 'canva' | 'drive' | 'observacoes'
>

const ROTULOS_CAMPOS: Record<keyof DadosCriativo, string> = {
  nome: 'nome',
  eventoId: 'evento/campanha',
  atividadeId: 'atividade vinculada',
  responsavel: 'responsável',
  formato: 'formato',
  canva: 'link do Canva',
  drive: 'link do Drive',
  observacoes: 'observações',
}

/**
 * Aplica uma edição. Dados de cadastro não mudam a versão nem a aprovação.
 * Trocar as peças de uma versão que já foi enviada ou decidida cria a versão
 * seguinte; numa versão que ainda não foi revisada, as peças são trocadas nela.
 */
export function editar(
  c: Criativo,
  dados: DadosCriativo,
  pecas: PecaCriativo[],
  autor: Perfil | 'Sem identificação',
  quando: string = new Date().toISOString(),
): { criativo: Criativo; novaVersao: boolean } {
  const atual = versaoAtual(c)
  const mudouMaterial = !mesmasPecas(atual.pecas, pecas)
  const novaVersao = mudouMaterial && versaoAtualRevisada(c)
  const versoes = !mudouMaterial
    ? c.versoes
    : novaVersao
      ? [...c.versoes, { numero: atual.numero + 1, criadaEm: quando, autor, pecas }]
      : [...c.versoes.slice(0, -1), { ...atual, pecas }]
  const campos = (Object.keys(ROTULOS_CAMPOS) as (keyof DadosCriativo)[]).filter((k) => c[k] !== dados[k])
  const textos = [
    campos.length ? `Cadastro alterado: ${campos.map((k) => ROTULOS_CAMPOS[k]).join(', ')}.` : '',
    novaVersao ? `Material substituído: criada a versão ${atual.numero + 1}. A versão ${atual.numero} e a decisão dela ficam preservadas.` : '',
    mudouMaterial && !novaVersao ? `Material da versão ${atual.numero} atualizado antes da revisão.` : '',
  ].filter(Boolean)
  return {
    criativo: {
      ...c,
      ...dados,
      versoes,
      historico: [...c.historico, ...textos.map((texto) => ({ quando, autor, texto }))],
      atualizadoEm: textos.length ? quando : c.atualizadoEm,
    },
    novaVersao,
  }
}

export function novoCriativo(
  id: string,
  dados: DadosCriativo,
  pecas: PecaCriativo[],
  autor: Perfil | 'Sem identificação',
  quando: string = new Date().toISOString(),
): Criativo {
  return {
    id,
    empresaId: 'centro-liderar',
    ...dados,
    versoes: [{ numero: 1, criadaEm: quando, autor, pecas }],
    decisoes: [],
    historico: [{ quando, autor, texto: 'Criativo cadastrado.' }],
    criadoEm: quando,
    atualizadoEm: quando,
  }
}

/* ---------- Links ---------- */

export type TipoLink = 'vazio' | 'invalido' | 'canva' | 'drive-arquivo' | 'drive-pasta' | 'outro'

export function classificarLink(valor: string): TipoLink {
  const v = valor.trim()
  if (!v) return 'vazio'
  let u: URL
  try {
    u = new URL(v)
  } catch {
    return 'invalido'
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'invalido'
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'canva.com' || host.endsWith('.canva.com') || host === 'canva.link') return 'canva'
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    if (u.pathname.includes('/folders/')) return 'drive-pasta'
    if (idDoArquivo(v)) return 'drive-arquivo'
  }
  return 'outro'
}

/* ---------- Atividade vinculada (referência compartilhada) ---------- */

const STATUS_NA_ATIVIDADE: Record<StatusCriativo, StatusAtividade> = {
  'Em produção': 'Em produção',
  'Em revisão': 'Aguardando aprovação',
  'Ajustes solicitados': 'Ajustes solicitados',
  Aprovado: 'Aprovado',
}

/** A atividade vinculada mostra o status e a versão do criativo: uma só decisão para as duas telas. */
export function comCriativo(a: Atividade, criativos: Criativo[]): Atividade {
  const c = criativos.find((x) => x.atividadeId === a.id)
  if (!c) return a
  return { ...a, status: STATUS_NA_ATIVIDADE[statusDoCriativo(c)], versao: versaoAtual(c).numero, criativoId: c.id }
}

/* ---------- Filtros e grupos ---------- */

export interface FiltrosCriativos {
  texto: string
  /** '' = todos; '-' = sem evento vinculado. */
  eventoId: string
  formato: FormatoPostagem | ''
  responsavel: Responsavel | ''
  status: StatusCriativo | ''
  /** Data da última atualização no sistema (AAAA-MM-DD). */
  de: string
  ate: string
}

export const FILTROS_CRIATIVOS_VAZIOS: FiltrosCriativos = {
  texto: '',
  eventoId: '',
  formato: '',
  responsavel: '',
  status: '',
  de: '',
  ate: '',
}

export function filtrarCriativos(lista: Criativo[], f: FiltrosCriativos, eventos: EventoCampanha[]): Criativo[] {
  const termos = normalizar(f.texto).split(/\s+/).filter(Boolean)
  const nomeEvento = new Map(eventos.map((e) => [e.id, e.nome]))
  return lista.filter((c) => {
    const dia = diaDoCarimbo(c.atualizadoEm)
    const texto = normalizar([c.nome, nomeEvento.get(c.eventoId) ?? '', c.observacoes, c.formato, c.responsavel].join(' '))
    return (
      termos.every((t) => texto.includes(t)) &&
      (!f.eventoId || (f.eventoId === '-' ? !c.eventoId || !nomeEvento.has(c.eventoId) : c.eventoId === f.eventoId)) &&
      (!f.formato || c.formato === f.formato) &&
      (!f.responsavel || c.responsavel === f.responsavel) &&
      (!f.status || statusDoCriativo(c) === f.status) &&
      (!f.de || dia >= f.de) &&
      (!f.ate || dia <= f.ate)
    )
  })
}

export const filtrosAtivos = (f: FiltrosCriativos) =>
  (Object.keys(f) as (keyof FiltrosCriativos)[]).some((k) => f[k] !== FILTROS_CRIATIVOS_VAZIOS[k])

export interface GrupoCriativos {
  /** '' = Sem evento vinculado. */
  id: string
  evento: EventoCampanha | null
  criativos: Criativo[]
}

/** Um grupo por evento/campanha (com os criativos filtrados) e, por último, "Sem evento vinculado". */
export function agruparPorEvento(criativos: Criativo[], eventos: EventoCampanha[]): GrupoCriativos[] {
  const ids = new Set(eventos.map((e) => e.id))
  const ordenados = [...eventos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
  return [
    ...ordenados.map((e) => ({ id: e.id, evento: e, criativos: criativos.filter((c) => c.eventoId === e.id) })),
    { id: '', evento: null, criativos: criativos.filter((c) => !c.eventoId || !ids.has(c.eventoId)) },
  ]
}

/** Criativos mais recentes primeiro (desempate por nome e ID). */
export function ordenarCriativos(lista: Criativo[]): Criativo[] {
  return [...lista].sort(
    (a, b) =>
      b.atualizadoEm.localeCompare(a.atualizadoEm) ||
      a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }) ||
      (a.id < b.id ? -1 : 1),
  )
}
