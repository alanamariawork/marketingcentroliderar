import { useRef, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { FORMATOS, RESPONSAVEIS, STATUS_CONTEUDO } from '../data/constants'
import type { Conteudo, Formato, NovoRegistro, ResponsavelId, StatusConteudo } from '../data/types'
import { ehDataValida, ehHorarioValido, hoje } from '../lib/dates'
import { ehUrlValida } from '../lib/format'
import { useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'
import { nomeDaEmpresa } from '../lib/rotas'

type Valores = Pick<
  NovoRegistro<Conteudo>,
  'titulo' | 'contaId' | 'formato' | 'data' | 'horario' | 'responsavel' | 'status' | 'legenda' | 'linkMaterial'
>

export function FormConteudo({
  registro,
  dataInicial,
  onFechar,
}: {
  registro?: Conteudo
  dataInicial?: string
  onFechar: () => void
}) {
  const { contas, criar, atualizar, empresaId } = useDadosEmpresa()
  const { abrir } = useModais()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const formRef = useRef<HTMLFormElement>(null)
  const [valores, setValores] = useState<Valores>(() =>
    registro
      ? {
          titulo: registro.titulo,
          contaId: registro.contaId,
          formato: registro.formato,
          data: registro.data,
          horario: registro.horario,
          responsavel: registro.responsavel,
          status: registro.status,
          legenda: registro.legenda,
          linkMaterial: registro.linkMaterial,
        }
      : {
          titulo: '',
          contaId: contas.length === 1 ? contas[0].id : '',
          formato: 'Post',
          data: dataInicial ?? hoje(),
          horario: '09:00',
          responsavel: null,
          status: 'Ideia',
          legenda: '',
          linkMaterial: '',
        },
  )
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({})
  const set = <K extends keyof Valores>(k: K, v: Valores[K]) => setValores((s) => ({ ...s, [k]: v }))

  function validar() {
    const e: typeof erros = {}
    if (!valores.titulo.trim()) e.titulo = 'Informe o título do conteúdo.'
    if (!valores.contaId || !contas.some((c) => c.id === valores.contaId)) e.contaId = 'Selecione a conta.'
    if (!ehDataValida(valores.data)) e.data = 'Informe uma data válida.'
    if (!ehHorarioValido(valores.horario)) e.horario = 'Informe um horário válido (HH:mm).'
    if (valores.linkMaterial.trim() && !ehUrlValida(valores.linkMaterial.trim()))
      e.linkMaterial = 'Informe um link completo, começando com https://'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function salvar(ev: FormEvent) {
    ev.preventDefault()
    if (!validar()) return focarPrimeiroErro(formRef.current)
    const dados = { ...valores, titulo: valores.titulo.trim(), linkMaterial: valores.linkMaterial.trim() }
    enviar(async () => {
      if (registro) await atualizar('conteudos', registro.id, dados)
      else await criar('conteudos', { ...dados, metricas: null, metricasRegistradasEm: null })
      feedback.sucesso('Conteúdo salvo com sucesso.')
      onFechar()
    })
  }

  const formId = 'form-conteudo'
  return (
    <Dialog
      aberto
      titulo={registro ? 'Editar conteúdo' : 'Adicionar conteúdo'}
      descricao={nomeDaEmpresa(empresaId)}
      onFechar={onFechar}
      bloqueado={salvando}
      rodape={<BotoesFormulario formId={formId} salvando={salvando} onCancelar={onFechar} />}
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
        <Campo
          rotulo="Conta"
          obrigatorio
          erro={erros.contaId}
          dica={contas.length === 0 ? 'Nenhuma conta cadastrada. Adicione uma conta para começar.' : undefined}
        >
          {(p) => (
            <div className="flex gap-2">
              <select
                {...p}
                className="field-control"
                value={valores.contaId}
                onChange={(e) => set('contaId', e.target.value)}
              >
                <option value="">Selecione…</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} · {c.plataforma}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => abrir({ tipo: 'conta', aoSalvar: (c) => set('contaId', c.id) })}
              >
                <Plus className="size-4" aria-hidden />
                Adicionar conta
              </button>
            </div>
          )}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Formato" obrigatorio>
            {(p) => (
              <select
                {...p}
                className="field-control"
                value={valores.formato}
                onChange={(e) => set('formato', e.target.value as Formato)}
              >
                {FORMATOS.map((f) => (
                  <option key={f}>{f}</option>
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
                onChange={(e) => set('status', e.target.value as StatusConteudo)}
              >
                {STATUS_CONTEUDO.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Data" obrigatorio erro={erros.data}>
            {(p) => (
              <input
                {...p}
                type="date"
                className="field-control"
                value={valores.data}
                onChange={(e) => set('data', e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo="Horário" obrigatorio erro={erros.horario} dica="Horário de Fortaleza">
            {(p) => (
              <input
                {...p}
                type="time"
                className="field-control"
                value={valores.horario}
                onChange={(e) => set('horario', e.target.value)}
              />
            )}
          </Campo>
        </div>
        <Campo rotulo="Responsável">
          {(p) => (
            <SelectResponsavel {...p} valor={valores.responsavel} onChange={(v) => set('responsavel', v)} />
          )}
        </Campo>
        <Campo rotulo="Legenda">
          {(p) => (
            <textarea
              {...p}
              rows={4}
              className="field-control"
              value={valores.legenda}
              onChange={(e) => set('legenda', e.target.value)}
            />
          )}
        </Campo>
        <Campo rotulo="Link do material" erro={erros.linkMaterial} dica="Ex.: link da arte, do vídeo ou da pasta.">
          {(p) => (
            <input
              {...p}
              type="url"
              inputMode="url"
              placeholder="https://"
              className="field-control"
              value={valores.linkMaterial}
              onChange={(e) => set('linkMaterial', e.target.value)}
            />
          )}
        </Campo>
      </form>
    </Dialog>
  )
}

export function SelectResponsavel({
  valor,
  onChange,
  ...p
}: {
  valor: ResponsavelId
  onChange: (v: ResponsavelId) => void
  id: string
}) {
  return (
    <select
      {...p}
      className="field-control"
      value={valor ?? ''}
      onChange={(e) => onChange((e.target.value || null) as ResponsavelId)}
    >
      {RESPONSAVEIS.map((r) => (
        <option key={r.id ?? 'nenhum'} value={r.id ?? ''}>
          {r.nome}
        </option>
      ))}
    </select>
  )
}
