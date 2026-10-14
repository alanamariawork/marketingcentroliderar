// Modelos de dados da aplicação. Todos os registros pertencem a uma empresa.

export type EmpresaId = 'smart-games' | 'up-machines' | 'centro-liderar'
export type PaginaId = 'cronograma' | 'atividades' | 'insights' | 'drive' | 'dashboard'

/** Identificador do responsável; `null` significa "Sem responsável". */
export type ResponsavelId = 'anny' | 'carlos' | 'jordana' | null

export type Plataforma =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube'
  | 'LinkedIn'
  | 'Facebook'
  | 'Site/Blog'
  | 'E-mail'
  | 'WhatsApp'
  | 'Outro'

export type Formato = 'Post' | 'Carrossel' | 'Reels' | 'Stories' | 'Vídeo' | 'Artigo' | 'E-mail'
export type StatusConteudo = 'Ideia' | 'Em produção' | 'Em aprovação' | 'Agendado' | 'Publicado'
export type StatusAtividade = 'A fazer' | 'Em andamento' | 'Em revisão' | 'Concluído'
export type Prioridade = 'Baixa' | 'Média' | 'Alta'
export type TipoLink =
  | 'Pasta'
  | 'Documento'
  | 'Planilha'
  | 'Apresentação'
  | 'Imagem'
  | 'Vídeo'
  | 'Outro'

interface Registro {
  id: string
  empresaId: EmpresaId
  criadoEm: string
  atualizadoEm: string
}

export interface Conta extends Registro {
  nome: string
  plataforma: Plataforma
  perfil: string
}

/** `null` = métrica não preenchida (diferente de zero). */
export interface Metricas {
  alcance: number | null
  visualizacoes: number | null
  curtidas: number | null
  comentarios: number | null
  compartilhamentos: number | null
  salvamentos: number | null
}

export interface Conteudo extends Registro {
  titulo: string
  contaId: string
  formato: Formato
  /** Data de calendário AAAA-MM-DD (fuso America/Fortaleza). */
  data: string
  /** Horário HH:mm (fuso America/Fortaleza). */
  horario: string
  responsavel: ResponsavelId
  status: StatusConteudo
  legenda: string
  linkMaterial: string
  metricas: Metricas | null
  metricasRegistradasEm: string | null
}

export interface Atividade extends Registro {
  titulo: string
  descricao: string
  responsavel: ResponsavelId
  /** AAAA-MM-DD ou vazio quando não há prazo. */
  prazo: string
  prioridade: Prioridade
  status: StatusAtividade
  conteudoId: string | null
}

export interface LinkDrive extends Registro {
  nome: string
  tipo: TipoLink
  descricao: string
  url: string
}

export type NovoRegistro<T> = Omit<T, 'id' | 'empresaId' | 'criadoEm' | 'atualizadoEm'>
