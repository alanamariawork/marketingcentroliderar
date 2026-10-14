import type {
  EmpresaId,
  Formato,
  Metricas,
  PaginaId,
  Plataforma,
  Prioridade,
  ResponsavelId,
  StatusAtividade,
  StatusConteudo,
  TipoLink,
} from './types'

export const EMPRESAS: { id: EmpresaId; nome: string }[] = [
  { id: 'smart-games', nome: 'Smart Games' },
  { id: 'up-machines', nome: 'Up Machines' },
  { id: 'centro-liderar', nome: 'Centro Liderar' },
]

export const PAGINAS: { id: PaginaId; nome: string }[] = [
  { id: 'cronograma', nome: 'Cronograma' },
  { id: 'atividades', nome: 'Atividades' },
  { id: 'insights', nome: 'Insights' },
  { id: 'drive', nome: 'Drive' },
  { id: 'dashboard', nome: 'Dashboard' },
]

export interface Responsavel {
  id: ResponsavelId
  nome: string
  iniciais: string
}

export const RESPONSAVEIS: Responsavel[] = [
  { id: 'anny', nome: 'Anny', iniciais: 'AN' },
  { id: 'carlos', nome: 'Carlos', iniciais: 'CA' },
  { id: 'jordana', nome: 'Jordana', iniciais: 'JO' },
  { id: null, nome: 'Sem responsável', iniciais: '—' },
]

export function responsavelPorId(id: ResponsavelId): Responsavel {
  return RESPONSAVEIS.find((r) => r.id === id) ?? RESPONSAVEIS[3]
}

export const PLATAFORMAS: Plataforma[] = [
  'Instagram',
  'TikTok',
  'YouTube',
  'LinkedIn',
  'Facebook',
  'Site/Blog',
  'E-mail',
  'WhatsApp',
  'Outro',
]

export const FORMATOS: Formato[] = ['Post', 'Carrossel', 'Reels', 'Stories', 'Vídeo', 'Artigo', 'E-mail']

export const STATUS_CONTEUDO: StatusConteudo[] = [
  'Ideia',
  'Em produção',
  'Em aprovação',
  'Agendado',
  'Publicado',
]

export const STATUS_ATIVIDADE: StatusAtividade[] = ['A fazer', 'Em andamento', 'Em revisão', 'Concluído']

export const PRIORIDADES: Prioridade[] = ['Alta', 'Média', 'Baixa']

export const TIPOS_LINK: TipoLink[] = [
  'Pasta',
  'Documento',
  'Planilha',
  'Apresentação',
  'Imagem',
  'Vídeo',
  'Outro',
]

export const CAMPOS_METRICAS: { chave: keyof Metricas; rotulo: string }[] = [
  { chave: 'alcance', rotulo: 'Alcance' },
  { chave: 'visualizacoes', rotulo: 'Visualizações' },
  { chave: 'curtidas', rotulo: 'Curtidas' },
  { chave: 'comentarios', rotulo: 'Comentários' },
  { chave: 'compartilhamentos', rotulo: 'Compartilhamentos' },
  { chave: 'salvamentos', rotulo: 'Salvamentos' },
]

/** Métricas que compõem "interações". */
export const CHAVES_INTERACAO: (keyof Metricas)[] = [
  'curtidas',
  'comentarios',
  'compartilhamentos',
  'salvamentos',
]
