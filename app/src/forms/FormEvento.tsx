import { useRef, useState, type FormEvent } from 'react'
import type { EventoCampanha } from '../data/types'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { useCriativos } from '../state/Criativos'
import { gerarId } from '../lib/id'

/** Cadastro de evento ou campanha (grupo dentro de Criativos › Produção). */
export function FormEvento({ id, onFechar }: { id?: string; onFechar: () => void }) {
  const { eventos, salvarEvento } = useCriativos()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const form = useRef<HTMLFormElement>(null)
  const atual = eventos.find((e) => e.id === id)
  const [nome, setNome] = useState(atual?.nome ?? '')
  const [tipo, setTipo] = useState<EventoCampanha['tipo']>(atual?.tipo ?? 'Evento')
  const [data, setData] = useState(atual?.data ?? '')
  const [observacoes, setObservacoes] = useState(atual?.observacoes ?? '')
  const [erroNome, setErroNome] = useState('')

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const n = nome.trim()
    const repetido = eventos.some((x) => x.id !== id && x.nome.trim().toLowerCase() === n.toLowerCase())
    const msg = !n ? 'Informe o nome.' : repetido ? 'Já existe um evento ou campanha com este nome.' : ''
    setErroNome(msg)
    if (msg) return focarPrimeiroErro(form.current)
    enviar(async () => {
      await salvarEvento({
        id: atual?.id ?? gerarId(),
        empresaId: 'centro-liderar',
        nome: n,
        tipo,
        data,
        observacoes: observacoes.trim(),
        criadoEm: atual?.criadoEm ?? new Date().toISOString(),
      })
      feedback.sucesso(atual ? `${tipo} atualizado.` : `${tipo} criado em Produção.`)
      onFechar()
    })
  }

  return (
    <Dialog
      aberto
      titulo={atual ? `Editar ${atual.tipo.toLowerCase()}` : 'Novo evento ou campanha'}
      descricao="Grupo de criativos dentro de Produção. Não cria pastas no Google Drive."
      onFechar={onFechar}
      bloqueado={salvando}
      rodape={<BotoesFormulario formId="form-evento" salvando={salvando} onCancelar={onFechar} />}
    >
      <form id="form-evento" ref={form} onSubmit={aoEnviar} noValidate className="space-y-4">
        <AvisoObrigatorios />
        {erro && <AlertaErro mensagem={erro} />}
        <Campo rotulo="Nome" obrigatorio erro={erroNome}>
          {(p) => <input {...p} className="field-control" value={nome} onChange={(e) => setNome(e.target.value)} />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Tipo">
            {(p) => (
              <select {...p} className="field-control" value={tipo} onChange={(e) => setTipo(e.target.value as EventoCampanha['tipo'])}>
                <option>Evento</option>
                <option>Campanha</option>
              </select>
            )}
          </Campo>
          <Campo rotulo="Data" dica="Opcional.">
            {(p) => <input {...p} type="date" className="field-control" value={data} onChange={(e) => setData(e.target.value)} />}
          </Campo>
        </div>
        <Campo rotulo="Observações">
          {(p) => <textarea {...p} rows={3} className="field-control" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />}
        </Campo>
      </form>
    </Dialog>
  )
}
