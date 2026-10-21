import { useState, type FormEvent } from 'react'
import { CheckCircle2, RotateCcw, Send, Trash2 } from 'lucide-react'
import { APROVADORA_FINAL, nomeEmpresa } from '../data/constants'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { Campo, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { Etiqueta, Nota, SeloPessoa, SeloStatus } from '../components/Selos'
import { registrar, useSessao } from '../state/Sessao'
import { aplicarAcao, podeDecidir, podeEnviar, type AcaoAprovacao } from '../lib/aprovacao'
import { rotuloAgendamento } from '../lib/calendario'
import { formatarCarimbo } from '../lib/dates'
import { EditorMaterial, useRascunhoMaterial, VisualizarMaterial } from './Material'

export function DetalheAtividade({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { atividades, perfil, atualizarAtividade, excluirAtividade } = useSessao()
  const feedback = useFeedback()
  const a = atividades.find((x) => x.id === id)
  const [orientacao, setOrientacao] = useState('')
  const [erroAcao, setErroAcao] = useState('')
  const [editandoMaterial, setEditandoMaterial] = useState(false)

  if (!a) {
    return (
      <Dialog aberto titulo="Entrega não encontrada" onFechar={onFechar}>
        <p className="text-sm text-ink-muted">Esta atividade foi excluída ou não existe mais nesta sessão.</p>
      </Dialog>
    )
  }

  function executar(acao: AcaoAprovacao) {
    try {
      const nova = aplicarAcao(a!, acao, perfil, orientacao)
      atualizarAtividade(a!.id, () => nova)
      setOrientacao('')
      setErroAcao('')
      feedback.sucesso(nova.historico[nova.historico.length - 1].texto)
    } catch (e) {
      setErroAcao((e as Error).message)
    }
  }

  async function excluir() {
    const ok = await feedback.confirmar({
      titulo: 'Excluir atividade?',
      mensagem: `“${a!.titulo}” será removida do Kanban e do Cronograma desta sessão. Esta ação não pode ser desfeita.`,
    })
    if (!ok) return
    excluirAtividade(a!.id)
    feedback.sucesso('Atividade excluída.')
    onFechar()
  }

  const decidir = podeDecidir(perfil, a)
  const enviar = podeEnviar(perfil, a)

  return (
    <Dialog
      aberto
      titulo={a.titulo}
      descricao={`${nomeEmpresa(a.empresaId)} · Versão ${a.versao} · ${a.formato}`}
      onFechar={onFechar}
      largura="sm:max-w-xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <SeloStatus status={a.status} />
          {a.demonstrativa && <Etiqueta tom="info">Atividade demonstrativa</Etiqueta>}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="eyebrow">Produção</dt>
            <dd className="mt-1">
              <SeloPessoa nome={a.responsavel} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Aprovação final</dt>
            <dd className="mt-1 text-ink-soft">{APROVADORA_FINAL}</dd>
          </div>
        </dl>

        <EditorAgendamento key={`${a.dataPostagem}-${a.horaPostagem}`} id={a.id} />

        <section aria-labelledby="titulo-material" className="space-y-2">
          <h3 id="titulo-material" className="text-sm font-semibold text-ink">
            Material para aprovação
          </h3>
          {editandoMaterial ? (
            <AtualizarMaterial id={a.id} onConcluir={() => setEditandoMaterial(false)} />
          ) : (
            <>
              <VisualizarMaterial material={a.material} />
              {enviar && (
                <button type="button" className="btn-secondary" onClick={() => setEditandoMaterial(true)}>
                  Atualizar material
                </button>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="titulo-decisao" className="space-y-3">
          <h3 id="titulo-decisao" className="text-sm font-semibold text-ink">
            Decisão
          </h3>
          {erroAcao && <AlertaErro mensagem={erroAcao} />}
          {decidir ? (
            <>
              <Campo rotulo="Orientação para ajustes" dica="Obrigatória para solicitar ajustes. Fica registrada no histórico.">
                {(p) => (
                  <textarea
                    {...p}
                    rows={3}
                    className="field-control"
                    placeholder="Descreva o que precisa mudar"
                    value={orientacao}
                    onChange={(e) => setOrientacao(e.target.value)}
                  />
                )}
              </Campo>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => executar('aprovar')}>
                  <CheckCircle2 className="size-4" aria-hidden />
                  Aprovar versão
                </button>
                <button type="button" className="btn-secondary" onClick={() => executar('ajustes')}>
                  <RotateCcw className="size-4" aria-hidden />
                  Solicitar ajustes
                </button>
              </div>
            </>
          ) : enviar ? (
            <button type="button" className="btn-primary" onClick={() => executar('enviar')}>
              <Send className="size-4" aria-hidden />
              Enviar para aprovação
            </button>
          ) : (
            <Nota>
              {a.status === 'Aprovado'
                ? 'Versão aprovada por Kélvia. Pronta para agendamento.'
                : a.status === 'Aguardando aprovação'
                  ? 'Aguardando decisão de Kélvia. Selecione o perfil dela em “Simular perfil” para revisar.'
                  : 'Em produção com Carlos. Selecione o perfil de Carlos para enviar à aprovação.'}
            </Nota>
          )}
        </section>

        <section aria-labelledby="titulo-historico">
          <h3 id="titulo-historico" className="eyebrow">
            Histórico
          </h3>
          {a.historico.length ? (
            <ol className="mt-2 space-y-2 border-l border-line pl-4">
              {a.historico.map((h, i) => (
                <li key={i} className="text-sm text-ink-soft">
                  <span className="block text-xs text-ink-muted">
                    {h.quando ? formatarCarimbo(h.quando) : 'Registro de demonstração'} · {h.autor}
                  </span>
                  {h.texto}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Produção iniciada. Nenhum envio registrado ainda.</p>
          )}
        </section>

        <div className="border-t border-line pt-4">
          <button type="button" className="btn-ghost text-danger" onClick={excluir}>
            <Trash2 className="size-4" aria-hidden />
            Excluir atividade
          </button>
        </div>
      </div>
    </Dialog>
  )
}

function EditorAgendamento({ id }: { id: string }) {
  const { atividades, perfil, atualizarAtividade } = useSessao()
  const feedback = useFeedback()
  const a = atividades.find((x) => x.id === id)!
  const [data, setData] = useState(a.dataPostagem)
  const [hora, setHora] = useState(a.horaPostagem)
  const [erro, setErro] = useState('')

  function salvar(e: FormEvent) {
    e.preventDefault()
    if (hora && !data) {
      setErro('Informe uma data para definir o horário.')
      return
    }
    const antes = rotuloAgendamento(a)
    const depois = rotuloAgendamento({ dataPostagem: data, horaPostagem: hora })
    if (antes === depois) return
    atualizarAtividade(id, (x) => ({
      ...x,
      dataPostagem: data,
      horaPostagem: hora,
      historico: [...x.historico, registrar(perfil, `${perfil} alterou a previsão de ${antes} para ${depois}.`)],
    }))
    feedback.sucesso('Data e hora atualizadas no Cronograma.')
  }

  return (
    <form onSubmit={salvar} noValidate className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
      <h3 className="text-sm font-semibold text-ink">Postagem planejada</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Data da postagem" erro={erro}>
          {(p) => <input {...p} type="date" className="field-control" value={data} onChange={(e) => setData(e.target.value)} />}
        </Campo>
        <Campo rotulo="Hora da postagem">
          {(p) => <input {...p} type="time" className="field-control" value={hora} onChange={(e) => setHora(e.target.value)} />}
        </Campo>
      </div>
      <p className="text-xs text-ink-muted">
        Horário de Fortaleza. Alterar a data não muda a aprovação nem publica o conteúdo.
      </p>
      <button type="submit" className="btn-secondary">
        Salvar data e hora
      </button>
    </form>
  )
}

function AtualizarMaterial({ id, onConcluir }: { id: string; onConcluir: () => void }) {
  const { atividades, perfil, atualizarAtividade } = useSessao()
  const feedback = useFeedback()
  const a = atividades.find((x) => x.id === id)!
  const material = useRascunhoMaterial(a.material)
  const [erros, setErros] = useState<Record<string, string>>({})
  const { salvando, enviar } = useEnvio()

  function salvar() {
    const e = material.validar()
    setErros(e)
    if (Object.keys(e).length) return
    enviar(() => {
      const m = material.confirmar()
      atualizarAtividade(id, (x) => ({
        ...x,
        material: m,
        historico: [...x.historico, registrar(perfil, 'Carlos atualizou o material da entrega.')],
      }))
      feedback.sucesso('Material atualizado nesta sessão.')
      onConcluir()
    })
  }

  return (
    <div className="space-y-3">
      <EditorMaterial r={material} erros={erros} desabilitado={salvando} />
      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={salvar} disabled={salvando} aria-busy={salvando}>
          {salvando ? 'Salvando…' : 'Salvar material'}
        </button>
        <button type="button" className="btn-secondary" onClick={onConcluir} disabled={salvando}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
