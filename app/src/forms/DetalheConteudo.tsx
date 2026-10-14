import { BarChart3, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { Etiqueta, SeloResponsavel, SeloStatus } from '../components/Badges'
import { useFeedback } from '../components/Feedback'
import { CAMPOS_METRICAS } from '../data/constants'
import { formatarCarimbo, formatarDataExtensa } from '../lib/dates'
import { formatarNumero } from '../lib/format'
import { mensagemDeErro, useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'
import { useState } from 'react'

/** Visualização de um conteúdo, com ações para editar, registrar resultados e excluir. */
export function DetalheConteudo({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { conteudos, contas, atividades, excluir } = useDadosEmpresa()
  const { substituir, abrir } = useModais()
  const feedback = useFeedback()
  const [excluindo, setExcluindo] = useState(false)
  const c = conteudos.find((x) => x.id === id)

  if (!c) {
    return (
      <Dialog aberto titulo="Conteúdo não encontrado" onFechar={onFechar}>
        <p className="text-sm text-ink-muted">Este conteúdo não existe mais. Ele pode ter sido excluído.</p>
      </Dialog>
    )
  }
  const conta = contas.find((x) => x.id === c.contaId)
  const vinculadas = atividades.filter((a) => a.conteudoId === c.id)

  async function aoExcluir() {
    const ok = await feedback.confirmar({
      titulo: 'Excluir conteúdo?',
      mensagem: `“${c!.titulo}” será excluído permanentemente${
        vinculadas.length ? `, e ${vinculadas.length} atividade(s) perderão o vínculo com ele` : ''
      }. Esta ação não pode ser desfeita.`,
    })
    if (!ok) return
    setExcluindo(true)
    try {
      await excluir('conteudos', c!.id)
      feedback.sucesso('Conteúdo excluído.')
      onFechar()
    } catch (e) {
      feedback.erro(mensagemDeErro(e))
      setExcluindo(false)
    }
  }

  return (
    <Dialog
      aberto
      titulo={c.titulo}
      descricao={`${formatarDataExtensa(c.data)} às ${c.horario}`}
      onFechar={onFechar}
      bloqueado={excluindo}
      rodape={
        <>
          <button type="button" className="btn-ghost mr-auto text-danger" onClick={aoExcluir} disabled={excluindo}>
            <Trash2 className="size-4" aria-hidden />
            {excluindo ? 'Excluindo…' : 'Excluir'}
          </button>
          {c.status === 'Publicado' && (
            <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'resultados', id: c.id })}>
              <BarChart3 className="size-4" aria-hidden />
              Registrar resultados
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => substituir({ tipo: 'conteudo', registro: c })}
            data-autofocus
          >
            <Pencil className="size-4" aria-hidden />
            Editar
          </button>
        </>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-ink-muted">Conta</dt>
        <dd className="text-ink">{conta ? `${conta.nome} · ${conta.plataforma}` : 'Conta removida'}</dd>
        <dt className="text-ink-muted">Formato</dt>
        <dd>
          <Etiqueta>{c.formato}</Etiqueta>
        </dd>
        <dt className="text-ink-muted">Status</dt>
        <dd>
          <SeloStatus status={c.status} />
        </dd>
        <dt className="text-ink-muted">Responsável</dt>
        <dd>
          <SeloResponsavel id={c.responsavel} />
        </dd>
        <dt className="text-ink-muted">Material</dt>
        <dd className="min-w-0">
          {c.linkMaterial ? (
            <a
              href={c.linkMaterial}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 break-all text-brand-700 underline underline-offset-2"
            >
              Abrir material
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          ) : (
            <span className="text-ink-muted">Não informado</span>
          )}
        </dd>
      </dl>

      <h3 className="mt-6 mb-1.5 text-sm font-semibold text-ink">Legenda</h3>
      {c.legenda ? (
        <p className="rounded-[var(--radius-control)] bg-surface-muted p-3 text-sm whitespace-pre-wrap text-ink-soft">
          {c.legenda}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">Sem legenda.</p>
      )}

      {vinculadas.length > 0 && (
        <>
          <h3 className="mt-6 mb-1.5 text-sm font-semibold text-ink">Atividades vinculadas</h3>
          <ul className="space-y-1 text-sm text-ink-soft">
            {vinculadas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{a.titulo}</span>
                <SeloStatus status={a.status} />
              </li>
            ))}
          </ul>
        </>
      )}

      {c.metricas && (
        <>
          <h3 className="mt-6 mb-1.5 text-sm font-semibold text-ink">Resultados</h3>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CAMPOS_METRICAS.map(({ chave, rotulo }) => (
              <div key={chave} className="rounded-[var(--radius-control)] border border-line p-2">
                <dt className="text-xs text-ink-muted">{rotulo}</dt>
                <dd className="text-sm font-semibold text-ink">
                  {c.metricas![chave] === null ? (
                    <span className="font-normal text-ink-muted">Não preenchido</span>
                  ) : (
                    formatarNumero(c.metricas![chave]!)
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {c.metricasRegistradasEm && (
            <p className="mt-2 text-xs text-ink-muted">Registrado em {formatarCarimbo(c.metricasRegistradasEm)}</p>
          )}
        </>
      )}
    </Dialog>
  )
}
