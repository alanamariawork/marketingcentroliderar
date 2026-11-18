import { useState } from 'react'
import { CheckCircle2, ExternalLink, Pencil, RotateCcw, Send, Trash2 } from 'lucide-react'
import { APROVADORA_FINAL } from '../data/constants'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { Campo, mensagemDeErro } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { Etiqueta, Nota, SeloPessoa, SeloStatusCriativo } from '../components/Selos'
import { VisualizadorPecas } from '../components/PecasCriativo'
import { useCriativos } from '../state/Criativos'
import { useModais } from '../state/Modais'
import { useSessao } from '../state/Sessao'
import {
  classificarLink,
  decidir,
  podeDecidirCriativo,
  podeEnviarCriativo,
  rotuloEnvio,
  statusDoCriativo,
  versaoAtual,
  type AcaoCriativo,
} from '../lib/criativos'
import { formatarCarimbo, formatarData } from '../lib/dates'

export function DetalheCriativo({ id, onFechar }: { id: string; onFechar: () => void }) {
  const { criativos, eventos, salvarCriativo, excluirCriativo } = useCriativos()
  const { atividades, usuario } = useSessao()
  const { abrir } = useModais()
  const feedback = useFeedback()
  const c = criativos.find((x) => x.id === id)
  const [versaoVista, setVersaoVista] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [erroAcao, setErroAcao] = useState('')

  if (!c) {
    return (
      <Dialog aberto titulo="Criativo não encontrado" onFechar={onFechar}>
        <p className="text-sm text-ink-muted">Este criativo foi removido ou não existe neste navegador.</p>
      </Dialog>
    )
  }

  const atual = versaoAtual(c)
  const status = statusDoCriativo(c)
  const vista = c.versoes.find((v) => v.numero === versaoVista) ?? atual
  const evento = eventos.find((e) => e.id === c.eventoId)
  const atividade = c.atividadeId ? atividades.find((a) => a.id === c.atividadeId) : undefined
  const enviar = podeEnviarCriativo(usuario, c)
  const decide = podeDecidirCriativo(usuario, c)
  const linkDrive = classificarLink(c.drive)

  async function executar(acao: AcaoCriativo) {
    try {
      const novo = decidir(c!, acao, usuario, comentario)
      await salvarCriativo(novo)
      setComentario('')
      setErroAcao('')
      const d = novo.decisoes.at(-1)!
      feedback.sucesso(`${d.decisao}: versão ${d.versao}.`)
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : mensagemDeErro(e))
    }
  }

  async function remover() {
    const ok = await feedback.confirmar({
      titulo: 'Remover criativo?',
      mensagem: `“${c!.nome}”, suas versões e o histórico serão removidos deste sistema. Arquivos anexados neste navegador serão apagados. Nenhum arquivo do Google Drive ou do Canva é excluído.`,
      rotuloConfirmar: 'Remover',
    })
    if (!ok) return
    try {
      await excluirCriativo(c!.id)
      feedback.sucesso('Criativo removido do sistema.')
      onFechar()
    } catch (e) {
      feedback.erro(mensagemDeErro(e))
    }
  }

  const decisoesPorVersao = [...c.versoes].reverse().map((v) => ({ v, decisoes: c.decisoes.filter((d) => d.versao === v.numero) }))

  return (
    <Dialog
      aberto
      variante="central"
      titulo={c.nome}
      descricao={`${evento?.nome ?? 'Sem evento vinculado'} · ${c.formato} · Versão ${atual.numero}`}
      onFechar={onFechar}
      largura="max-w-4xl"
      rodape={
        <>
          <button type="button" className="btn-ghost mr-auto text-danger" onClick={remover}>
            <Trash2 className="size-4" aria-hidden />
            Remover criativo
          </button>
          <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'form-criativo', id: c.id })}>
            <Pencil className="size-4" aria-hidden />
            Editar
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <SeloStatusCriativo status={status} />
          <Etiqueta>Versão atual: {atual.numero}</Etiqueta>
          <Etiqueta>{atual.pecas.length === 1 ? '1 peça' : `${atual.pecas.length} peças`}</Etiqueta>
        </div>

        <section aria-labelledby="titulo-previa" className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 id="titulo-previa" className="text-sm font-semibold text-ink">
              Prévia {vista.numero === atual.numero ? 'da versão atual' : `da versão ${vista.numero} (anterior)`}
            </h3>
            {c.versoes.length > 1 && (
              <label className="text-sm text-ink-soft">
                Versão exibida{' '}
                <select className="field-control mt-1 w-auto" value={vista.numero} onChange={(e) => setVersaoVista(Number(e.target.value))}>
                  {[...c.versoes].reverse().map((v) => (
                    <option key={v.numero} value={v.numero}>
                      Versão {v.numero}
                      {v.numero === atual.numero ? ' (atual)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <VisualizadorPecas pecas={vista.pecas} />
        </section>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="eyebrow">Evento ou campanha</dt>
            <dd className="mt-1 text-ink-soft">
              {evento ? `${evento.nome} (${evento.tipo.toLowerCase()}${evento.data ? `, ${formatarData(evento.data)}` : ''})` : 'Sem evento vinculado'}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Atividade vinculada</dt>
            <dd className="mt-1 text-ink-soft">
              {!c.atividadeId ? (
                'Nenhuma'
              ) : atividade ? (
                <button type="button" className="text-left text-brand-600 underline-offset-2 hover:underline" onClick={() => abrir({ tipo: 'atividade', id: atividade.id })}>
                  {atividade.titulo}
                </button>
              ) : (
                'Não encontrada nesta sessão (atividades novas ficam só na aba onde foram criadas).'
              )}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Responsável</dt>
            <dd className="mt-1">
              <SeloPessoa nome={c.responsavel} />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Formato · Aprovação final</dt>
            <dd className="mt-1 text-ink-soft">
              {c.formato} · {APROVADORA_FINAL}
            </dd>
          </div>
        </dl>

        {(c.canva || c.drive) && (
          <div className="flex flex-wrap gap-2">
            {c.canva && (
              <a href={c.canva} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Abrir no Canva
                <ExternalLink className="size-4" aria-hidden />
                <span className="sr-only">(abre em outra aba)</span>
              </a>
            )}
            {c.drive && (
              <a href={c.drive} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                {linkDrive === 'drive-pasta' ? 'Abrir pasta no Drive' : 'Abrir arquivo no Drive'}
                <ExternalLink className="size-4" aria-hidden />
                <span className="sr-only">(abre em outra aba)</span>
              </a>
            )}
          </div>
        )}
        {c.canva && (
          <p className="text-xs text-ink-muted">
            O design no Canva pode mudar fora do sistema; a aprovação vale para o material anexado na versão revisada.
          </p>
        )}

        {c.observacoes && (
          <section>
            <h3 className="eyebrow">Observações</h3>
            <p className="mt-1 text-sm whitespace-pre-line text-ink-soft">{c.observacoes}</p>
          </section>
        )}

        <section aria-labelledby="titulo-decisao-criativo" className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
          <h3 id="titulo-decisao-criativo" className="text-sm font-semibold text-ink">
            Revisão da versão {atual.numero}
          </h3>
          <p className="text-sm text-ink-soft">
            {status === 'Em produção' && 'Em produção. Carlos envia a versão para revisão.'}
            {status === 'Em revisão' && 'Material enviado e ainda sem decisão. Somente Kélvia aprova ou solicita ajustes.'}
            {status === 'Ajustes solicitados' && 'Ajustes solicitados. Substitua o material (nova versão) ou reenvie para revisão.'}
            {status === 'Aprovado' && `Versão ${atual.numero} aprovada. Trocar o material cria uma nova versão, que precisa de nova revisão.`}
          </p>
          {erroAcao && <AlertaErro mensagem={erroAcao} />}
          {(status === 'Em revisão' || decide) && (
            <Campo rotulo="Comentário" dica="Obrigatório para solicitar ajustes: explique o que precisa mudar. Fica no histórico.">
              {(p) => (
                <textarea {...p} rows={3} className="field-control" value={comentario} onChange={(e) => setComentario(e.target.value)} disabled={!decide} />
              )}
            </Campo>
          )}
          <div className="flex flex-wrap gap-2">
            {(status === 'Em produção' || status === 'Ajustes solicitados') && (
              <button type="button" className="btn-primary" disabled={!enviar} onClick={() => executar('enviar')}>
                <Send className="size-4" aria-hidden />
                {rotuloEnvio(c)}
              </button>
            )}
            {status === 'Em revisão' && (
              <>
                <button type="button" className="btn-primary" disabled={!decide} onClick={() => executar('aprovar')}>
                  <CheckCircle2 className="size-4" aria-hidden />
                  Aprovar
                </button>
                <button type="button" className="btn-secondary" disabled={!decide} onClick={() => executar('ajustes')}>
                  <RotateCcw className="size-4" aria-hidden />
                  Solicitar ajustes
                </button>
              </>
            )}
          </div>
          {!usuario && (
            <Nota>
              Esta versão do sistema ainda não tem login, então ninguém é identificado: o envio para revisão, a aprovação e a
              solicitação de ajustes ficam indisponíveis. Nenhuma decisão é atribuída automaticamente à Kélvia.
            </Nota>
          )}
          {usuario && (status === 'Em produção' || status === 'Ajustes solicitados') && !atual.pecas.length && (
            <Nota>Anexe ao menos uma imagem ou um vídeo antes de enviar para revisão.</Nota>
          )}
        </section>

        <section aria-labelledby="titulo-historico-criativo" className="space-y-3">
          <h3 id="titulo-historico-criativo" className="eyebrow">
            Histórico de versões e decisões
          </h3>
          <ol className="space-y-3">
            {decisoesPorVersao.map(({ v, decisoes }) => (
              <li key={v.numero} className="rounded-[var(--radius-control)] border border-line p-3">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  Versão {v.numero}
                  {v.numero === atual.numero && <Etiqueta tom="info">Atual</Etiqueta>}
                  {decisoes.some((d) => d.decisao === 'Aprovado') && <Etiqueta>Aprovada</Etiqueta>}
                </p>
                <p className="text-xs text-ink-muted">
                  Criada em {formatarCarimbo(v.criadaEm)} · {v.autor} · {v.pecas.length === 1 ? '1 peça' : `${v.pecas.length} peças`}
                </p>
                {decisoes.length ? (
                  <table className="mt-2 w-full text-left text-sm">
                    <caption className="sr-only">Decisões da versão {v.numero}</caption>
                    <thead className="text-xs text-ink-muted">
                      <tr>
                        <th className="py-1 pr-2 font-medium">Data e hora</th>
                        <th className="py-1 pr-2 font-medium">Autor</th>
                        <th className="py-1 pr-2 font-medium">Decisão</th>
                        <th className="py-1 font-medium">Comentário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisoes.map((d, i) => (
                        <tr key={i} className="border-t border-line align-top">
                          <td className="py-1 pr-2 whitespace-nowrap tabular-nums">{formatarCarimbo(d.quando)}</td>
                          <td className="py-1 pr-2">{d.autor}</td>
                          <td className="py-1 pr-2">{d.decisao}</td>
                          <td className="py-1 break-words">{d.comentario || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-1 text-sm text-ink-muted">Sem envio nem decisão nesta versão.</p>
                )}
              </li>
            ))}
          </ol>
          {c.historico.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-ink-soft">Alterações de cadastro ({c.historico.length})</summary>
              <ol className="mt-2 space-y-1 border-l border-line pl-4">
                {c.historico.map((h, i) => (
                  <li key={i} className="text-sm text-ink-soft">
                    <span className="block text-xs text-ink-muted">
                      {h.quando ? formatarCarimbo(h.quando) : ''} · {h.autor}
                    </span>
                    {h.texto}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>
      </div>
    </Dialog>
  )
}
