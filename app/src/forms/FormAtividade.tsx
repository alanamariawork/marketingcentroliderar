import { useRef, useState, type FormEvent } from 'react'
import { FORMATOS_POSTAGEM, nomeEmpresa, RESPONSAVEIS_ATRIBUIVEIS } from '../data/constants'
import type { EmpresaId, FormatoPostagem, Responsavel } from '../data/types'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { useSessao } from '../state/Sessao'
import { EditorMaterial, useRascunhoMaterial } from './Material'

/** "Adicionar atividade" (e "Adicionar conteúdo" no Cronograma): mesmos campos da referência. */
export function FormAtividade({
  empresaId,
  titulo: tituloModal,
  dataInicial = '',
  onFechar,
}: {
  empresaId: EmpresaId
  titulo: string
  dataInicial?: string
  onFechar: () => void
}) {
  const { criarAtividade } = useSessao()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const form = useRef<HTMLFormElement>(null)
  const material = useRascunhoMaterial(null)
  const [titulo, setTitulo] = useState('')
  const [responsavel, setResponsavel] = useState<Responsavel>('Carlos')
  const [formato, setFormato] = useState<FormatoPostagem | ''>('')
  const [data, setData] = useState(dataInicial)
  const [hora, setHora] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Record<string, string> = { ...material.validar() }
    if (!titulo.trim()) novos.titulo = 'Informe o título.'
    if (!formato) novos.formato = 'Selecione o formato de postagem.'
    if (hora && !data) novos.data = 'Informe a data da postagem para definir o horário.'
    setErros(novos)
    if (Object.keys(novos).length) {
      focarPrimeiroErro(form.current)
      return
    }
    enviar(() => {
      criarAtividade({
        empresaId,
        titulo: titulo.trim(),
        status: 'Em produção',
        formato: formato as FormatoPostagem,
        responsavel,
        dataPostagem: data,
        horaPostagem: hora,
        versao: 1,
        material: material.confirmar(),
        historico: [],
        demonstrativa: false,
      })
      feedback.sucesso('Atividade e material salvos nesta sessão. Abra a entrega para visualizar o material.')
      onFechar()
    })
  }

  return (
    <Dialog
      aberto
      titulo={tituloModal}
      descricao={`${nomeEmpresa(empresaId)} · fica disponível enquanto esta aba estiver aberta`}
      onFechar={onFechar}
      bloqueado={salvando}
      rodape={<BotoesFormulario formId="form-atividade" salvando={salvando} onCancelar={onFechar} />}
    >
      <form id="form-atividade" ref={form} onSubmit={aoEnviar} noValidate className="space-y-4">
        <AvisoObrigatorios />
        {erro && <AlertaErro mensagem={erro} />}
        <Campo rotulo="Título" obrigatorio erro={erros.titulo}>
          {(p) => <input {...p} data-autofocus className="field-control" value={titulo} onChange={(e) => setTitulo(e.target.value)} />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Empresa">
            {(p) => <input {...p} className="field-control bg-surface-muted" value={nomeEmpresa(empresaId)} readOnly />}
          </Campo>
          <Campo rotulo="Responsável">
            {(p) => (
              <select {...p} className="field-control" value={responsavel} onChange={(e) => setResponsavel(e.target.value as Responsavel)}>
                {RESPONSAVEIS_ATRIBUIVEIS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <Campo rotulo="Formato de postagem" obrigatorio erro={erros.formato}>
          {(p) => (
            <select {...p} className="field-control" value={formato} onChange={(e) => setFormato(e.target.value as FormatoPostagem)}>
              <option value="">Selecione o formato</option>
              {FORMATOS_POSTAGEM.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          )}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data da postagem" erro={erros.data}>
            {(p) => <input {...p} type="date" className="field-control" value={data} onChange={(e) => setData(e.target.value)} />}
          </Campo>
          <Campo rotulo="Hora da postagem">
            {(p) => <input {...p} type="time" className="field-control" value={hora} onChange={(e) => setHora(e.target.value)} />}
          </Campo>
        </div>
        <p className="-mt-2 text-xs text-ink-muted">
          Horário de Fortaleza. Data planejada: não publica automaticamente. Sem data, a atividade fica em “Sem data
          definida” no Cronograma.
        </p>
        <EditorMaterial r={material} erros={erros} desabilitado={salvando} />
      </form>
    </Dialog>
  )
}
