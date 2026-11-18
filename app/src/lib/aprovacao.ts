/**
 * Fluxo de aprovação: Carlos produz e envia; somente Kélvia aprova ou pede
 * ajustes. Jordana pode ser responsável, mas não aprova. Sem usuário autenticado
 * (`null`), nenhuma ação de envio ou decisão é permitida.
 */
import type { Atividade, Perfil } from '../data/types'

export type AcaoAprovacao = 'enviar' | 'aprovar' | 'ajustes'

/** Com criativo vinculado, a decisão é feita no criativo (referência compartilhada), nunca na atividade. */
export function podeEnviar(perfil: Perfil | null, a: Pick<Atividade, 'status' | 'criativoId'>): boolean {
  return !a.criativoId && perfil === 'Carlos' && (a.status === 'Em produção' || a.status === 'Ajustes solicitados')
}

export function podeDecidir(perfil: Perfil | null, a: Pick<Atividade, 'status' | 'criativoId'>): boolean {
  return !a.criativoId && perfil === 'Kélvia' && a.status === 'Aguardando aprovação'
}

/** Aplica a ação e registra no histórico. Lança erro se o perfil não puder executá-la. */
export function aplicarAcao(
  a: Atividade,
  acao: AcaoAprovacao,
  perfil: Perfil | null,
  orientacao = '',
  quando: string = new Date().toISOString(),
): Atividade {
  if (acao === 'enviar') {
    if (!podeEnviar(perfil, a)) throw new Error('Somente Carlos envia materiais para aprovação.')
    const versao = a.status === 'Ajustes solicitados' ? a.versao + 1 : a.versao
    return {
      ...a,
      versao,
      status: 'Aguardando aprovação',
      historico: [...a.historico, { quando, autor: perfil!, texto: `Carlos enviou a versão ${versao} para aprovação.` }],
    }
  }
  if (!podeDecidir(perfil, a)) throw new Error('Somente Kélvia concede a aprovação final ou solicita ajustes.')
  if (acao === 'aprovar') {
    return {
      ...a,
      status: 'Aprovado',
      historico: [...a.historico, { quando, autor: perfil!, texto: `Kélvia aprovou a versão ${a.versao}.` }],
    }
  }
  if (!orientacao.trim()) throw new Error('Descreva os ajustes antes de enviar.')
  return {
    ...a,
    status: 'Ajustes solicitados',
    historico: [
      ...a.historico,
      { quando, autor: perfil!, texto: `Kélvia solicitou ajustes na versão ${a.versao}: ${orientacao.trim()}` },
    ],
  }
}
