/**
 * Indicadores do dashboard, calculados somente a partir dos registros locais.
 * `null` significa "sem dado registrado" e nunca é tratado como zero.
 */
import { CHAVES_INTERACAO } from '../data/constants'
import type { Atividade, Conta, Conteudo } from '../data/types'
import { dentroDoIntervalo, diasEntre, formatarData, inicioDaSemana, inicioDoMes, somarDias, somarMeses } from './dates'

export type Metrica = 'publicados' | 'alcance' | 'interacoes'

export const METRICAS: { id: Metrica; nome: string }[] = [
  { id: 'publicados', nome: 'Conteúdos publicados' },
  { id: 'alcance', nome: 'Alcance' },
  { id: 'interacoes', nome: 'Interações' },
]

type Intervalo = { inicio: string; fim: string } | null

export function interacoesDe(c: Conteudo): number | null {
  if (!c.metricas) return null
  const valores = CHAVES_INTERACAO.map((k) => c.metricas![k]).filter((v): v is number => v !== null)
  return valores.length ? valores.reduce((a, b) => a + b, 0) : null
}

export function valorDe(c: Conteudo, metrica: Metrica): number | null {
  if (metrica === 'publicados') return 1
  if (metrica === 'alcance') return c.metricas?.alcance ?? null
  return interacoesDe(c)
}

/** Soma ignorando ausentes; se todos forem ausentes, o resultado é `null`. */
export function somar(valores: (number | null)[]): number | null {
  const presentes = valores.filter((v): v is number => v !== null)
  return presentes.length ? presentes.reduce((a, b) => a + b, 0) : null
}

export function filtrarPublicados(conteudos: Conteudo[], intervalo: Intervalo, contaId: string | null) {
  return conteudos.filter(
    (c) => c.status === 'Publicado' && dentroDoIntervalo(c.data, intervalo) && (!contaId || c.contaId === contaId),
  )
}

export function calcularIndicadores(publicados: Conteudo[], atividades: Atividade[], dataHoje: string) {
  const pendentes = atividades.filter((a) => a.status !== 'Concluído')
  return {
    publicados: publicados.length,
    comAlcance: publicados.filter((c) => c.metricas?.alcance != null).length,
    comInteracoes: publicados.filter((c) => interacoesDe(c) !== null).length,
    alcance: somar(publicados.map((c) => valorDe(c, 'alcance'))),
    interacoes: somar(publicados.map((c) => valorDe(c, 'interacoes'))),
    pendentes: pendentes.length,
    atrasadas: pendentes.filter((a) => a.prazo && a.prazo < dataHoje).length,
  }
}

export interface Ponto {
  chave: string
  rotulo: string
  detalhe: string
  valor: number | null
}

/** Agrupa por dia (até 31 dias), semana (até ~4 meses) ou mês. */
export function serieEvolucao(publicados: Conteudo[], intervalo: Intervalo, metrica: Metrica): Ponto[] {
  let faixa = intervalo
  if (!faixa) {
    if (publicados.length === 0) return []
    const datas = publicados.map((c) => c.data).sort()
    faixa = { inicio: datas[0], fim: datas[datas.length - 1] }
  }
  const dias = diasEntre(faixa.inicio, faixa.fim) + 1
  const escala = dias <= 31 ? 'dia' : dias <= 120 ? 'semana' : 'mes'
  const chaveDe = (d: string) => (escala === 'dia' ? d : escala === 'semana' ? inicioDaSemana(d) : inicioDoMes(d))

  const pontos: Ponto[] = []
  let cursor = chaveDe(faixa.inicio)
  while (cursor <= faixa.fim) {
    const fimBalde = escala === 'dia' ? cursor : escala === 'semana' ? somarDias(cursor, 6) : somarDias(somarMeses(cursor, 1), -1)
    const doBalde = publicados.filter((c) => chaveDe(c.data) === cursor)
    pontos.push({
      chave: cursor,
      rotulo:
        escala === 'mes'
          ? new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
              .format(new Date(cursor + 'T00:00:00Z'))
              .replace('. de ', '/')
              .replace(' de ', '/')
          : formatarData(cursor).slice(0, 5),
      detalhe:
        escala === 'dia'
          ? formatarData(cursor)
          : `${formatarData(cursor > faixa.inicio ? cursor : faixa.inicio)} a ${formatarData(fimBalde < faixa.fim ? fimBalde : faixa.fim)}`,
      valor: metrica === 'publicados' ? doBalde.length : somar(doBalde.map((c) => valorDe(c, metrica))),
    })
    cursor = escala === 'dia' ? somarDias(cursor, 1) : escala === 'semana' ? somarDias(cursor, 7) : somarMeses(cursor, 1)
  }
  return pontos
}

export function comparacaoContas(publicados: Conteudo[], contas: Conta[], metrica: Metrica): Ponto[] {
  return contas
    .map((conta) => {
      const daConta = publicados.filter((c) => c.contaId === conta.id)
      return {
        chave: conta.id,
        rotulo: conta.nome,
        detalhe: conta.plataforma,
        valor: metrica === 'publicados' ? daConta.length : somar(daConta.map((c) => valorDe(c, metrica))),
      }
    })
    .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1))
}
