import { useRef, useState, type FormEvent } from 'react'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { CAMPOS_METRICAS } from '../data/constants'
import type { Metricas } from '../data/types'
import { formatarData } from '../lib/dates'
import { useDadosEmpresa } from '../state/DadosEmpresa'

type Textos = Record<keyof Metricas, string>

/**
 * Campos vazios são gravados como `null` ("não preenchido"); "0" é gravado
 * como zero. As duas situações aparecem de forma diferente nas telas.
 */
export function FormResultados({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { conteudos, contas, atualizar } = useDadosEmpresa()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const formRef = useRef<HTMLFormElement>(null)
  const c = conteudos.find((x) => x.id === id)
  const [textos, setTextos] = useState<Textos>(() => {
    const t = {} as Textos
    for (const { chave } of CAMPOS_METRICAS) {
      const v = c?.metricas?.[chave]
      t[chave] = v === null || v === undefined ? '' : String(v)
    }
    return t
  })
  const [erros, setErros] = useState<Partial<Textos>>({})

  if (!c) {
    return (
      <Dialog aberto titulo="Conteúdo não encontrado" onFechar={onFechar}>
        <p className="text-sm text-ink-muted">Este conteúdo não existe mais.</p>
      </Dialog>
    )
  }
  const conta = contas.find((x) => x.id === c.contaId)

  function salvar(ev: FormEvent) {
    ev.preventDefault()
    const e: Partial<Textos> = {}
    const metricas = {} as Metricas
    for (const { chave } of CAMPOS_METRICAS) {
      const t = textos[chave].trim().replace(/\./g, '')
      if (t === '') metricas[chave] = null
      else if (!/^\d+$/.test(t)) e[chave] = 'Use um número inteiro igual ou maior que zero.'
      else metricas[chave] = Number(t)
    }
    setErros(e)
    if (Object.keys(e).length) return focarPrimeiroErro(formRef.current)
    enviar(async () => {
      await atualizar('conteudos', c!.id, { metricas, metricasRegistradasEm: new Date().toISOString() })
      feedback.sucesso('Resultados registrados com sucesso.')
      onFechar()
    })
  }

  const formId = 'form-resultados'
  return (
    <Dialog
      aberto
      titulo="Registrar resultados"
      descricao={`${c.titulo} · ${conta?.nome ?? 'Conta removida'} · ${formatarData(c.data)}`}
      onFechar={onFechar}
      bloqueado={salvando}
      rodape={<BotoesFormulario formId={formId} salvando={salvando} onCancelar={onFechar} />}
    >
      <form id={formId} ref={formRef} onSubmit={salvar} noValidate>
        {erro && <AlertaErro mensagem={erro} />}
        <p className="mb-4 text-sm text-ink-muted">
          Deixe em branco o que ainda não foi medido — o campo fica como <strong>não preenchido</strong>. Digite{' '}
          <strong>0</strong> apenas quando o resultado for realmente zero.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS_METRICAS.map(({ chave, rotulo }, i) => (
            <Campo key={chave} rotulo={rotulo} erro={erros[chave]}>
              {(p) => (
                <input
                  {...p}
                  inputMode="numeric"
                  className="field-control"
                  placeholder="Não preenchido"
                  value={textos[chave]}
                  onChange={(e) => setTextos((s) => ({ ...s, [chave]: e.target.value }))}
                  {...(i === 0 ? { 'data-autofocus': true } : {})}
                />
              )}
            </Campo>
          ))}
        </div>
      </form>
    </Dialog>
  )
}
