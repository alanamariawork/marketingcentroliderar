/**
 * Regras de cálculo, filtros e validações de Insights e do Dashboard.
 * Reproduzem o HTML de referência; os pontos em que diferem estão marcados
 * com "Diferença documentada" e descritos em docs/IMPLEMENTACAO.md.
 */
import { CAMPOS_METRICAS, ETAPAS_FUNIL, type EtapaFunil } from '../data/constants'
import type { ChaveMetrica, Metricas, RegistroInsight, RegraScore } from '../data/types'

/* ---------- Score ---------- */

/**
 * Liderar: reproduções + compartilhamentos + (novos seguidores ÷ 3).
 * MQA:     reproduções + compartilhamentos + novos seguidores.
 * Só calcula quando a regra é conhecida e os três campos estão informados.
 */
export function calcularScore(x: Metricas & { rule: RegraScore }): number | null {
  if (x.rule !== 'liderar' && x.rule !== 'mqa') return null
  const { plays, shares, follows } = x
  if (plays == null || shares == null || follows == null) return null
  return plays + shares + follows / (x.rule === 'liderar' ? 3 : 1)
}

export function nomeRegra(rule: RegraScore): string {
  return rule === 'liderar' ? 'Regra Liderar' : rule === 'mqa' ? 'Regra MQA' : 'Sem regra definida'
}

export const FORMULAS: Record<'liderar' | 'mqa', string> = {
  liderar: 'Reproduções + compartilhamentos + (seguimentos ÷ 3)',
  mqa: 'Reproduções + compartilhamentos + seguimentos',
}

/* ---------- Agregação (campos ausentes não entram como zero) ---------- */

export function informados(rows: RegistroInsight[], k: ChaveMetrica): number[] {
  return rows.map((x) => x[k]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

/** Soma (ou média simples) só dos valores informados; `null` quando nenhum foi informado. */
export function agregar(rows: RegistroInsight[], k: ChaveMetrica, media = false): number | null {
  const a = informados(rows, k)
  if (!a.length) return null
  const soma = a.reduce((s, v) => s + v, 0)
  return media ? soma / a.length : soma
}

/* ---------- Links e collabs ---------- */

/** Link canônico: domínio + caminho, sem parâmetros e sem barra final. */
export function linkCanonico(u: string): string {
  try {
    const v = new URL(u)
    return v.hostname + v.pathname.replace(/\/$/, '')
  } catch {
    return ''
  }
}

/**
 * Consolidado sem repetição de collabs: o mesmo post (link canônico) conta uma
 * vez, usando o primeiro registro na ordem dos dados (importados primeiro).
 */
export function deduplicarCollabs(rows: RegistroInsight[]): RegistroInsight[] {
  const vistos = new Set<string>()
  return rows.filter((x) => {
    const k = linkCanonico(x.link) || x.id
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
}

/* ---------- Funil ---------- */

const semAcento = (v: string) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()

/**
 * Etapa do funil para comparação. Diferença documentada: as abas da Jaciara
 * usam "NUTRICAO"/"OBJECAO" sem acento; aqui elas contam como NUTRIÇÃO/OBJEÇÃO
 * nos filtros e na distribuição. O valor gravado não é alterado.
 */
export function etapaFunil(v: string): EtapaFunil | '' {
  const n = semAcento(v)
  return ETAPAS_FUNIL.find((e) => semAcento(e) === n) ?? ''
}

/* ---------- Filtros ---------- */

export interface FiltrosInsight {
  account: string
  from: string
  to: string
  format: string
  funnel: string
  category: string
}

export const FILTROS_VAZIOS: FiltrosInsight = { account: '', from: '', to: '', format: '', funnel: '', category: '' }

export function filtrarInsights(rows: RegistroInsight[], company: string, f: FiltrosInsight): RegistroInsight[] {
  return rows.filter(
    (x) =>
      x.company === company &&
      (!f.account || x.account === f.account) &&
      (!f.from || x.date >= f.from) &&
      (!f.to || x.date <= f.to) &&
      (!f.format || x.format === f.format) &&
      (!f.funnel || etapaFunil(x.funnel) === f.funnel) &&
      (!f.category || x.category === f.category),
  )
}

export function temResultados(x: RegistroInsight): boolean {
  return CAMPOS_METRICAS.some(([k]) => x[k] != null)
}

/* ---------- Importação sem apagar dados salvos ---------- */

/**
 * Acrescenta os registros importados que ainda não existem nos dados salvos
 * (mesmo id, ou mesmo post na mesma conta). Nada salvo é sobrescrito.
 */
export function mesclarImportados(salvos: RegistroInsight[], importados: RegistroInsight[]): RegistroInsight[] {
  const resultado = [...salvos]
  for (const row of importados) {
    const existe = resultado.some(
      (x) =>
        x.id === row.id ||
        (x.company === row.company &&
          x.account === row.account &&
          !!row.link &&
          linkCanonico(x.link) === linkCanonico(row.link)),
    )
    if (!existe) resultado.push(row)
  }
  return resultado
}

/* ---------- Validação do formulário ---------- */

export interface DadosFormularioInsight {
  account: string
  date: string
  type: string
  funnel: string
  format: string
  category: string
  description: string
  link: string
  collected: string
  rule: RegraScore
  notes: string
  metricas: Metricas
}

/** Mensagens de erro por campo; objeto vazio quando está tudo certo. */
export function validarInsight(
  d: DadosFormularioInsight,
  ctx: { hoje: string; company: string; id?: string; existentes: RegistroInsight[] },
): Record<string, string> {
  const e: Record<string, string> = {}
  const obrig: [keyof DadosFormularioInsight, string][] = [
    ['account', 'Informe a conta ou perfil.'],
    ['date', 'Informe a data da publicação.'],
    ['type', 'Selecione o tipo.'],
    ['funnel', 'Selecione a etapa do funil.'],
    ['format', 'Selecione o formato.'],
    ['category', 'Informe a categoria.'],
    ['description', 'Descreva o conteúdo.'],
  ]
  for (const [k, msg] of obrig) if (!String(d[k]).trim()) e[k] = msg
  if (d.date && d.date > ctx.hoje) e.date = 'A data da publicação não pode ser futura.'
  if (d.collected && d.collected > ctx.hoje) e.collected = 'A data da coleta não pode ser futura.'

  for (const [k, , unidade] of CAMPOS_METRICAS) {
    const v = d.metricas[k]
    if (v == null) continue
    if (!Number.isFinite(v) || v < 0) e[k] = 'Use um número maior ou igual a zero.'
    else if (unidade === 'pct' && v > 100) e[k] = 'O percentual vai de 0 a 100.'
    else if (unidade === 'int' && !Number.isInteger(v)) e[k] = 'Use um número inteiro.'
  }

  const link = d.link.trim()
  if (link && !/^https?:\/\//i.test(link)) e.link = 'Use um link http:// ou https://.'

  const { nonfollowers: nf, followers: fo } = d.metricas
  if (nf != null && fo != null && Math.abs(nf + fo - 100) > 0.2 && !e.nonfollowers && !e.followers) {
    e.followers =
      'Os percentuais de seguidores e não seguidores devem somar 100% (tolerância de 0,2 ponto por arredondamento).'
  }
  if (CAMPOS_METRICAS.some(([k]) => d.metricas[k] != null) && !d.collected && !e.collected) {
    e.collected = 'Informe a data de coleta das métricas.'
  }
  if (d.collected && d.date && d.collected < d.date && !e.collected) {
    e.collected = 'A coleta não pode ser anterior à publicação.'
  }
  if (
    link &&
    !e.link &&
    ctx.existentes.some(
      (v) =>
        v.company === ctx.company &&
        v.account === d.account.trim() &&
        v.id !== ctx.id &&
        linkCanonico(v.link) === linkCanonico(link),
    )
  ) {
    e.link =
      'Este post já está cadastrado nesta conta. Edite o registro existente; contas participantes de uma collab têm registros próprios.'
  }
  return e
}

/* ---------- Contas ---------- */

/**
 * Contas de uma empresa para filtros e formulários: as frentes do Centro
 * Liderar (identificadores da referência), as contas adicionadas na sessão e
 * as que já aparecem nos registros.
 */
export function contasDaEmpresa(
  company: string,
  registros: RegistroInsight[],
  catalogo: string[],
  adicionadas: string[] = [],
): string[] {
  return [...new Set([...catalogo, ...adicionadas, ...registros.filter((x) => x.company === company).map((x) => x.account)])]
}
