import { useRef, useState } from 'react'
import { AtSign, Bot, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { AGENTE_CONFIGURADO, ErroDoAgente, executarAgente, type RespostaAgente } from '../data/agenteInsights'
import { CONTAS_INSTAGRAM, DIAS_ATRAS, HORA_DA_ROTINA, diaAlvo } from '../lib/instagram'
import { cx } from '../lib/format'
import { useInsights } from '../state/Insights'
import { Dialog } from './Dialog'
import { useFeedback } from './Feedback'
import { AlertaErro } from './Estados'
import { Nota } from './Selos'

interface Resultado {
  resposta: RespostaAgente
  novos: number
  atualizados: number
}

/**
 * Botão flutuante do agente de atualização dos Insights. Abre um painel com a
 * rotina (todos os dias às 8h) e permite rodar a coleta na hora.
 */
export function BotaoAgente() {
  const ins = useInsights()
  const feedback = useFeedback()
  const [aberto, setAberto] = useState(false)
  const [rodando, setRodando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const controle = useRef<AbortController | null>(null)

  async function atualizar() {
    setRodando(true)
    setErro('')
    setResultado(null)
    controle.current = new AbortController()
    try {
      const resposta = await executarAgente(controle.current.signal)
      const { novos, atualizados } = await ins.aplicarColetados(resposta.registros)
      setResultado({ resposta, novos, atualizados })
      feedback.sucesso(`Insights atualizados: ${novos} novos e ${atualizados} atualizados.`)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setErro(e instanceof ErroDoAgente || e instanceof Error ? e.message : 'Não foi possível atualizar.')
    } finally {
      setRodando(false)
    }
  }

  const dia = diaAlvo().split('-').reverse().join('/')

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        className={cx(
          'group fixed right-4 bottom-4 z-30 flex items-center gap-2 rounded-full bg-brand-700 py-3 pr-5 pl-3 text-sm font-semibold text-brand-contrast shadow-lg ring-4 ring-brand-500/25 transition-transform hover:-translate-y-0.5 hover:bg-brand-600 sm:right-6 sm:bottom-6',
          !rodando && 'motion-safe:animate-[flutuar_3.2s_ease-in-out_infinite] hover:[animation-play-state:paused] focus-visible:[animation-play-state:paused]',
        )}
      >
        <span className="relative flex size-8 items-center justify-center rounded-full bg-white/15">
          {!rodando && (
            <span className="absolute inset-0 rounded-full bg-white/30 motion-safe:animate-ping" aria-hidden />
          )}
          {rodando ? (
            <RefreshCw className="size-4 motion-safe:animate-spin" aria-hidden />
          ) : (
            <Bot className="size-4" aria-hidden />
          )}
        </span>
        {rodando ? 'Atualizando…' : 'Atualizar Insights'}
      </button>

      {aberto && (
        <Dialog
          aberto
          variante="central"
          titulo="Agente de atualização dos Insights"
          descricao="Coleta pela API oficial do Instagram"
          onFechar={() => {
            controle.current?.abort()
            setAberto(false)
          }}
          rodape={
            <button type="button" className="btn-primary" onClick={atualizar} disabled={rodando || !AGENTE_CONFIGURADO} aria-busy={rodando}>
              <RefreshCw className={cx('size-4', rodando && 'motion-safe:animate-spin')} aria-hidden />
              {rodando ? 'Atualizando…' : 'Atualizar agora'}
            </button>
          }
        >
          <div className="space-y-4 text-sm text-ink-soft">
            <p>
              Busca as publicações feitas há {DIAS_ATRAS} dias ({dia}) em cada conta de Instagram e adiciona os dados de
              cada post em Insights. Posts que já existem são atualizados, sem duplicar e sem apagar o que a equipe
              preencheu.
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-ink-muted" aria-hidden />
                Rotina automática todos os dias às {Number(HORA_DA_ROTINA.slice(0, 2))}h (horário de Fortaleza)
              </li>
              {CONTAS_INSTAGRAM.map((c) => (
                <li key={c.account} className="flex items-center gap-2">
                  <AtSign className="size-4 text-ink-muted" aria-hidden />
                  {c.rotulo}
                </li>
              ))}
            </ul>
            <Nota>
              A API não informa, por publicação, alcance de seguidores e não seguidores, cliques no link e
              republicações. Esses campos ficam vazios para preenchimento manual. Funil e categoria também são da
              equipe.
            </Nota>

            {!AGENTE_CONFIGURADO && (
              <Nota tom="aviso">
                O agente ainda não está ligado. Falta configurar o acesso à API do Instagram (contas profissionais,
                app da Meta e token) e o servidor onde a rotina das 8h roda. Enquanto isso, nenhuma coleta é feita.
              </Nota>
            )}

            <div aria-live="polite" className="space-y-2">
              {rodando && <p>Coletando as publicações de {dia}…</p>}
              {erro && <AlertaErro mensagem={erro} />}
              {resultado && (
                <div className="rounded-[var(--radius-control)] border border-line p-3">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <CheckCircle2 className="size-4 text-success" aria-hidden />
                    {resultado.novos} novos · {resultado.atualizados} atualizados
                  </p>
                  <ul className="mt-2 space-y-1">
                    {resultado.resposta.contas.map((c) => (
                      <li key={c.account}>
                        {c.account}: {c.erro ? <span className="text-danger">{c.erro}</span> : `${c.publicacoes} publicações`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </>
  )
}
