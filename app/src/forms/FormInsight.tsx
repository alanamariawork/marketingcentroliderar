import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import {
  CAMPOS_METRICAS,
  CONTAS_CENTRO_LIDERAR,
  ETAPAS_FUNIL,
  FORMATOS_INSIGHT,
  nomeEmpresa,
  rotuloConta,
  TIPOS_INSIGHT,
} from '../data/constants'
import type { ChaveMetrica, EmpresaId, Metricas, RegistroInsight, RegraScore } from '../data/types'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { Nota } from '../components/Selos'
import { useInsights } from '../state/Insights'
import { gerarId, useDadosDaEmpresa } from '../state/Sessao'
import { calcularScore, contasDaEmpresa, etapaFunil, FORMULAS, validarInsight } from '../lib/insights'
import { hoje } from '../lib/dates'
import { formatarDecimal } from '../lib/format'

type Texto = Record<string, string>

const paraTexto = (v: number | null | undefined) => (v == null ? '' : String(v))
const paraNumero = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')))

/** "Adicionar dados" e "Registrar / editar" resultados de uma publicação. */
export function FormInsight({ empresaId, id, onFechar }: { empresaId: EmpresaId; id?: string; onFechar: () => void }) {
  const company = nomeEmpresa(empresaId)
  const ins = useInsights()
  const { contas } = useDadosDaEmpresa(empresaId)
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const form = useRef<HTMLFormElement>(null)
  const existente = id ? ins.registros.find((x) => x.id === id && x.company === company) : undefined
  const filtros = ins.filtrosDe(company)
  const dia = hoje()

  // Valores iniciais da referência: regra Liderar para Centro Liderar, MQA para a conta MQA.
  const [campos, setCampos] = useState<Texto>(() => {
    const x = existente
    const regraPadrao =
      filtros.account === 'MQA' ? 'mqa' : (!filtros.account || filtros.account === 'Centro Liderar') && company === 'Centro Liderar' ? 'liderar' : ''
    return {
      account: x?.account ?? (filtros.account || (company === 'Centro Liderar' ? 'Centro Liderar' : '')),
      date: x?.date ?? dia,
      type: x?.type ?? 'Feed',
      funnel: x ? etapaFunil(x.funnel) : '',
      format: x?.format ?? '',
      category: x?.category ?? 'Orgânico',
      description: x?.description ?? '',
      link: x?.link ?? '',
      collected: x?.collected ?? '',
      rule: x?.rule ?? regraPadrao,
      notes: x?.notes ?? '',
      ...Object.fromEntries(CAMPOS_METRICAS.map(([k]) => [k, paraTexto(x?.[k])])),
    }
  })
  const [erros, setErros] = useState<Texto>({})

  const metricas = useMemo<Metricas>(
    () => Object.fromEntries(CAMPOS_METRICAS.map(([k]) => [k, paraNumero(campos[k])])) as Metricas,
    [campos],
  )
  const score = calcularScore({ ...metricas, rule: campos.rule as RegraScore })
  const contasOpcoes = contasDaEmpresa(
    company,
    ins.registros,
    company === 'Centro Liderar' ? CONTAS_CENTRO_LIDERAR.map((c) => c.id) : [],
    contas.map((c) => c.nome),
  )
  const set = (k: string) => (e: { target: { value: string } }) => setCampos((c) => ({ ...c, [k]: e.target.value }))

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const dados = {
      ...(campos as unknown as Record<string, string>),
      rule: campos.rule as RegraScore,
      metricas,
    } as Parameters<typeof validarInsight>[0]
    const novos = validarInsight(dados, { hoje: dia, company, id: existente?.id, existentes: ins.registros })
    setErros(novos)
    if (Object.keys(novos).length) return focarPrimeiroErro(form.current)
    enviar(async () => {
      const registro: RegistroInsight = {
        ...(existente ?? {}),
        ...metricas,
        id: existente?.id ?? gerarId(),
        company,
        account: campos.account.trim(),
        date: campos.date,
        type: campos.type,
        funnel: campos.funnel,
        format: campos.format,
        category: campos.category.trim(),
        description: campos.description.trim(),
        link: campos.link.trim(),
        collected: campos.collected,
        rule: campos.rule as RegraScore,
        notes: campos.notes.trim(),
        updated: new Date().toISOString(),
      }
      await ins.salvar(registro) // lança erro sem fechar o formulário: os campos são preservados
      feedback.sucesso('Resultados salvos. O Dashboard foi atualizado automaticamente.')
      onFechar()
    })
  }

  async function excluir() {
    if (!existente) return
    const ok = await feedback.confirmar({
      titulo: 'Excluir registro?',
      mensagem: `Os resultados de “${existente.description}” serão removidos deste navegador e do Dashboard.`,
    })
    if (!ok) return
    enviar(async () => {
      await ins.excluir(existente.id)
      feedback.sucesso('Registro excluído.')
      onFechar()
    })
  }

  const metricaCampo = (k: ChaveMetrica, rotulo: string, unidade: string) => (
    <Campo key={k} rotulo={rotulo} erro={erros[k]}>
      {(p) => (
        <input
          {...p}
          type="number"
          inputMode="decimal"
          min={0}
          max={unidade === 'pct' ? 100 : undefined}
          step={unidade === 'int' ? 1 : 0.01}
          placeholder="Não informado"
          className="field-control"
          value={campos[k]}
          onChange={set(k)}
        />
      )}
    </Campo>
  )

  return (
    <Dialog
      aberto
      titulo={existente ? 'Editar resultados' : 'Adicionar dados de publicação'}
      descricao={`${company} · preencha os resultados medidos; deixe em branco o que não estiver disponível`}
      onFechar={onFechar}
      bloqueado={salvando}
      largura="sm:max-w-2xl"
      rodape={
        <>
          {existente && !existente.sourceSheet && (
            <button type="button" className="btn-ghost mr-auto text-danger" onClick={excluir} disabled={salvando}>
              <Trash2 className="size-4" aria-hidden />
              Excluir
            </button>
          )}
          <BotoesFormulario formId="form-insight" salvando={salvando} onCancelar={onFechar} rotulo="Salvar resultados" />
        </>
      }
    >
      <form id="form-insight" ref={form} onSubmit={aoEnviar} noValidate className="space-y-5">
        <AvisoObrigatorios />
        {erro && <AlertaErro mensagem={erro} />}
        {ins.gravacaoBloqueada && <AlertaErro mensagem={ins.aviso ?? 'Gravação indisponível nesta sessão.'} />}

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-ink">Identificação</legend>
          <Campo rotulo="Conta / perfil" obrigatorio erro={erros.account}>
            {(p) => (
              <>
                <input {...p} data-autofocus list="contas-insight" className="field-control" value={campos.account} onChange={set('account')} />
                <datalist id="contas-insight">
                  {contasOpcoes.map((c) => (
                    <option key={c} value={c} label={rotuloConta(c)} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>
          <Campo rotulo="Data da publicação" obrigatorio erro={erros.date}>
            {(p) => <input {...p} type="date" max={dia} className="field-control" value={campos.date} onChange={set('date')} />}
          </Campo>
          <Campo rotulo="Tipo" obrigatorio erro={erros.type}>
            {(p) => (
              <select {...p} className="field-control" value={campos.type} onChange={set('type')}>
                <option value="">Selecione</option>
                {[...new Set([...TIPOS_INSIGHT, campos.type].filter(Boolean))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Funil" obrigatorio erro={erros.funnel}>
            {(p) => (
              <select {...p} className="field-control" value={campos.funnel} onChange={set('funnel')}>
                <option value="">Selecione</option>
                {ETAPAS_FUNIL.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Formato" obrigatorio erro={erros.format}>
            {(p) => (
              <select {...p} className="field-control" value={campos.format} onChange={set('format')}>
                <option value="">Selecione</option>
                {[...new Set([...FORMATOS_INSIGHT, campos.format].filter(Boolean))].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Categoria" obrigatorio erro={erros.category}>
            {(p) => (
              <>
                <input {...p} list="categorias-insight" className="field-control" value={campos.category} onChange={set('category')} />
                <datalist id="categorias-insight">
                  <option value="Orgânico" />
                  <option value="Pago" />
                  <option value="Impulsionado" />
                </datalist>
              </>
            )}
          </Campo>
          <Campo rotulo="Descrição" obrigatorio erro={erros.description} className="sm:col-span-2">
            {(p) => <textarea {...p} rows={2} className="field-control" value={campos.description} onChange={set('description')} />}
          </Campo>
          <Campo rotulo="Link do post" erro={erros.link} className="sm:col-span-2">
            {(p) => <input {...p} type="url" placeholder="https://…" className="field-control" value={campos.link} onChange={set('link')} />}
          </Campo>
          <Campo rotulo="Data da coleta" erro={erros.collected}>
            {(p) => <input {...p} type="date" max={dia} className="field-control" value={campos.collected} onChange={set('collected')} />}
          </Campo>
          <Campo rotulo="Regra de score">
            {(p) => (
              <select {...p} className="field-control" value={campos.rule} onChange={set('rule')}>
                <option value="">Sem regra definida</option>
                <option value="liderar">Liderar: {FORMULAS.liderar.toLowerCase()}</option>
                <option value="mqa">MQA: {FORMULAS.mqa.toLowerCase()}</option>
              </select>
            )}
          </Campo>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Métricas</legend>
          <p className="mb-3 text-xs text-ink-muted">Campo vazio = não informado. Zero é um resultado válido.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS_METRICAS.map(([k, rotulo, unidade]) => metricaCampo(k, rotulo, unidade))}
          </div>
        </fieldset>

        <p aria-live="polite" className="text-sm text-ink-soft">
          Score recalculado: <strong className="tabular-nums">{score == null ? '—' : formatarDecimal(score)}</strong>
          <span className="block text-xs text-ink-muted">
            Só é calculado com regra definida e com reproduções, compartilhamentos e seguimentos informados.
          </span>
        </p>
        {existente?.sourceSheet && (
          <Nota>
            Origem: {existente.sourceSheet}, linha {existente.sourceRow}. Score registrado na planilha:{' '}
            {existente.sourceScore == null ? 'não informado' : formatarDecimal(existente.sourceScore)}
            {existente.sourceFormula ? ` (fórmula ${existente.sourceFormula})` : ''}. O ranking usa apenas scores
            recalculados pela regra selecionada; o valor histórico é mantido separado.
          </Nota>
        )}
        <Campo rotulo="Observações">
          {(p) => <textarea {...p} rows={3} className="field-control" value={campos.notes} onChange={set('notes')} />}
        </Campo>
      </form>
    </Dialog>
  )
}
