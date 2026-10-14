import { useRef, useState, type FormEvent } from 'react'
import { AtSign, Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { Etiqueta } from '../components/Badges'
import { AlertaErro, EstadoVazio } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { PLATAFORMAS } from '../data/constants'
import type { Conta, NovoRegistro, Plataforma } from '../data/types'
import { ehUrlValida } from '../lib/format'
import { nomeDaEmpresa } from '../lib/rotas'
import { mensagemDeErro, useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'

type Valores = NovoRegistro<Conta>

export function validarPerfil(valor: string): string | undefined {
  const v = valor.trim()
  if (!v) return 'Informe o usuário ou a URL do perfil.'
  if (/^https?:\/\//i.test(v)) return ehUrlValida(v) ? undefined : 'A URL informada não é válida.'
  if (/\s/.test(v)) return 'Use um usuário sem espaços (ex.: @grupomendes) ou uma URL completa (https://…).'
  return undefined
}

export function FormConta({
  registro,
  aoSalvar,
  onFechar,
}: {
  registro?: Conta
  aoSalvar?: (c: Conta) => void
  onFechar: () => void
}) {
  const { criar, atualizar, empresaId } = useDadosEmpresa()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const formRef = useRef<HTMLFormElement>(null)
  const [valores, setValores] = useState<Valores>(
    registro
      ? { nome: registro.nome, plataforma: registro.plataforma, perfil: registro.perfil }
      : { nome: '', plataforma: 'Instagram', perfil: '' },
  )
  const [erros, setErros] = useState<Partial<Record<keyof Valores, string>>>({})
  const set = <K extends keyof Valores>(k: K, v: Valores[K]) => setValores((s) => ({ ...s, [k]: v }))

  function salvar(ev: FormEvent) {
    ev.preventDefault()
    const e: typeof erros = {}
    if (!valores.nome.trim()) e.nome = 'Informe o nome da conta.'
    const perfil = validarPerfil(valores.perfil)
    if (perfil) e.perfil = perfil
    setErros(e)
    if (Object.keys(e).length) return focarPrimeiroErro(formRef.current)
    const dados = { ...valores, nome: valores.nome.trim(), perfil: valores.perfil.trim() }
    enviar(async () => {
      if (registro) {
        await atualizar('contas', registro.id, dados)
        feedback.sucesso('Conta atualizada com sucesso.')
      } else {
        const nova = await criar('contas', dados)
        feedback.sucesso('Conta adicionada com sucesso.')
        aoSalvar?.(nova)
      }
      onFechar()
    })
  }

  const formId = 'form-conta'
  return (
    <Dialog
      aberto
      titulo={registro ? 'Editar conta' : 'Adicionar conta'}
      descricao={`Perfil ou canal de comunicação da ${nomeDaEmpresa(empresaId)}`}
      onFechar={onFechar}
      bloqueado={salvando}
      variante="central"
      largura="max-w-md"
      rodape={<BotoesFormulario formId={formId} salvando={salvando} onCancelar={onFechar} />}
    >
      <form id={formId} ref={formRef} onSubmit={salvar} noValidate className="space-y-4">
        {erro && <AlertaErro mensagem={erro} />}
        <AvisoObrigatorios />
        <Campo rotulo="Nome" obrigatorio erro={erros.nome} dica="Ex.: Instagram oficial">
          {(p) => (
            <input
              {...p}
              className="field-control"
              value={valores.nome}
              maxLength={80}
              onChange={(e) => set('nome', e.target.value)}
              data-autofocus
            />
          )}
        </Campo>
        <Campo rotulo="Plataforma" obrigatorio>
          {(p) => (
            <select
              {...p}
              className="field-control"
              value={valores.plataforma}
              onChange={(e) => set('plataforma', e.target.value as Plataforma)}
            >
              {PLATAFORMAS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo
          rotulo="Usuário ou URL do perfil"
          obrigatorio
          erro={erros.perfil}
          dica="Ex.: @grupomendes ou https://instagram.com/grupomendes"
        >
          {(p) => (
            <input
              {...p}
              className="field-control"
              value={valores.perfil}
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => set('perfil', e.target.value)}
            />
          )}
        </Campo>
      </form>
    </Dialog>
  )
}

/** Lista de contas da empresa, com cadastro, edição e exclusão. */
export function PainelContas({ onFechar }: { onFechar: () => void }) {
  const { contas, conteudos, excluir, empresaId } = useDadosEmpresa()
  const { abrir } = useModais()
  const feedback = useFeedback()
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  async function aoExcluir(c: Conta) {
    const ok = await feedback.confirmar({
      titulo: 'Excluir conta?',
      mensagem: `A conta “${c.nome}” será removida desta empresa. Esta ação não pode ser desfeita.`,
    })
    if (!ok) return
    setExcluindoId(c.id)
    try {
      await excluir('contas', c.id)
      feedback.sucesso('Conta excluída.')
    } catch (e) {
      feedback.erro(mensagemDeErro(e))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <Dialog
      aberto
      titulo="Contas"
      descricao={`Perfis e canais de comunicação da ${nomeDaEmpresa(empresaId)}`}
      onFechar={onFechar}
      rodape={
        <>
          <button type="button" className="btn-secondary" onClick={onFechar}>
            Fechar
          </button>
          <button type="button" className="btn-primary" onClick={() => abrir({ tipo: 'conta' })}>
            <Plus className="size-4" aria-hidden />
            Adicionar conta
          </button>
        </>
      }
    >
      {contas.length === 0 ? (
        <EstadoVazio
          icone={AtSign}
          titulo="Nenhuma conta cadastrada. Adicione uma conta para começar."
          acao="Adicionar conta"
          onAcao={() => abrir({ tipo: 'conta' })}
        />
      ) : (
        <ul className="divide-y divide-line">
          {contas.map((c) => {
            const qtd = conteudos.filter((x) => x.contaId === c.id).length
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{c.nome}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                    <Etiqueta>{c.plataforma}</Etiqueta>
                    <span className="truncate">{c.perfil}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {qtd === 0 ? 'Nenhum conteúdo' : qtd === 1 ? '1 conteúdo' : `${qtd} conteúdos`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost p-2"
                  onClick={() => abrir({ tipo: 'conta', registro: c })}
                  aria-label={`Editar conta ${c.nome}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn-ghost p-2 text-danger"
                  onClick={() => aoExcluir(c)}
                  disabled={excluindoId === c.id}
                  aria-label={`Excluir conta ${c.nome}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Dialog>
  )
}
