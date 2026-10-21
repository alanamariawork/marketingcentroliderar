import type { ChaveMetrica, EmpresaId, FormatoPostagem, NomeEmpresa, PaginaId, Responsavel } from './types'

/**
 * Empresas conhecidas pelo modelo de dados. Esta versão é exclusiva do Centro
 * Liderar: Smart Games e Up Machines saíram da interface e do escopo, mas
 * continuam aqui para que registros eventualmente salvos delas não sejam
 * apagados nem reinterpretados.
 */
export const EMPRESAS: { id: EmpresaId; nome: NomeEmpresa }[] = [
  { id: 'smart-games', nome: 'Smart Games' },
  { id: 'up-machines', nome: 'Up Machines' },
  { id: 'centro-liderar', nome: 'Centro Liderar' },
]

export const EMPRESA_DO_SISTEMA: EmpresaId = 'centro-liderar'
export const NOME_DO_SISTEMA = 'Centro Liderar — Gestão de Marketing'

export function nomeEmpresa(id: EmpresaId): NomeEmpresa {
  return EMPRESAS.find((e) => e.id === id)!.nome
}

export const PAGINAS: { id: PaginaId; nome: string }[] = [
  { id: 'cronograma', nome: 'Cronograma' },
  { id: 'atividades', nome: 'Atividades' },
  { id: 'insights', nome: 'Insights' },
  { id: 'drive', nome: 'Drive' },
  { id: 'dashboard', nome: 'Dashboard' },
]

/* ---------- Equipe ---------- */

/** Opções para novas atribuições. Anny fica fora; Kélvia aprova, não produz. */
export const RESPONSAVEIS_ATRIBUIVEIS: Responsavel[] = ['Carlos', 'Jordana', 'Sem responsável']

export const APROVADORA_FINAL = 'Kélvia'

/* ---------- Atividades ---------- */

export const FORMATOS_POSTAGEM: FormatoPostagem[] = [
  'Reels',
  'Carrossel',
  'Estático',
  'Live',
  'Story',
  'Endomarketing',
  'Marketing Offline',
]

export const COLUNAS_KANBAN = ['Em produção', 'Aguardando aprovação', 'Aprovado'] as const

export const PLATAFORMAS_CONTA = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Facebook', 'Tráfego pago', 'Outro']

/* ---------- Insights ---------- */

/**
 * Contas e frentes do Centro Liderar. `id` é o identificador usado no HTML de
 * referência e nos registros importados — não alterar, para não quebrar
 * vínculos. `rotulo` é só o nome exibido.
 */
export const CONTAS_CENTRO_LIDERAR: { id: string; rotulo: string }[] = [
  { id: 'Centro Liderar', rotulo: 'Centro Liderar — Instagram' },
  { id: 'MQA', rotulo: 'MQA — Instagram' },
  { id: 'Diamante Business', rotulo: 'Diamante Business — Instagram' },
  { id: 'Jaciara Mendes — Instagram', rotulo: 'Jaciara Mendes — Instagram' },
  { id: 'Jaciara Mendes — YouTube', rotulo: 'Jaciara — YouTube' },
  { id: 'Jaciara Mendes — TikTok', rotulo: 'Jaciara — TikTok' },
  { id: 'Jaciara Mendes — Tráfego', rotulo: 'Jaciara — Tráfego' },
]

export function rotuloConta(id: string): string {
  return CONTAS_CENTRO_LIDERAR.find((c) => c.id === id)?.rotulo ?? id
}

export type UnidadeMetrica = 'pct' | 'int' | 'sec'

export const CAMPOS_METRICAS: [ChaveMetrica, string, UnidadeMetrica][] = [
  ['nonfollowers', 'Alcance de não seguidores (%)', 'pct'],
  ['followers', 'Alcance de seguidores (%)', 'pct'],
  ['clicks', 'Cliques no link', 'int'],
  ['reach', 'Alcance geral', 'int'],
  ['plays', 'Reproduções', 'int'],
  ['reposts', 'Republicados', 'int'],
  ['repeats', 'Repetições de reprodução', 'int'],
  ['watch', 'Tempo médio (segundos)', 'sec'],
  ['likes', 'Curtidas', 'int'],
  ['comments', 'Comentários', 'int'],
  ['shares', 'Compartilhamentos', 'int'],
  ['saves', 'Salvamentos', 'int'],
  ['follows', 'Seguimentos / novos seguidores', 'int'],
]

/** Formatos aceitos em Insights (os da referência, incluindo Shorts e Vídeo). */
export const FORMATOS_INSIGHT = [...FORMATOS_POSTAGEM, 'Shorts', 'Vídeo']

export const TIPOS_INSIGHT = ['Feed', 'Reels', 'Story', 'Live', 'Endomarketing', 'Marketing Offline', 'Shorts', 'Vídeo']

export const ETAPAS_FUNIL = ['ESCALA', 'NUTRIÇÃO', 'OBJEÇÃO'] as const
export type EtapaFunil = (typeof ETAPAS_FUNIL)[number]

/**
 * Distribuição editorial de referência (aba "ESTRATÉGIA DE FUNIL"), na ordem
 * ESCALA / NUTRIÇÃO / OBJEÇÃO. É distribuição de conteúdo, não conversão comercial.
 */
export const DISTRIBUICAO_EDITORIAL: Record<string, [number, number, number]> = {
  Alcance: [60, 30, 10],
  Nutrição: [40, 40, 20],
  Conversão: [40, 30, 30],
}

/* ---------- Drive ---------- */

export const DRIVE_RAIZ_URL = 'https://drive.google.com/drive/folders/1tDlhP8zS3O5gJ6eZBLRzzmfiqyb_Hi0D'
export const DRIVE_RAIZ_PASTA = 'LIDERAR'
export const DRIVE_DATA_CONSULTA = '16/10/2026'
export const DRIVE_ITENS_POR_PAGINA = 60

/** Guia de organização desejada. Só orienta: não move nem renomeia arquivos reais. */
export const DRIVE_GUIA: [string, string][] = [
  ['Jaciara / Instagram / Fotos', 'Retratos, bastidores e artes com foto para feed e stories.'],
  ['Jaciara / Instagram / Vídeos', 'Reels e stories já editados.'],
  ['Jaciara / YouTube / Vídeos', 'Vídeos longos editados, thumbnails e cortes.'],
  ['Jaciara / TikTok / Vídeos', 'Vídeos curtos no formato TikTok.'],
  ['Jaciara / Tráfego / Fotos', 'Banners, carrosséis e criativos estáticos para anúncios.'],
  ['Jaciara / Tráfego / Vídeos', 'Criativos em vídeo para anúncios pagos.'],
  ['Centro Liderar / Instagram / Fotos', 'Equipe, espaço, turmas e depoimentos.'],
  ['Centro Liderar / Instagram / Vídeos', 'Reels e stories institucionais.'],
  ['MQA / Instagram / Fotos', 'Fotos publicadas no perfil MQA.'],
  ['MQA / Instagram / Vídeos', 'Reels e stories do MQA.'],
  ['Diamante / Instagram / Fotos', 'Encontros, mentorias e alunos.'],
  ['Diamante / Instagram / Vídeos', 'Depoimentos, reels e stories dos encontros.'],
  ['Captação de Conteúdo / Fotos', 'Fotos brutas, sem edição, para todos os perfis.'],
  ['Captação de Conteúdo / Vídeos', 'Gravações brutas para reels, cortes e anúncios.'],
  ['Transmissão / Vídeos', 'Lives, aulas e encontros completos.'],
  ['Real Time / Fotos', 'Fotos feitas e postadas durante eventos.'],
  ['Real Time / Vídeos', 'Stories e vídeos curtos gravados e postados ao vivo.'],
]

/** Termos relacionados da referência (dicionário local, sem IA). */
export const DRIVE_SINONIMOS: string[][] = [
  ['jaciara', 'jacy', 'jaci'],
  ['bastidores', 'captacao', 'gravacao', 'bruto', 'brutas', 'brutos', 'nao editadas'],
  ['depoimento', 'depoimentos', 'testemunho', 'testemunhos'],
  ['anuncio', 'anuncios', 'trafego', 'criativo', 'criativos', 'ads'],
  ['youtube', 'yt'],
  ['live', 'lives', 'transmissao', 'aula', 'aulas'],
  ['foto', 'fotos', 'ensaio', 'retratos'],
  ['video', 'videos', 'reels', 'cortes'],
  ['diamante', 'diamantes'],
  ['equipe', 'staff', 'time'],
  ['instagram', 'insta'],
  ['evento', 'eventos', 'encontro', 'encontros'],
]

export const DRIVE_PALAVRAS_IGNORADAS = [
  'de', 'da', 'do', 'das', 'dos', 'com', 'para', 'em', 'no', 'na', 'os', 'as', 'um', 'uma', 'e', 'a', 'o',
  'quero', 'encontrar', 'buscar', 'mostre',
]

export const DRIVE_ATALHOS = ['Jaciara', 'Bastidores', 'Depoimentos', 'Tráfego', 'Equipe']
