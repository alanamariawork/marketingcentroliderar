import { useMemo, useState } from 'react'
import {
  ExternalLink,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  Info,
  Pencil,
  Presentation,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Etiqueta } from '../components/Badges'
import { EstadoVazio } from '../components/Estados'
import { BarraFiltros, Filtro } from '../components/Filtros'
import { useFeedback } from '../components/Feedback'
import { TIPOS_LINK } from '../data/constants'
import type { LinkDrive, TipoLink } from '../data/types'
import { mensagemDeErro, useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'

const ICONES: Record<TipoLink, LucideIcon> = {
  Pasta: Folder,
  Documento: FileText,
  Planilha: FileSpreadsheet,
  Apresentação: Presentation,
  Imagem: FileImage,
  Vídeo: FileVideo,
  Outro: File,
}

const TODOS = 'todos'

export function Drive() {
  const { links, excluir } = useDadosEmpresa()
  const { abrir } = useModais()
  const feedback = useFeedback()
  const [fTipo, setFTipo] = useState(TODOS)
  const [busca, setBusca] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    return links
      .filter((l) => fTipo === TODOS || l.tipo === fTipo)
      .filter((l) => !termo || `${l.nome} ${l.descricao}`.toLocaleLowerCase('pt-BR').includes(termo))
      .sort((a, b) => (a.tipo === 'Pasta' ? 0 : 1) - (b.tipo === 'Pasta' ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [links, fTipo, busca])

  async function aoExcluir(l: LinkDrive) {
    const ok = await feedback.confirmar({
      titulo: 'Excluir link?',
      mensagem: `O atalho “${l.nome}” será removido desta lista. O arquivo ou pasta original não é afetado.`,
    })
    if (!ok) return
    setExcluindoId(l.id)
    try {
      await excluir('links', l.id)
      feedback.sucesso('Link excluído.')
    } catch (e) {
      feedback.erro(mensagemDeErro(e))
    } finally {
      setExcluindoId(null)
    }
  }

  const aviso = (
    <p className="flex items-start gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-xs text-ink-muted">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      Esta lista guarda apenas atalhos para arquivos e pastas. Não há integração ativa com o Google Drive: os links abrem no
      serviço de origem, conforme as permissões de cada arquivo.
    </p>
  )

  if (links.length === 0) {
    return (
      <div className="space-y-4">
        {aviso}
        <EstadoVazio
          icone={FolderOpen}
          titulo="Nenhum link cadastrado. Adicione links de pastas e arquivos desta empresa."
          acao="Adicionar link"
          onAcao={() => abrir({ tipo: 'link' })}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {aviso}
      <BarraFiltros
        ativos={(fTipo !== TODOS ? 1 : 0) + (busca ? 1 : 0)}
        onLimpar={() => {
          setFTipo(TODOS)
          setBusca('')
        }}
      >
        <div className="min-w-48 flex-1 sm:max-w-xs">
          <label htmlFor="busca-drive" className="mb-1 block text-xs font-medium text-ink-muted">
            Buscar
          </label>
          <input
            id="busca-drive"
            type="search"
            className="field-control py-1.5"
            placeholder="Nome ou descrição"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Filtro
          rotulo="Tipo"
          valor={fTipo}
          onChange={setFTipo}
          opcoes={[{ valor: TODOS, nome: 'Todos' }, ...TIPOS_LINK.map((t) => ({ valor: t, nome: t }))]}
        />
      </BarraFiltros>

      {lista.length === 0 ? (
        <p className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink-muted">
          Nenhum link corresponde à busca ou ao filtro.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((l) => {
            const Icone = ICONES[l.tipo]
            return (
              <li key={l.id} className="card flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-surface-muted text-ink-soft">
                    <Icone className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-medium text-ink" title={l.nome}>
                      {l.nome}
                    </h2>
                    <Etiqueta>{l.tipo}</Etiqueta>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-muted">{l.descricao || 'Sem descrição.'}</p>
                <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn-secondary mr-auto">
                    <ExternalLink className="size-4" aria-hidden />
                    Abrir link
                    <span className="sr-only">: {l.nome} (abre em nova aba)</span>
                  </a>
                  <button
                    type="button"
                    className="btn-ghost p-2"
                    onClick={() => abrir({ tipo: 'link', registro: l })}
                    aria-label={`Editar link ${l.nome}`}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost p-2 text-danger"
                    onClick={() => aoExcluir(l)}
                    disabled={excluindoId === l.id}
                    aria-label={`Excluir link ${l.nome}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
