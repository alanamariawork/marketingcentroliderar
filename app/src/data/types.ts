// Modelos de dados. Os nomes dos campos de Insights e do catálogo do Drive são
// os mesmos do HTML de referência (marketing-grupo-mendes.html) para que os
// registros importados e os salvos no navegador continuem compatíveis.

export type EmpresaId = 'smart-games' | 'up-machines' | 'centro-liderar'
export type NomeEmpresa = 'Smart Games' | 'Up Machines' | 'Centro Liderar'
export type PaginaId = 'cronograma' | 'atividades' | 'insights' | 'drive' | 'dashboard'

/** Pessoa com permissão no fluxo de aprovação. Só é conhecida quando houver autenticação real. */
export type Perfil = 'Carlos' | 'Kélvia'

/** Anny continua aceita em registros antigos, mas não aparece nas novas atribuições. */
export type Responsavel = 'Carlos' | 'Jordana' | 'Anny' | 'Sem responsável'

export type FormatoPostagem =
  | 'Reels'
  | 'Carrossel'
  | 'Estático'
  | 'Live'
  | 'Story'
  | 'Endomarketing'
  | 'Marketing Offline'

export type StatusAtividade = 'Em produção' | 'Ajustes solicitados' | 'Aguardando aprovação' | 'Aprovado'

export interface EventoHistorico {
  /** Carimbo ISO; `null` nos registros de demonstração herdados da referência. */
  quando: string | null
  autor: Perfil | 'Sistema' | 'Sem identificação'
  texto: string
}

/**
 * Material para aprovação. O vídeo local é um endereço `blob:` que existe só
 * nesta aba do navegador: não é enviado à nuvem nem compartilhado.
 */
export interface Material {
  canva: string
  drive: string
  arte: string
  video: string | null
  videoNome: string
  videoTamanho: number
}

export interface Atividade {
  id: string
  empresaId: EmpresaId
  titulo: string
  status: StatusAtividade
  formato: FormatoPostagem
  responsavel: Responsavel
  /** AAAA-MM-DD no fuso America/Fortaleza; vazio = sem data definida. */
  dataPostagem: string
  /** HH:mm no fuso America/Fortaleza; vazio = horário a definir. */
  horaPostagem: string
  versao: number
  material: Material | null
  historico: EventoHistorico[]
  /** Atividades de exemplo, diferentes dos dados reais importados de Insights. */
  demonstrativa: boolean
  /**
   * Preenchido (só na leitura) quando um criativo está vinculado: status, versão
   * e decisão passam a vir do criativo, para as duas telas nunca divergirem.
   */
  criativoId?: string
}

/** Uma conta é um perfil ou canal de comunicação, não um usuário. */
export interface Conta {
  id: string
  empresaId: EmpresaId
  nome: string
  plataforma: string
  perfil: string
}

export type RegraScore = '' | 'liderar' | 'mqa'

export type ChaveMetrica =
  | 'nonfollowers'
  | 'followers'
  | 'clicks'
  | 'reach'
  | 'plays'
  | 'reposts'
  | 'repeats'
  | 'watch'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'follows'

/** `null`/ausente = não informado. Zero é um resultado válido. */
export type Metricas = { [K in ChaveMetrica]?: number | null }

export interface RegistroInsight extends Metricas {
  id: string
  /** Nome da empresa, como na referência ("Centro Liderar"). */
  company: string
  /** Identificador da conta, como na referência ("MQA", "Jaciara Mendes — Instagram"…). */
  account: string
  date: string
  rule: RegraScore
  collected: string
  updated: string
  notes: string
  type: string
  funnel: string
  format: string
  description: string
  link: string
  category: string
  sourceSheet?: string
  sourceRow?: number
  /** Score registrado na planilha de origem (histórico, não recalculado). */
  sourceScore?: number | null
  sourceFormula?: string
}

export type TipoItemDrive = 'Pasta' | 'Documento' | 'Foto' | 'Vídeo'

/**
 * Item do catálogo do Drive, exatamente como no HTML de referência. O campo
 * `type` foi gerado a partir do MIME type do Drive (conferido por amostragem:
 * image/* → Foto, video/* → Vídeo, atalhos e demais formatos → Documento).
 */
export interface ItemDrive {
  name: string
  url: string
  path: string
  type: TipoItemDrive
  /** MIME type do Drive, quando o catálogo trouxer esse dado (prioritário). */
  mimeType?: string
  /** Metadados reais do Drive (RFC 3339), quando o catálogo trouxer: criação e última modificação. */
  createdTime?: string
  modifiedTime?: string
}

export type TipoMidia = 'Foto' | 'Vídeo'

/* ---------- Criativos (Drive › Criativos › Produção) ---------- */

export type StatusCriativo = 'Em produção' | 'Em revisão' | 'Ajustes solicitados' | 'Aprovado'

/** Evento ou campanha: agrupa criativos dentro de Produção. Organização do sistema, não do Google Drive. */
export interface EventoCampanha {
  id: string
  empresaId: EmpresaId
  nome: string
  tipo: 'Evento' | 'Campanha'
  /** AAAA-MM-DD; vazio = sem data definida. */
  data: string
  observacoes: string
  criadoEm: string
}

/**
 * Peça do criativo (uma imagem ou um vídeo). `arquivo`: anexada neste
 * navegador (o conteúdo fica no IndexedDB, nunca no localStorage, e não é
 * enviado ao Google Drive). `drive`: link de um ARQUIVO do Drive.
 */
export interface PecaCriativo {
  id: string
  origem: 'arquivo' | 'drive'
  nome: string
  midia: TipoMidia
  /** origem `arquivo`: chave do conteúdo no IndexedDB. */
  arquivoId?: string
  tamanho?: number
  mime?: string
  /** origem `drive`: link do arquivo no Google Drive. */
  url?: string
}

/** Versão = o material efetivamente revisado. A aprovação vale para uma versão. */
export interface VersaoCriativo {
  numero: number
  criadaEm: string
  autor: Perfil | 'Sem identificação'
  pecas: PecaCriativo[]
}

export type DecisaoCriativo = 'Enviado para revisão' | 'Aprovado' | 'Ajustes solicitados'

export interface RegistroDecisao {
  versao: number
  autor: Perfil
  quando: string
  decisao: DecisaoCriativo
  comentario: string
}

export interface Criativo {
  id: string
  empresaId: EmpresaId
  nome: string
  /** Vazio = "Sem evento vinculado". */
  eventoId: string
  /** Atividade vinculada (opcional). A decisão fica no criativo e vale para as duas telas. */
  atividadeId: string
  responsavel: Responsavel
  formato: FormatoPostagem
  /** Link editável do Canva: só referência para edição, sem sincronização. */
  canva: string
  /** Link de um arquivo ou de uma pasta no Drive. */
  drive: string
  observacoes: string
  versoes: VersaoCriativo[]
  decisoes: RegistroDecisao[]
  /** Alterações de cadastro (responsável, evento, vínculos…), que não mudam a versão. */
  historico: EventoHistorico[]
  criadoEm: string
  atualizadoEm: string
}
