/**
 * Ponto único de integração com a autenticação.
 *
 * Esta versão ainda não tem login, então não há usuário: nenhuma identidade é
 * atribuída automaticamente e as ações de envio e aprovação ficam bloqueadas.
 * Quando houver autenticação, basta devolver aqui a pessoa autenticada; as
 * permissões continuam decididas por `lib/aprovacao.ts`.
 */
import type { Perfil } from '../data/types'

export const AUTENTICACAO_DISPONIVEL = false

export function obterUsuarioAutenticado(): Perfil | null {
  return null
}
