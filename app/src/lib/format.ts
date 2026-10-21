const inteiro = new Intl.NumberFormat('pt-BR')
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export function formatarNumero(n: number): string {
  return inteiro.format(n)
}

export function formatarCompacto(n: number): string {
  return Math.abs(n) >= 10_000 ? compacto.format(n) : inteiro.format(n)
}

export function ehUrlValida(valor: string): boolean {
  try {
    const url = new URL(valor)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** Número com até duas casas decimais; `null` vira "—" (não informado). */
export function formatarDecimal(n: number | null | undefined, sufixo = ''): string {
  return n == null ? '—' : decimal.format(n) + sufixo
}
