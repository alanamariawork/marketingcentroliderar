import { useId, useRef, useState, type ReactNode } from 'react'
import { mensagemDeErro } from '../state/DadosEmpresa'

export interface PropsControle {
  id: string
  required?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Campo com rótulo, marcação de obrigatório, dica e mensagem de erro ligados por ARIA. */
export function Campo({
  rotulo,
  obrigatorio,
  erro,
  dica,
  className,
  children,
}: {
  rotulo: string
  obrigatorio?: boolean
  erro?: string
  dica?: string
  className?: string
  children: (props: PropsControle) => ReactNode
}) {
  const id = useId()
  const idDica = `${id}-dica`
  const idErro = `${id}-erro`
  const descritos = [dica && idDica, erro && idErro].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-soft">
        {rotulo}
        {obrigatorio && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
        {obrigatorio && <span className="sr-only"> (obrigatório)</span>}
      </label>
      {children({ id, required: obrigatorio, 'aria-invalid': !!erro, 'aria-describedby': descritos })}
      {dica && !erro && (
        <p id={idDica} className="mt-1 text-xs text-ink-muted">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="mt-1 text-xs font-medium text-danger">
          {erro}
        </p>
      )}
    </div>
  )
}

export function AvisoObrigatorios() {
  return (
    <p className="mb-4 text-xs text-ink-muted">
      Campos marcados com <span className="text-danger">*</span> são obrigatórios.
    </p>
  )
}

/**
 * Controla o envio: bloqueia envios duplicados, expõe "salvando" e guarda a
 * mensagem de erro. Só chama `aoConcluir` depois que a gravação terminou.
 */
export function useEnvio() {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const emAndamento = useRef(false)

  async function enviar(acao: () => Promise<void>) {
    if (emAndamento.current) return
    emAndamento.current = true
    setSalvando(true)
    setErro(null)
    try {
      await acao()
    } catch (e) {
      setErro(mensagemDeErro(e))
    } finally {
      emAndamento.current = false
      setSalvando(false)
    }
  }

  return { salvando, erro, enviar }
}

/** Move o foco para o primeiro campo inválido do formulário. */
export function focarPrimeiroErro(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
}

export function BotoesFormulario({
  formId,
  salvando,
  onCancelar,
  rotulo = 'Salvar',
}: {
  formId: string
  salvando: boolean
  onCancelar: () => void
  rotulo?: string
}) {
  return (
    <>
      <button type="button" className="btn-secondary" onClick={onCancelar} disabled={salvando}>
        Cancelar
      </button>
      <button type="submit" form={formId} className="btn-primary min-w-24" disabled={salvando} aria-busy={salvando}>
        {salvando ? 'Salvando…' : rotulo}
      </button>
    </>
  )
}
