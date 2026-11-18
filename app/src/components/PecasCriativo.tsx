import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Film, Image as ImageIcon, Layers, Loader2 } from 'lucide-react'
import type { PecaCriativo } from '../data/types'
import { idDoArquivo, urlMiniatura, urlPrevia } from '../lib/drive'
import { cx } from '../lib/format'
import { useCriativos } from '../state/Criativos'
import { CapaGrafica, Miniatura } from './MiniaturaDrive'
import { Nota, SeloTipo } from './Selos'

/** Endereço local (blob:) de um arquivo anexado neste navegador. */
function useArquivoLocal(arquivoId: string | undefined) {
  const { urlDoArquivo } = useCriativos()
  const [estado, setEstado] = useState<{ url: string | null; carregando: boolean }>({ url: null, carregando: !!arquivoId })
  useEffect(() => {
    if (!arquivoId) return
    let ativo = true
    urlDoArquivo(arquivoId).then((url) => ativo && setEstado({ url, carregando: false }))
    return () => {
      ativo = false
    }
  }, [arquivoId, urlDoArquivo])
  return estado
}

/** Capa do cartão: a primeira peça (anexada ou do Drive); sem peça, capa gráfica. */
export function CapaCriativo({ peca, titulo, linkDrive }: { peca?: PecaCriativo; titulo: string; linkDrive?: string }) {
  const local = useArquivoLocal(peca?.origem === 'arquivo' ? peca.arquivoId : undefined)
  const grafica = <CapaGrafica titulo={titulo} icone={Layers} />
  if (peca?.origem === 'arquivo') {
    if (!local.url) return grafica
    return peca.midia === 'Vídeo' ? (
      <video src={local.url + '#t=0.1'} muted preload="metadata" className="absolute inset-0 size-full object-cover" aria-hidden />
    ) : (
      <img src={local.url} alt="" className="absolute inset-0 size-full object-cover" />
    )
  }
  const id = idDoArquivo(peca?.url ?? linkDrive)
  return <Miniatura key={id} id={id} alternativa={grafica} />
}

const ESPERA_MS = 15000

/** Uma peça em tamanho grande. Se a prévia não funcionar, explica e oferece o link. */
function PrevisaoPeca({ peca }: { peca: PecaCriativo }) {
  const local = useArquivoLocal(peca.origem === 'arquivo' ? peca.arquivoId : undefined)
  const id = peca.origem === 'drive' ? idDoArquivo(peca.url) : ''
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'falhou' | 'demorando'>('carregando')
  useEffect(() => {
    if (estado !== 'carregando' || peca.origem !== 'drive') return
    const t = setTimeout(() => setEstado('demorando'), ESPERA_MS)
    return () => clearTimeout(t)
  }, [estado, peca.origem])

  if (peca.origem === 'arquivo') {
    if (local.carregando) return <p className="text-sm text-ink-soft">Carregando o arquivo…</p>
    if (!local.url) {
      return (
        <Nota tom="aviso">
          O arquivo “{peca.nome}” não está neste navegador. Arquivos anexados ficam só no navegador onde foram
          adicionados; em outro aparelho, ou depois de limpar os dados do navegador, eles não aparecem.
        </Nota>
      )
    }
    return peca.midia === 'Vídeo' ? (
      <video src={local.url} controls className="max-h-[60vh] w-full rounded-[var(--radius-control)] bg-black" aria-label={`Vídeo: ${peca.nome}`} />
    ) : (
      <img src={local.url} alt={`Prévia de ${peca.nome}`} className="mx-auto max-h-[60vh] w-auto max-w-full object-contain" />
    )
  }

  const link = (
    <a href={peca.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
      Abrir arquivo no Drive
      <ExternalLink className="size-4" aria-hidden />
      <span className="sr-only">(abre em outra aba)</span>
    </a>
  )
  return (
    <div className="space-y-2">
      {(estado === 'carregando' || estado === 'demorando') && (
        <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Carregando a prévia do Google Drive…
        </p>
      )}
      {(estado === 'falhou' || estado === 'demorando') && (
        <Nota tom="aviso">
          {estado === 'demorando'
            ? 'A prévia está demorando. O arquivo pode estar em processamento no Google Drive.'
            : 'Não foi possível exibir a prévia. O arquivo pode exigir permissão de acesso no Google Drive, o formato pode não ter miniatura ou o navegador pode estar bloqueando o Drive. As permissões do arquivo não são alteradas pelo sistema.'}{' '}
          Use o link para ver no Google Drive.
        </Nota>
      )}
      {peca.midia === 'Foto' && estado !== 'falhou' && (
        <img
          src={urlMiniatura(id, 1600)}
          alt={`Prévia de ${peca.nome}`}
          referrerPolicy="no-referrer"
          onLoad={() => setEstado('ok')}
          onError={() => setEstado('falhou')}
          className={cx('mx-auto max-h-[60vh] w-auto max-w-full object-contain', estado !== 'ok' && 'h-0')}
        />
      )}
      {peca.midia === 'Vídeo' && estado !== 'falhou' && (
        <>
          <iframe
            title={`Player do Google Drive: ${peca.nome}`}
            src={urlPrevia(id)}
            allow="autoplay; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            onLoad={() => setEstado('ok')}
            className="aspect-video w-full rounded-[var(--radius-control)] border-0 bg-black"
          />
          <p className="text-xs text-ink-muted">
            Player do Google Drive. Se ele pedir acesso ou mostrar erro, abra o arquivo no Drive.
          </p>
        </>
      )}
      {link}
    </div>
  )
}

/** Peças de uma versão, com navegação (carrossel). */
export function VisualizadorPecas({ pecas }: { pecas: PecaCriativo[] }) {
  const [i, setI] = useState(0)
  useEffect(() => setI(0), [pecas])
  if (!pecas.length) {
    return <Nota>Nenhuma imagem ou vídeo anexado a esta versão.</Nota>
  }
  const atual = pecas[Math.min(i, pecas.length - 1)]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SeloTipo tipo={atual.midia} />
        <span className="text-sm font-medium break-all text-ink">{atual.nome}</span>
        <span className="text-xs text-ink-muted">{atual.origem === 'arquivo' ? 'Arquivo anexado neste navegador' : 'Arquivo do Google Drive'}</span>
      </div>
      <div className="rounded-[var(--radius-control)] bg-surface-muted p-2">
        <PrevisaoPeca key={atual.id} peca={atual} />
      </div>
      {pecas.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ChevronLeft className="size-4" aria-hidden />
            Anterior
          </button>
          <span className="text-sm text-ink-soft tabular-nums" aria-live="polite">
            Peça {i + 1} de {pecas.length}
          </span>
          <button type="button" className="btn-secondary" disabled={i >= pecas.length - 1} onClick={() => setI(i + 1)}>
            Próxima
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <ol className="flex w-full flex-wrap gap-1.5" aria-label="Peças">
            {pecas.map((p, n) => {
              const Icone = p.midia === 'Vídeo' ? Film : ImageIcon
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-current={n === i ? 'true' : undefined}
                    onClick={() => setI(n)}
                    className={cx(
                      'inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 text-xs',
                      n === i ? 'border-brand-600 font-semibold text-ink' : 'border-line text-ink-muted',
                    )}
                  >
                    <Icone className="size-3" aria-hidden />
                    {n + 1}
                    <span className="sr-only">: {p.nome}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
