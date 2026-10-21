/**
 * Camada de armazenamento.
 *
 * - Insights: persistidos no localStorage com a MESMA chave e o mesmo formato do
 *   HTML de referência (`mendes-insights-v1`). Ao abrir, os registros importados
 *   das planilhas são acrescentados sem sobrescrever nada que já esteja salvo.
 * - Atividades, contas e anexos de vídeo: só na memória da sessão (como na
 *   referência). Ver docs/IMPLEMENTACAO.md.
 * - Catálogo do Drive: arquivo de dados próprio (public/dados/drive-catalogo.json),
 *   carregado sob demanda e nunca gravado no localStorage.
 */
import { mesclarImportados } from '../lib/insights'
import type { ItemDrive, RegistroInsight } from './types'

export const CHAVE_INSIGHTS = 'mendes-insights-v1'
/** Defina `localStorage['gm-marketing:simular-erro'] = '1'` para testar falhas de gravação. */
export const CHAVE_SIMULAR_ERRO = 'gm-marketing:simular-erro'

export class ErroDeArmazenamento extends Error {}

type ObterArmazenamento = () => Storage
const padrao: ObterArmazenamento = () => window.localStorage

export interface CargaInsights {
  registros: RegistroInsight[]
  /** Aviso para a pessoa (dados carregados, mas com alguma limitação). */
  aviso: string | null
  /**
   * true quando os dados salvos existem mas não puderam ser lidos: gravar
   * agora apagaria esses dados, então novas gravações ficam bloqueadas.
   */
  gravacaoBloqueada: boolean
}

export function carregarInsights(importados: RegistroInsight[], obter: ObterArmazenamento = padrao): CargaInsights {
  let bruto: string | null
  try {
    bruto = obter().getItem(CHAVE_INSIGHTS)
  } catch {
    return {
      registros: mesclarImportados([], importados),
      aviso:
        'O navegador bloqueou o acesso ao armazenamento local. Os dados das planilhas foram carregados, mas alterações não poderão ser salvas.',
      gravacaoBloqueada: true,
    }
  }

  let salvos: RegistroInsight[] = []
  if (bruto) {
    try {
      const lista = JSON.parse(bruto)
      if (!Array.isArray(lista)) throw new Error()
      salvos = lista
    } catch {
      return {
        registros: mesclarImportados([], importados),
        aviso:
          'Não foi possível ler os Insights salvos neste navegador. Para não sobrescrevê-los, novas gravações estão bloqueadas nesta sessão. Os dados das planilhas foram carregados.',
        gravacaoBloqueada: true,
      }
    }
  }

  const registros = mesclarImportados(salvos, importados)
  if (registros.length === salvos.length) return { registros, aviso: null, gravacaoBloqueada: false }
  try {
    gravar(registros, obter)
    return { registros, aviso: null, gravacaoBloqueada: false }
  } catch {
    return {
      registros,
      aviso: 'Dados da planilha carregados. O navegador não permitiu salvar alterações localmente.',
      gravacaoBloqueada: false,
    }
  }
}

function gravar(registros: RegistroInsight[], obter: ObterArmazenamento) {
  const armazenamento = obter()
  if (armazenamento.getItem(CHAVE_SIMULAR_ERRO) === '1') throw new Error('simulado')
  armazenamento.setItem(CHAVE_INSIGHTS, JSON.stringify(registros))
}

/** Grava a lista completa. Lança `ErroDeArmazenamento` sem alterar o que já estava salvo. */
export function salvarInsights(registros: RegistroInsight[], obter: ObterArmazenamento = padrao): void {
  try {
    gravar(registros, obter)
  } catch {
    throw new ErroDeArmazenamento(
      'Não foi possível salvar. Verifique o espaço e as permissões do navegador. Os campos continuam preenchidos; tente novamente.',
    )
  }
}

/** Registros importados das planilhas (arquivo de dados separado, carregado sob demanda). */
export async function carregarInsightsImportados(): Promise<RegistroInsight[]> {
  const modulo = await import('./importados/insights.json')
  return modulo.default as RegistroInsight[]
}

let catalogo: Promise<ItemDrive[]> | null = null

/** Catálogo do Drive (68.592 itens), baixado uma vez por sessão. */
export function carregarCatalogoDrive(): Promise<ItemDrive[]> {
  catalogo ??= fetch(`${import.meta.env.BASE_URL}dados/drive-catalogo.json`)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<ItemDrive[]>
    })
    .catch((e) => {
      catalogo = null
      throw e
    })
  return catalogo
}
