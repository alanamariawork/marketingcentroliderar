import { ArrowRight, KanbanSquare, Paperclip } from 'lucide-react'
import { COLUNAS_KANBAN } from '../data/constants'
import type { Atividade, EmpresaId } from '../data/types'
import { useDadosDaEmpresa, useSessao } from '../state/Sessao'
import { useModais } from '../state/Modais'
import { rotuloAgendamento } from '../lib/calendario'
import { podeDecidir } from '../lib/aprovacao'
import { EstadoVazio } from '../components/Estados'
import { Etiqueta, SeloPessoa } from '../components/Selos'

/** Kanban da referência. "Ajustes solicitados" volta para a coluna Em produção, sinalizado. */
export function Atividades({ empresaId, onNova }: { empresaId: EmpresaId; onNova: () => void }) {
  const { atividades } = useDadosDaEmpresa(empresaId)

  if (!atividades.length) {
    return (
      <EstadoVazio icone={KanbanSquare} titulo="Nenhuma atividade cadastrada para esta empresa." acao="Adicionar atividade" onAcao={onNova}>
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          Cadastre a entrega com formato, data e hora da postagem. Ela aparece aqui e no Cronograma.
        </p>
      </EstadoVazio>
    )
  }

  const demonstrativas = atividades.filter((a) => a.demonstrativa).length
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {atividades.length} {atividades.length === 1 ? 'entrega' : 'entregas'}
          {demonstrativas > 0 && ` · ${demonstrativas} demonstrativa${demonstrativas > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUNAS_KANBAN.map((coluna) => {
          const lista = atividades.filter((a) =>
            coluna === 'Em produção' ? a.status === 'Em produção' || a.status === 'Ajustes solicitados' : a.status === coluna,
          )
          return (
            <section key={coluna} aria-labelledby={`coluna-${coluna}`} className="rounded-[var(--radius-card)] bg-surface-muted/70 p-3">
              <h2 id={`coluna-${coluna}`} className="mb-3 flex items-center justify-between text-sm font-semibold text-ink">
                {coluna}
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-muted ring-1 ring-line">{lista.length}</span>
              </h2>
              <div className="space-y-2.5">
                {lista.length ? lista.map((a) => <Cartao key={a.id} a={a} />) : <p className="py-6 text-center text-xs text-ink-muted">Nenhuma entrega</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Cartao({ a }: { a: Atividade }) {
  const { usuario } = useSessao()
  const { abrir } = useModais()
  const revisar = a.status === 'Aguardando aprovação' && podeDecidir(usuario, a)
  return (
    <article className="card space-y-2.5 p-3.5">
      <p className="text-xs text-ink-muted">
        {a.formato} · {rotuloAgendamento(a)}
      </p>
      <h3 className="text-sm leading-snug font-semibold text-ink">{a.titulo}</h3>
      <div className="flex flex-wrap gap-1.5">
        {a.status === 'Ajustes solicitados' && <Etiqueta tom="aviso">Ajustes solicitados</Etiqueta>}
        {a.material && (
          <Etiqueta>
            <Paperclip className="mr-1 size-3" aria-hidden />
            Material anexado
          </Etiqueta>
        )}
        {a.demonstrativa && <Etiqueta tom="info">Demonstração</Etiqueta>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <SeloPessoa nome={a.responsavel} />
        <button type="button" className={revisar ? 'btn-primary px-2.5 py-1.5 text-xs' : 'btn-ghost px-2 py-1.5 text-xs'} onClick={() => abrir({ tipo: 'atividade', id: a.id })}>
          {revisar ? 'Revisar entrega' : 'Abrir entrega'}
          <ArrowRight className="size-3.5" aria-hidden />
          <span className="sr-only">: {a.titulo}</span>
        </button>
      </div>
    </article>
  )
}
