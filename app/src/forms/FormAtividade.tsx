import { useRef, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { PRIORIDADES, STATUS_ATIVIDADE } from '../data/constants'
import type { Atividade, NovoRegistro, Prioridade, StatusAtividade } from '../data/types'
import { ehDataValida, formatarData } from '../lib/dates'
import { nomeDaEmpresa } from '../lib/rotas'
import { mensagemDeErro, useDadosEmpresa } from '../state/DadosEmpresa'
import { SelectResponsavel } from './FormConteudo'

type Valores = NovoRegistro<Atividade>

export function FormAtividade({
  registro,
  statusInicial,
  onFechar,
}: {
  registro?: Atividade
  statusInicial?: StatusAtividade
  onFechar: () => void
}) {
  const { conteudos, criar, atualizar, excluir, empresaId } = useDadosEmpresa()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const [excluindo, setExcluindo] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [valores, setValores] = useState<Valores>(() =>
    registro
      ? {
          titulo: registro.titulo,
          descricao: registro.descricao,
          responsavel: registro.responsavel,
          prazo: registro.prazo,
          prioridade: registro.prioridade,
          status: registro.status,
          conteudoId: registro.conteudoId,
        }
      : {
          titulo: '',
          descricao: '',
          responsavel: null,
          prazo: '',
          prioridade: 'Média',
          status: statusInicial ?? 'A fazer',
          conteudoId: null,
        },
  )
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({})
  const set = <K extends keyof Valores>(k: K, v: Valores[K]) => setValores((s) => ({ ...s, [k]: v }))

  const conteudosOrdenados = [...conteudos].sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))

  function salvar(ev: FormEvent) {
    ev.preventDefault()
    const e: typeof erros = {}
    if (!valores.titulo.trim()) e.titulo = 'Informe o título da atividade.'
    if (valores.prazo && !ehDataValida(valores.prazo)) e.prazo = 'Informe uma data válida.'
    setErros(e)
    if (Object.keys(e).length) return focarPrimeiroErro(formRef.current)
    const dados = { ...valores, titulo: valores.titulo.trim(), descricao: valores.descricao.trim() }
    enviar(async () => {
      if (registro) {
        await atualizar('atividades', registro.id, dados)
        feedback.sucesso('Atividade salva com sucesso.')
      } else {
        await criar('atividades', dados)
        feedback.sucesso('Atividade criada com sucesso.')
      }
      onFechar()
    })
  }

  async function aoExcluir() {
    if (!registro) return
    const ok = await feedback.confirmar({
      titulo: 'Excluir atividade?',
      mensagem: `“${registro.titulo}” será excluída permanentemente. Esta ação não pode ser desfeita.`,
    })
    if (!ok) return
    setExcluindo(true)
    try {
      await excluir('atividades', registro.id)
      feedback.sucesso('Atividade excluída.')
      onFechar()
    } catch (e) {
      feedback.erro(mensagemDeErro(e))
      setExcluindo(false)
    }
  }

  const formId = 'form-atividade'
  const ocupado = salvando || excluindo
  return (
    <Dialog
      aberto
      titulo={registro ? 'Editar atividade' : 'Adicionar atividade'}
      descricao={nomeDaEmpresa(empresaId)}
      onFechar={onFechar}
      bloqueado={ocupado}
      rodape={
        <>
          {registro && (
            <button type="button" className="btn-ghost mr-auto text-danger" onClick={aoExcluir} disabled={ocupado}>
              <Trash2 className="size-4" aria-hidden />
              {excluindo ? 'Excluindo…' : 'Excluir'}
            </button>
          )}
          <BotoesFormulario formId={formId} salvando={salvando} onCancelar={onFechar} />
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={salvar} noValidate className="space-y-4">
        {erro && <AlertaErro mensagem={erro} />}
        <AvisoObrigatorios />
        <Campo rotulo="Título" obrigatorio erro={erros.titulo}>
          {(p) => (
            <input
              {...p}
              className="field-control"
              value={valores.titulo}
              maxLength={140}
              onChange={(e) => set('titulo', e.target.value)}
              data-autofocus
            />
          )}
        </Campo>
        <Campo rotulo="Descrição">
          {(p) => (
            <textarea
              {...p}
              rows={3}
              className="field-control"
              value={valores.descricao}
              onChange={(e) => set('descricao', e.target.value)}
            />
          )}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Responsável">
            {(p) => (
              <SelectResponsavel {...p} valor={valores.responsavel} onChange={(v) => set('responsavel', v)} />
            )}
          </Campo>
          <Campo rotulo="Prazo" erro={erros.prazo} dica="Opcional">
            {(p) => (
              <input
                {...p}
                type="date"
                className="field-control"
                value={valores.prazo}
                onChange={(e) => set('prazo', e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo="Prioridade" obrigatorio>
            {(p) => (
              <select
                {...p}
                className="field-control"
                value={valores.prioridade}
                onChange={(e) => set('prioridade', e.target.value as Prioridade)}
              >
                {PRIORIDADES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Status" obrigatorio>
            {(p) => (
              <select
                {...p}
                className="field-control"
                value={valores.status}
                onChange={(e) => set('status', e.target.value as StatusAtividade)}
              >
                {STATUS_ATIVIDADE.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <Campo rotulo="Conteúdo vinculado" dica="Opcional. Liga esta atividade a um conteúdo do cronograma.">
          {(p) => (
            <select
              {...p}
              className="field-control"
              value={valores.conteudoId ?? ''}
              onChange={(e) => set('conteudoId', e.target.value || null)}
            >
              <option value="">Nenhum</option>
              {conteudosOrdenados.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatarData(c.data)} · {c.titulo}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </form>
    </Dialog>
  )
}
