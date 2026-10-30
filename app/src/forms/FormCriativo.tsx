import { useRef, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Link2, Paperclip, Trash2 } from 'lucide-react'
import { FORMATOS_POSTAGEM, RESPONSAVEIS_ATRIBUIVEIS } from '../data/constants'
import type { FormatoPostagem, PecaCriativo, Responsavel, TipoMidia } from '../data/types'
import { Dialog } from '../components/Dialog'
import { AlertaErro } from '../components/Estados'
import { AvisoObrigatorios, BotoesFormulario, Campo, focarPrimeiroErro, mensagemDeErro, useEnvio } from '../components/Form'
import { useFeedback } from '../components/Feedback'
import { Nota, SeloTipo } from '../components/Selos'
import { useCriativos } from '../state/Criativos'
import { useSessao } from '../state/Sessao'
import { classificarLink, editar, mesmasPecas, novoCriativo, versaoAtual, versaoAtualRevisada, type DadosCriativo } from '../lib/criativos'
import { gerarId } from '../lib/id'

const DESCRICAO_LINK = {
  vazio: '',
  invalido: 'Endereço inválido.',
  canva: 'Link do Canva.',
  'drive-arquivo': 'Link de arquivo do Drive: pode ter prévia, se o arquivo permitir.',
  'drive-pasta': 'Link de pasta do Drive: abre a pasta, mas não é exibido como imagem ou vídeo.',
  outro: 'Link fora do Drive e do Canva.',
}

const tamanho = (n?: number) => (n ? `${(n / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : '')

/** "Adicionar criativo" e edição. Trocar o material de uma versão já revisada cria uma nova versão. */
export function FormCriativo({ id, eventoId, onFechar }: { id?: string; eventoId?: string; onFechar: () => void }) {
  const { criativos, eventos, salvarCriativo, anexarArquivo, descartarArquivos } = useCriativos()
  const { atividades, usuario } = useSessao()
  const feedback = useFeedback()
  const { salvando, erro, enviar } = useEnvio()
  const form = useRef<HTMLFormElement>(null)
  const atual = criativos.find((c) => c.id === id)
  const [dados, setDados] = useState<DadosCriativo>(
    atual
      ? { nome: atual.nome, eventoId: atual.eventoId, atividadeId: atual.atividadeId, responsavel: atual.responsavel, formato: atual.formato, canva: atual.canva, drive: atual.drive, observacoes: atual.observacoes }
      : { nome: '', eventoId: eventoId ?? '', atividadeId: '', responsavel: 'Carlos', formato: 'Estático', canva: '', drive: '', observacoes: '' },
  )
  const [pecas, setPecas] = useState<PecaCriativo[]>(atual ? versaoAtual(atual).pecas : [])
  const anexadosAgora = useRef<string[]>([])
  const [erros, setErros] = useState<Record<string, string>>({})
  const [linkPeca, setLinkPeca] = useState('')
  const [tipoLinkPeca, setTipoLinkPeca] = useState<TipoMidia>('Foto')
  const [erroPeca, setErroPeca] = useState('')
  const [anexando, setAnexando] = useState(false)
  const mudar = (m: Partial<DadosCriativo>) => setDados((d) => ({ ...d, ...m }))

  const atividadesLivres = atividades.filter(
    (a) => a.empresaId === 'centro-liderar' && (!a.criativoId || a.criativoId === id),
  )
  const vinculoPerdido = !!dados.atividadeId && !atividades.some((a) => a.id === dados.atividadeId)
  const criaVersao = !!atual && versaoAtualRevisada(atual) && !mesmasPecas(versaoAtual(atual).pecas, pecas)
  const tipoCanva = classificarLink(dados.canva)
  const tipoDrive = classificarLink(dados.drive)

  async function anexar(lista: FileList | null) {
    if (!lista?.length) return
    setErroPeca('')
    setAnexando(true)
    const novas: PecaCriativo[] = []
    for (const arquivo of Array.from(lista)) {
      try {
        const p = await anexarArquivo(arquivo)
        anexadosAgora.current.push(p.arquivoId!)
        novas.push(p)
      } catch (e) {
        setErroPeca(mensagemDeErro(e))
      }
    }
    setPecas((l) => [...l, ...novas])
    setAnexando(false)
  }

  function adicionarLink() {
    const tipo = classificarLink(linkPeca)
    if (tipo === 'drive-pasta') {
      return setErroPeca('Este é um link de pasta. Uma pasta não é exibida como imagem ou vídeo: informe-a em “Link do arquivo ou pasta no Drive”.')
    }
    if (tipo !== 'drive-arquivo') return setErroPeca('Informe o link de um arquivo do Google Drive (…/file/d/…).')
    setErroPeca('')
    setPecas((l) => [...l, { id: gerarId(), origem: 'drive', nome: `Arquivo do Drive ${l.length + 1}`, midia: tipoLinkPeca, url: linkPeca.trim() }])
    setLinkPeca('')
  }

  function mover(i: number, delta: number) {
    setPecas((l) => {
      const n = [...l]
      ;[n[i], n[i + delta]] = [n[i + delta], n[i]]
      return n
    })
  }

  function cancelar() {
    void descartarArquivos(anexadosAgora.current)
    onFechar()
  }

  function aoEnviar(e: FormEvent) {
    e.preventDefault()
    const novos: Record<string, string> = {}
    if (!dados.nome.trim()) novos.nome = 'Informe o nome do criativo.'
    if (tipoCanva !== 'vazio' && tipoCanva !== 'canva') novos.canva = 'Informe um link do Canva (canva.com).'
    if (tipoDrive !== 'vazio' && tipoDrive !== 'drive-arquivo' && tipoDrive !== 'drive-pasta') {
      novos.drive = 'Informe o link de um arquivo ou de uma pasta do Google Drive.'
    }
    setErros(novos)
    if (Object.keys(novos).length) return focarPrimeiroErro(form.current)
    const limpos: DadosCriativo = { ...dados, nome: dados.nome.trim(), canva: dados.canva.trim(), drive: dados.drive.trim(), observacoes: dados.observacoes.trim() }
    const autor = usuario ?? 'Sem identificação'
    enviar(async () => {
      if (atual) {
        const { criativo, novaVersao } = editar(atual, limpos, pecas, autor)
        await salvarCriativo(criativo)
        feedback.sucesso(novaVersao ? `Criada a versão ${versaoAtual(criativo).numero}. Ela precisa de nova revisão.` : 'Criativo atualizado.')
      } else {
        await salvarCriativo(novoCriativo(gerarId(), limpos, pecas, autor))
        feedback.sucesso('Criativo adicionado em Produção.')
      }
      onFechar()
    })
  }

  return (
    <Dialog
      aberto
      titulo={atual ? 'Editar criativo' : 'Adicionar criativo'}
      descricao="Criativos › Produção"
      onFechar={cancelar}
      bloqueado={salvando || anexando}
      largura="sm:max-w-2xl"
      rodape={<BotoesFormulario formId="form-criativo" salvando={salvando || anexando} onCancelar={cancelar} />}
    >
      <form id="form-criativo" ref={form} onSubmit={aoEnviar} noValidate className="space-y-4">
        <AvisoObrigatorios />
        {erro && <AlertaErro mensagem={erro} />}
        <Campo rotulo="Nome do criativo" obrigatorio erro={erros.nome}>
          {(p) => <input {...p} className="field-control" value={dados.nome} onChange={(e) => mudar({ nome: e.target.value })} />}
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Evento ou campanha">
            {(p) => (
              <select {...p} className="field-control" value={dados.eventoId} onChange={(e) => mudar({ eventoId: e.target.value })}>
                <option value="">Sem evento vinculado</option>
                {[...eventos]
                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                  .map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nome} ({ev.tipo.toLowerCase()})
                    </option>
                  ))}
              </select>
            )}
          </Campo>
          <Campo
            rotulo="Atividade vinculada"
            dica={vinculoPerdido ? 'A atividade vinculada não existe nesta sessão (atividades novas ficam só na aba onde foram criadas).' : 'Opcional. A decisão fica no criativo e aparece também na atividade.'}
          >
            {(p) => (
              <select {...p} className="field-control" value={dados.atividadeId} onChange={(e) => mudar({ atividadeId: e.target.value })}>
                <option value="">Nenhuma</option>
                {vinculoPerdido && <option value={dados.atividadeId}>Atividade não encontrada nesta sessão</option>}
                {atividadesLivres.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.titulo}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Responsável">
            {(p) => (
              <select {...p} className="field-control" value={dados.responsavel} onChange={(e) => mudar({ responsavel: e.target.value as Responsavel })}>
                {RESPONSAVEIS_ATRIBUIVEIS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
                {!RESPONSAVEIS_ATRIBUIVEIS.includes(dados.responsavel) && <option>{dados.responsavel}</option>}
              </select>
            )}
          </Campo>
          <Campo rotulo="Formato da publicação">
            {(p) => (
              <select {...p} className="field-control" value={dados.formato} onChange={(e) => mudar({ formato: e.target.value as FormatoPostagem })}>
                {FORMATOS_POSTAGEM.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            )}
          </Campo>
          <Campo rotulo="Link editável do Canva" erro={erros.canva} dica="Opcional. Só referência para edição: o sistema não sincroniza com o Canva.">
            {(p) => <input {...p} type="url" inputMode="url" className="field-control" placeholder="https://www.canva.com/design/…" value={dados.canva} onChange={(e) => mudar({ canva: e.target.value })} />}
          </Campo>
          <Campo rotulo="Link do arquivo ou pasta no Drive" erro={erros.drive} dica={DESCRICAO_LINK[tipoDrive] || 'Opcional.'}>
            {(p) => <input {...p} type="url" inputMode="url" className="field-control" placeholder="https://drive.google.com/…" value={dados.drive} onChange={(e) => mudar({ drive: e.target.value })} />}
          </Campo>
        </div>

        <fieldset className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Material: imagens e vídeos</legend>
          <p className="text-xs text-ink-muted">
            Anexe os arquivos exportados (ex.: do Canva) ou informe links de arquivos do Drive. Em carrosséis, a ordem
            abaixo é a ordem das peças. Arquivos anexados ficam só neste navegador e não são enviados ao Google Drive.
          </p>
          {criaVersao && (
            <Nota tom="aviso">
              Ao salvar, o material forma a versão {versaoAtual(atual!).numero + 1}. A versão {versaoAtual(atual!).numero}{' '}
              e a decisão dela ficam preservadas, e a nova versão precisa de nova revisão.
            </Nota>
          )}
          {pecas.length > 0 && (
            <ol className="space-y-2" aria-label="Peças do criativo">
              {pecas.map((p, i) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] border border-line p-2 text-sm">
                  <span className="w-6 text-center font-semibold text-ink-muted tabular-nums">{i + 1}</span>
                  <SeloTipo tipo={p.midia} />
                  <span className="min-w-0 flex-1 break-all text-ink">
                    {p.nome}
                    <span className="block text-xs text-ink-muted">
                      {p.origem === 'arquivo' ? `Anexado neste navegador · ${tamanho(p.tamanho)}` : 'Arquivo do Google Drive'}
                    </span>
                  </span>
                  <button type="button" className="btn-ghost px-2" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp className="size-4" aria-hidden />
                    <span className="sr-only">Mover para cima: {p.nome}</span>
                  </button>
                  <button type="button" className="btn-ghost px-2" disabled={i === pecas.length - 1} onClick={() => mover(i, 1)}>
                    <ArrowDown className="size-4" aria-hidden />
                    <span className="sr-only">Mover para baixo: {p.nome}</span>
                  </button>
                  <button type="button" className="btn-ghost px-2 text-danger" onClick={() => setPecas((l) => l.filter((x) => x.id !== p.id))}>
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Remover peça: {p.nome}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {erroPeca && <AlertaErro mensagem={erroPeca} />}
          <label className="btn-secondary w-fit cursor-pointer">
            <Paperclip className="size-4" aria-hidden />
            {anexando ? 'Anexando…' : 'Anexar imagens ou vídeos'}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              disabled={anexando}
              onChange={(e) => {
                void anexar(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <label className="text-sm text-ink-soft">
              Link de arquivo do Drive
              <input type="url" className="field-control mt-1" placeholder="https://drive.google.com/file/d/…" value={linkPeca} onChange={(e) => setLinkPeca(e.target.value)} />
            </label>
            <label className="text-sm text-ink-soft">
              Tipo
              <select className="field-control mt-1" value={tipoLinkPeca} onChange={(e) => setTipoLinkPeca(e.target.value as TipoMidia)}>
                <option>Foto</option>
                <option>Vídeo</option>
              </select>
            </label>
            <button type="button" className="btn-secondary" onClick={adicionarLink}>
              <Link2 className="size-4" aria-hidden />
              Adicionar peça
            </button>
          </div>
        </fieldset>

        <Campo rotulo="Observações">
          {(p) => <textarea {...p} rows={3} className="field-control" value={dados.observacoes} onChange={(e) => mudar({ observacoes: e.target.value })} />}
        </Campo>
      </form>
    </Dialog>
  )
}
