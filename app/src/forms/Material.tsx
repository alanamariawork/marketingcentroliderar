import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Film, Trash2 } from 'lucide-react'
import type { Material } from '../data/types'
import { ehUrlValida } from '../lib/format'
import { Campo } from '../components/Form'

export const MATERIAL_VAZIO: Material = { canva: '', drive: '', arte: '', video: null, videoNome: '', videoTamanho: 0 }

const ehVideo = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(f.name)

/**
 * Rascunho do material. O vídeo vira um endereço `blob:` local; os endereços
 * criados e descartados são liberados para não ocupar memória.
 */
export function useRascunhoMaterial(inicial: Material | null) {
  const [rascunho, setRascunho] = useState<Material>(inicial ?? MATERIAL_VAZIO)
  const [erroVideo, setErroVideo] = useState('')
  const criado = useRef<string | null>(null)
  const confirmado = useRef(false)
  const videoInicial = inicial?.video ?? null

  useEffect(
    () => () => {
      if (!confirmado.current && criado.current) URL.revokeObjectURL(criado.current)
    },
    [],
  )

  function escolherVideo(file: File | undefined) {
    setErroVideo('')
    if (!file) return
    if (!ehVideo(file)) {
      setErroVideo('Selecione um arquivo de vídeo válido (MP4, MOV, WEBM ou M4V).')
      return
    }
    if (criado.current) URL.revokeObjectURL(criado.current)
    criado.current = URL.createObjectURL(file)
    setRascunho((m) => ({ ...m, video: criado.current, videoNome: file.name, videoTamanho: file.size }))
  }

  function removerVideo() {
    if (criado.current) URL.revokeObjectURL(criado.current)
    criado.current = null
    setErroVideo('')
    setRascunho((m) => ({ ...m, video: null, videoNome: '', videoTamanho: 0 }))
  }

  /** Erros dos links; objeto vazio quando estão válidos. */
  function validar(): Record<string, string> {
    const e: Record<string, string> = {}
    for (const k of ['canva', 'drive', 'arte'] as const) {
      const v = rascunho[k].trim()
      if (v && !ehUrlValida(v)) e[k] = 'Informe um link válido que comece com https:// ou http://.'
    }
    return e
  }

  /** Material final (ou null se vazio). Chame só depois de salvar com sucesso. */
  function confirmar(): Material | null {
    confirmado.current = true
    if (videoInicial && videoInicial !== rascunho.video) URL.revokeObjectURL(videoInicial)
    const m = { ...rascunho, canva: rascunho.canva.trim(), drive: rascunho.drive.trim(), arte: rascunho.arte.trim() }
    return m.canva || m.drive || m.arte || m.video ? m : null
  }

  return { rascunho, setRascunho, erroVideo, escolherVideo, removerVideo, validar, confirmar }
}

export function EditorMaterial({
  r,
  erros,
  desabilitado,
}: {
  r: ReturnType<typeof useRascunhoMaterial>
  erros: Record<string, string>
  desabilitado?: boolean
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const { rascunho, setRascunho } = r
  const campo = (k: 'canva' | 'drive' | 'arte', rotulo: string, exemplo: string) => (
    <Campo rotulo={rotulo} erro={erros[k]}>
      {(p) => (
        <input
          {...p}
          type="url"
          inputMode="url"
          className="field-control"
          placeholder={exemplo}
          value={rascunho[k]}
          disabled={desabilitado}
          onChange={(e) => setRascunho((m) => ({ ...m, [k]: e.target.value }))}
        />
      )}
    </Campo>
  )
  return (
    <fieldset className="space-y-3 rounded-[var(--radius-card)] border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">Material para aprovação</legend>
      <p className="text-xs text-ink-muted">
        Adicione links, um vídeo ou os dois. É possível salvar sem material e preparar a entrega depois. Os links devem
        permitir acesso à Kélvia.
      </p>
      {campo('canva', 'Link do Canva', 'https://www.canva.com/design/…')}
      {campo('drive', 'Link do Google Drive', 'https://drive.google.com/…')}
      {campo('arte', 'URL da arte', 'https://…')}

      <div>
        <label htmlFor="material-video" className="mb-1 block text-sm font-medium text-ink-soft">
          Anexo de vídeo local
        </label>
        <input
          ref={entrada}
          id="material-video"
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v"
          disabled={desabilitado}
          aria-describedby="material-video-dica"
          aria-invalid={!!r.erroVideo}
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium"
          onChange={(e) => {
            r.escolherVideo(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <p id="material-video-dica" className="mt-1 text-xs text-ink-muted">
          O vídeo fica disponível apenas nesta aba do navegador, durante esta sessão. Ele não é enviado à nuvem nem
          compartilhado com outra pessoa.
        </p>
        {r.erroVideo && (
          <p role="alert" className="mt-1 text-xs font-medium text-danger">
            {r.erroVideo}
          </p>
        )}
      </div>
      {rascunho.video && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-xs text-ink-soft">
            <Film className="size-4" aria-hidden />
            {rascunho.videoNome} · {(rascunho.videoTamanho / 1024 / 1024).toFixed(1)} MB
          </p>
          <video controls playsInline preload="metadata" src={rascunho.video} className="max-h-72 w-full rounded-[var(--radius-control)] bg-black" />
          <button type="button" className="btn-secondary" onClick={r.removerVideo} disabled={desabilitado}>
            <Trash2 className="size-4" aria-hidden />
            Remover vídeo
          </button>
        </div>
      )}
    </fieldset>
  )
}

/** Visualização do material para quem revisa a entrega. */
export function VisualizarMaterial({ material }: { material: Material | null }) {
  if (!material) return <p className="text-sm text-ink-muted">Nenhum material anexado.</p>
  const links: [string, string][] = (
    [
      ['Abrir no Canva', material.canva],
      ['Abrir no Google Drive', material.drive],
      ['Abrir arte', material.arte],
    ] as [string, string][]
  ).filter(([, u]) => u)
  return (
    <div className="space-y-3">
      {links.length > 0 && (
        <ul className="space-y-1.5">
          {links.map(([rotulo, url]) => (
            <li key={rotulo} className="text-sm">
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-brand-600 underline-offset-2 hover:underline">
                {rotulo}
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(abre em outra aba)</span>
              </a>
              <span className="block truncate text-xs text-ink-muted">{url}</span>
            </li>
          ))}
        </ul>
      )}
      {material.video && (
        <div className="space-y-1.5">
          <p className="text-xs text-ink-soft">{material.videoNome}</p>
          <video controls playsInline preload="metadata" src={material.video} className="max-h-80 w-full rounded-[var(--radius-control)] bg-black" />
          <p className="text-xs text-ink-muted">
            Vídeo local desta sessão: só pode ser visto nesta aba e neste navegador. Se o formato não reproduzir,{' '}
            <a href={material.video} download={material.videoNome} className="font-medium text-brand-600 underline">
              baixe o vídeo
            </a>
            .
          </p>
        </div>
      )}
    </div>
  )
}
