/**
 * Cliente do agente de atualização dos Insights.
 *
 * O agente roda no servidor (lá ficam o token do Instagram e a rotina diária
 * das 8h). O site só chama o endereço configurado em `VITE_AGENTE_INSIGHTS_URL`;
 * sem esse endereço, o botão explica o que falta configurar. Nenhuma credencial
 * fica no site.
 */
import type { RegistroInsight } from './types'

export const URL_AGENTE: string = (import.meta.env.VITE_AGENTE_INSIGHTS_URL ?? '').trim()
export const AGENTE_CONFIGURADO = URL_AGENTE !== ''

export interface ContaColetada {
  account: string
  publicacoes: number
  /** Mensagem quando a conta não pôde ser lida (token expirado, conta não profissional…). */
  erro?: string
}

export interface RespostaAgente {
  /** Dia das publicações coletadas (AAAA-MM-DD, 7 dias atrás). */
  dia: string
  contas: ContaColetada[]
  registros: RegistroInsight[]
}

export class ErroDoAgente extends Error {}

/** Pede ao servidor a coleta das publicações de 7 dias atrás em todas as contas de Instagram. */
export async function executarAgente(sinal?: AbortSignal): Promise<RespostaAgente> {
  if (!AGENTE_CONFIGURADO) throw new ErroDoAgente('O agente ainda não foi configurado.')
  let r: Response
  try {
    r = await fetch(URL_AGENTE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: sinal })
  } catch {
    throw new ErroDoAgente('Não foi possível falar com o agente. Verifique a conexão e tente novamente.')
  }
  if (!r.ok) throw new ErroDoAgente(`O agente respondeu com erro (${r.status}). Nada foi alterado.`)
  const dados = (await r.json()) as RespostaAgente
  if (!Array.isArray(dados?.registros) || !Array.isArray(dados?.contas)) {
    throw new ErroDoAgente('O agente devolveu uma resposta inesperada. Nada foi alterado.')
  }
  return dados
}
