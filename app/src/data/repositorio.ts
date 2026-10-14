/**
 * Camada de acesso a dados.
 *
 * As telas nunca tocam no localStorage diretamente: usam a interface
 * `Repositorio`, que já é assíncrona. Para conectar uma API no futuro, basta
 * criar outra implementação (ex.: `criarRepositorioApi`) com os mesmos métodos
 * e trocá-la em `repositorio` no fim deste arquivo.
 */
import type { Atividade, Conta, Conteudo, EmpresaId, LinkDrive, NovoRegistro } from './types'

export interface MapaColecoes {
  contas: Conta
  conteudos: Conteudo
  atividades: Atividade
  links: LinkDrive
}
export type Colecao = keyof MapaColecoes

export interface Repositorio {
  listar<C extends Colecao>(empresaId: EmpresaId, colecao: C): Promise<MapaColecoes[C][]>
  criar<C extends Colecao>(
    empresaId: EmpresaId,
    colecao: C,
    dados: NovoRegistro<MapaColecoes[C]>,
  ): Promise<MapaColecoes[C]>
  atualizar<C extends Colecao>(
    empresaId: EmpresaId,
    colecao: C,
    id: string,
    dados: Partial<NovoRegistro<MapaColecoes[C]>>,
  ): Promise<MapaColecoes[C]>
  excluir(empresaId: EmpresaId, colecao: Colecao, id: string): Promise<void>
}

export class ErroDeDados extends Error {}

const PREFIXO = 'gm-marketing:v1'
/** Defina `localStorage['gm-marketing:simular-erro'] = '1'` para testar falhas de gravação. */
export const CHAVE_SIMULAR_ERRO = 'gm-marketing:simular-erro'

export function chaveDaColecao(empresaId: EmpresaId, colecao: Colecao) {
  return `${PREFIXO}:${empresaId}:${colecao}`
}

function gerarId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function criarRepositorioLocal(
  obterArmazenamento: () => Storage = () => window.localStorage,
  latenciaMs = 250,
): Repositorio {
  const esperar = () => new Promise((r) => setTimeout(r, latenciaMs))

  function ler<T>(empresaId: EmpresaId, colecao: Colecao): T[] {
    let bruto: string | null
    try {
      bruto = obterArmazenamento().getItem(chaveDaColecao(empresaId, colecao))
    } catch {
      throw new ErroDeDados('O navegador bloqueou o acesso aos dados salvos. Verifique as permissões de armazenamento.')
    }
    if (!bruto) return []
    try {
      const lista = JSON.parse(bruto)
      if (!Array.isArray(lista)) throw new Error()
      return lista as T[]
    } catch {
      throw new ErroDeDados('Os dados salvos neste navegador estão corrompidos e não puderam ser lidos.')
    }
  }

  function gravar<T>(empresaId: EmpresaId, colecao: Colecao, lista: T[]) {
    try {
      const armazenamento = obterArmazenamento()
      if (armazenamento.getItem(CHAVE_SIMULAR_ERRO) === '1') throw new Error('simulado')
      armazenamento.setItem(chaveDaColecao(empresaId, colecao), JSON.stringify(lista))
    } catch {
      throw new ErroDeDados(
        'Não foi possível gravar no armazenamento do navegador. Ele pode estar cheio ou bloqueado. Seus dados continuam no formulário; tente novamente.',
      )
    }
  }

  return {
    async listar(empresaId, colecao) {
      await esperar()
      return ler(empresaId, colecao)
    },

    async criar(empresaId, colecao, dados) {
      await esperar()
      const agora = new Date().toISOString()
      const registro = { ...dados, id: gerarId(), empresaId, criadoEm: agora, atualizadoEm: agora }
      const lista = ler(empresaId, colecao)
      gravar(empresaId, colecao, [...lista, registro])
      return registro as never
    },

    async atualizar(empresaId, colecao, id, dados) {
      await esperar()
      const lista = ler<{ id: string }>(empresaId, colecao)
      const indice = lista.findIndex((r) => r.id === id)
      if (indice < 0) throw new ErroDeDados('Este registro não foi encontrado. Ele pode ter sido excluído.')
      const atualizado = { ...lista[indice], ...dados, id, empresaId, atualizadoEm: new Date().toISOString() }
      const nova = [...lista]
      nova[indice] = atualizado
      gravar(empresaId, colecao, nova)
      return atualizado as never
    },

    async excluir(empresaId, colecao, id) {
      await esperar()
      const lista = ler<{ id: string }>(empresaId, colecao)
      gravar(
        empresaId,
        colecao,
        lista.filter((r) => r.id !== id),
      )
    },
  }
}

export const repositorio: Repositorio = criarRepositorioLocal()
