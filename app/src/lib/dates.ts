/**
 * Datas de calendário são guardadas como texto "AAAA-MM-DD" e horários como
 * "HH:mm", sempre no fuso America/Fortaleza. As contas de dias usam Date em
 * UTC puro, para que nenhum fuso do navegador desloque o dia exibido.
 */

export const FUSO = 'America/Fortaleza'

const pad = (n: number) => String(n).padStart(2, '0')

export function ehDataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const d = paraUTC(valor)
  return deUTC(d) === valor
}

export function ehHorarioValido(valor: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
}

function paraUTC(data: string): Date {
  const [a, m, d] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

function deUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Data de hoje em America/Fortaleza. */
export function hoje(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora)
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? ''
  return `${v('year')}-${v('month')}-${v('day')}`
}

export function somarDias(data: string, dias: number): string {
  const d = paraUTC(data)
  d.setUTCDate(d.getUTCDate() + dias)
  return deUTC(d)
}

/** Primeiro dia do mês deslocado em `meses`. */
export function somarMeses(data: string, meses: number): string {
  const d = paraUTC(data)
  return deUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1)))
}

export function inicioDoMes(data: string): string {
  return data.slice(0, 8) + '01'
}

export function fimDoMes(data: string): string {
  return somarDias(somarMeses(data, 1), -1)
}

/** Dia da semana (0 = domingo). */
export function diaDaSemana(data: string): number {
  return paraUTC(data).getUTCDay()
}

/** Semana de domingo a sábado. */
export function inicioDaSemana(data: string): string {
  return somarDias(data, -diaDaSemana(data))
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round((paraUTC(fim).getTime() - paraUTC(inicio).getTime()) / 86_400_000)
}

/** Dias exibidos na grade mensal (semanas completas, domingo a sábado). */
export function gradeDoMes(data: string): string[] {
  const primeiro = inicioDaSemana(inicioDoMes(data))
  const ultimo = somarDias(inicioDaSemana(fimDoMes(data)), 6)
  const total = diasEntre(primeiro, ultimo) + 1
  return Array.from({ length: total }, (_, i) => somarDias(primeiro, i))
}

export function diasDaSemana(data: string): string[] {
  const primeiro = inicioDaSemana(data)
  return Array.from({ length: 7 }, (_, i) => somarDias(primeiro, i))
}

const fmt = (opcoes: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opcoes })

/** 14/10/2026 */
export function formatarData(data: string): string {
  if (!data) return ''
  const [a, m, d] = data.split('-')
  return `${d}/${m}/${a}`
}

/** 14 de out. */
export function formatarDataCurta(data: string): string {
  return fmt({ day: 'numeric', month: 'short' }).format(paraUTC(data))
}

/** quarta-feira, 14 de outubro de 2026 */
export function formatarDataExtensa(data: string): string {
  return fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(paraUTC(data))
}

/** outubro de 2026 */
export function formatarMesAno(data: string): string {
  return fmt({ month: 'long', year: 'numeric' }).format(paraUTC(data))
}

export function formatarIntervalo(inicio: string, fim: string): string {
  const mesmoAno = inicio.slice(0, 4) === fim.slice(0, 4)
  const a = fmt({ day: 'numeric', month: 'short', ...(mesmoAno ? {} : { year: 'numeric' }) }).format(
    paraUTC(inicio),
  )
  const b = fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(paraUTC(fim))
  return `${a} – ${b}`
}

export const NOMES_DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** Data e hora de um carimbo ISO, exibidos no fuso de Fortaleza. */
export function formatarCarimbo(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export type Periodo = 'todos' | '7d' | '30d' | '90d' | 'mes-atual' | 'mes-anterior' | 'ano-atual'

export const PERIODOS: { id: Periodo; nome: string }[] = [
  { id: '30d', nome: 'Últimos 30 dias' },
  { id: '7d', nome: 'Últimos 7 dias' },
  { id: '90d', nome: 'Últimos 90 dias' },
  { id: 'mes-atual', nome: 'Este mês' },
  { id: 'mes-anterior', nome: 'Mês anterior' },
  { id: 'ano-atual', nome: 'Este ano' },
  { id: 'todos', nome: 'Todo o período' },
]

/** Intervalo inclusivo de um período; `null` = sem limite. */
export function intervaloDoPeriodo(
  periodo: Periodo,
  referencia: string = hoje(),
): { inicio: string; fim: string } | null {
  switch (periodo) {
    case 'todos':
      return null
    case '7d':
      return { inicio: somarDias(referencia, -6), fim: referencia }
    case '30d':
      return { inicio: somarDias(referencia, -29), fim: referencia }
    case '90d':
      return { inicio: somarDias(referencia, -89), fim: referencia }
    case 'mes-atual':
      return { inicio: inicioDoMes(referencia), fim: fimDoMes(referencia) }
    case 'mes-anterior': {
      const inicio = somarMeses(referencia, -1)
      return { inicio, fim: fimDoMes(inicio) }
    }
    case 'ano-atual':
      return { inicio: `${referencia.slice(0, 4)}-01-01`, fim: `${referencia.slice(0, 4)}-12-31` }
  }
}

export function dentroDoIntervalo(data: string, intervalo: { inicio: string; fim: string } | null) {
  return !intervalo || (data >= intervalo.inicio && data <= intervalo.fim)
}
