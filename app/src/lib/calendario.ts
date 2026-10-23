/**
 * Regras do Cronograma: períodos das seis visualizações, navegação e
 * agrupamento das atividades por data. Mesma lógica do HTML de referência,
 * sempre com datas "AAAA-MM-DD" do fuso America/Fortaleza.
 */
import type { Atividade } from '../data/types'
import { fimDoMes, formatarData, formatarDataExtensa, formatarMesAno, inicioDaSemana, somarDias, somarMeses } from './dates'

export const VISUALIZACOES = ['Diária', 'Semanal', 'Mensal', 'Trimestral', 'Semestral', 'Anual'] as const
export type Visualizacao = (typeof VISUALIZACOES)[number]

const MESES_POR_VISUALIZACAO: Partial<Record<Visualizacao, number>> = {
  Mensal: 1,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
}

export interface Periodo {
  inicio: string
  fim: string
  titulo: string
  /** Dias exibidos lado a lado (Diária e Semanal). */
  dias: string[]
  /** Primeiro dia de cada mês exibido (Mensal a Anual). */
  meses: string[]
}

export function periodoDe(vis: Visualizacao, ancora: string): Periodo {
  if (vis === 'Diária') {
    return { inicio: ancora, fim: ancora, titulo: formatarDataExtensa(ancora), dias: [ancora], meses: [] }
  }
  if (vis === 'Semanal') {
    const inicio = inicioDaSemana(ancora)
    const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i))
    return { inicio, fim: dias[6], titulo: `${formatarData(inicio)} — ${formatarData(dias[6])}`, dias, meses: [] }
  }
  const n = MESES_POR_VISUALIZACAO[vis]!
  const ano = Number(ancora.slice(0, 4))
  const mes = Number(ancora.slice(5, 7)) - 1
  const base = Math.floor(mes / n) * n
  const inicio = `${ano}-${String(base + 1).padStart(2, '0')}-01`
  const meses = Array.from({ length: n }, (_, i) => somarMeses(inicio, i))
  const fim = fimDoMes(meses[n - 1])
  const titulo =
    n === 1
      ? formatarMesAno(inicio)
      : n === 12
        ? String(ano)
        : n === 3
          ? `${Math.floor(mes / 3) + 1}º trimestre de ${ano}`
          : `${Math.floor(mes / 6) + 1}º semestre de ${ano}`
  return { inicio, fim, titulo, dias: [], meses }
}

/** Avança (n > 0) ou volta (n < 0) um período inteiro. */
export function navegar(vis: Visualizacao, ancora: string, n: number): string {
  if (vis === 'Diária') return somarDias(ancora, n)
  if (vis === 'Semanal') return somarDias(ancora, 7 * n)
  return somarMeses(ancora, MESES_POR_VISUALIZACAO[vis]! * n)
}

/** Atividades de um dia, ordenadas pelo horário (sem horário vai para o fim). */
export function atividadesDoDia(atividades: Atividade[], dia: string): Atividade[] {
  return atividades
    .filter((a) => a.dataPostagem === dia)
    .sort((a, b) => (a.horaPostagem || '99').localeCompare(b.horaPostagem || '99'))
}

export function rotuloAgendamento(a: Pick<Atividade, 'dataPostagem' | 'horaPostagem'>): string {
  if (!a.dataPostagem) return 'Sem data definida'
  return formatarData(a.dataPostagem) + (a.horaPostagem ? ` às ${a.horaPostagem}` : ' · horário a definir')
}
