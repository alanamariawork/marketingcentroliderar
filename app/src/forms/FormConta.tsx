import { useRef, useState, type FormEvent } from 'react'
import { nomeEmpresa, PLATAFORMAS_CONTA } from '../data/constants'
import type { EmpresaId } from '../data/types'
import { Dialog } from '../components/Dialog'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { AlertaErro } from '../components/Estados'
import { useSessao } from '../state/Sessao'

/** Conta = perfil ou canal de comunicação (não é um usuário do sistema). */
export function FormConta({ empresaId, onFechar }: { empresaId: EmpresaId; onFechar: () => void }) {
  const { criarConta, contas } = useSessao()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const form = useRef<HTMLFormElement>(null)
  const [nome, setNome] = useState('')
  const [plataforma, setPlataforma] = useState(PLATAFORMAS_CONTA[0])
  const [perfil, setPerfil] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Record<string, string> = {}
    if (!nome.trim()) novos.nome = 'Informe o nome da conta.'
    else if (contas.some((c) => c.empresaId === empresaId && c.nome.trim().toLowerCase() === nome.trim().toLowerCase())) {
      novos.nome = 'Já existe uma conta com este nome nesta empresa.'
    }
    setErros(novos)
    if (Object.keys(novos).length) return focarPrimeiroErro(form.current)
    enviar(() => {
      criarConta({ empresaId, nome: nome.trim(), plataforma, perfil: perfil.trim() })
      feedback.sucesso(`Conta “${nome.trim()}” adicionada nesta sessão. Ela já aparece nas opções de Insights.`)
      onFechar()
    })
  }

  return (
    <Dialog
      aberto
      variante="central"
      titulo="Adicionar conta"
      descricao={`${nomeEmpresa(empresaId)} · perfil ou canal de comunicação`}
      onFechar={onFechar}
      bloqueado={salvando}
      rodape={<BotoesFormulario formId="form-conta" salvando={salvando} onCancelar={onFechar} />}
    >
      <form id="form-conta" ref={form} onSubmit={aoEnviar} noValidate className="space-y-4">
        <AvisoObrigatorios />
        {erro && <AlertaErro mensagem={erro} />}
        <Campo rotulo="Nome da conta" obrigatorio erro={erros.nome} dica="Ex.: Smart Games — Instagram">
          {(p) => <input {...p} data-autofocus className="field-control" value={nome} onChange={(e) => setNome(e.target.value)} />}
        </Campo>
        <Campo rotulo="Plataforma">
          {(p) => (
            <select {...p} className="field-control" value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
              {PLATAFORMAS_CONTA.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Perfil ou endereço" dica="Opcional. Ex.: @perfil ou link do canal">
          {(p) => <input {...p} className="field-control" value={perfil} onChange={(e) => setPerfil(e.target.value)} />}
        </Campo>
        <p className="text-xs text-ink-muted">
          Nesta etapa, as contas adicionadas ficam disponíveis enquanto a aba estiver aberta.
        </p>
      </form>
    </Dialog>
  )
}
