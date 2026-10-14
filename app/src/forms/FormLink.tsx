import { useRef, useState, type FormEvent } from 'react'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { TIPOS_LINK } from '../data/constants'
import type { LinkDrive, NovoRegistro, TipoLink } from '../data/types'
import { ehUrlValida } from '../lib/format'
import { nomeDaEmpresa } from '../lib/rotas'
import { useDadosEmpresa } from '../state/DadosEmpresa'

type Valores = NovoRegistro<LinkDrive>

export function FormLink({ registro, onFechar }: { registro?: LinkDrive; onFechar: () => void }) {
  const { criar, atualizar, empresaId } = useDadosEmpresa()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const formRef = useRef<HTMLFormElement>(null)
  const [valores, setValores] = useState<Valores>(
    registro
      ? { nome: registro.nome, tipo: registro.tipo, descricao: registro.descricao, url: registro.url }
      : { nome: '', tipo: 'Pasta', descricao: '', url: '' },
  )
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({})
  const set = <K extends keyof Valores>(k: K, v: Valores[K]) => setValores((s) => ({ ...s, [k]: v }))

  function salvar(ev: FormEvent) {
    ev.preventDefault()
    const e: typeof erros = {}
    if (!valores.nome.trim()) e.nome = 'Informe o nome do arquivo ou pasta.'
    if (!valores.url.trim()) e.url = 'Informe o link.'
    else if (!ehUrlValida(valores.url.trim())) e.url = 'Informe um link completo, começando com https://'
    setErros(e)
    if (Object.keys(e).length) return focarPrimeiroErro(formRef.current)
    const dados = {
      ...valores,
      nome: valores.nome.trim(),
      descricao: valores.descricao.trim(),
      url: valores.url.trim(),
    }
    enviar(async () => {
      if (registro) {
        await atualizar('links', registro.id, dados)
        feedback.sucesso('Link salvo com sucesso.')
      } else {
        await criar('links', dados)
        feedback.sucesso('Link adicionado com sucesso.')
      }
      onFechar()
    })
  }

  const formId = 'form-link'
  return (
    <Dialog
      aberto
      titulo={registro ? 'Editar link' : 'Adicionar link'}
      descricao={nomeDaEmpresa(empresaId)}
      onFechar={onFechar}
      bloqueado={salvando}
      rodape={<BotoesFormulario formId={formId} salvando={salvando} onCancelar={onFechar} />}
    >
      <form id={formId} ref={formRef} onSubmit={salvar} noValidate className="space-y-4">
        {erro && <AlertaErro mensagem={erro} />}
        <AvisoObrigatorios />
        <Campo rotulo="Nome" obrigatorio erro={erros.nome}>
          {(p) => (
            <input
              {...p}
              className="field-control"
              value={valores.nome}
              maxLength={120}
              onChange={(e) => set('nome', e.target.value)}
              data-autofocus
            />
          )}
        </Campo>
        <Campo rotulo="Tipo" obrigatorio>
          {(p) => (
            <select
              {...p}
              className="field-control"
              value={valores.tipo}
              onChange={(e) => set('tipo', e.target.value as TipoLink)}
            >
              {TIPOS_LINK.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Link" obrigatorio erro={erros.url} dica="Cole o link de compartilhamento do arquivo ou pasta.">
          {(p) => (
            <input
              {...p}
              type="url"
              inputMode="url"
              placeholder="https://"
              className="field-control"
              value={valores.url}
              onChange={(e) => set('url', e.target.value)}
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
      </form>
    </Dialog>
  )
}
