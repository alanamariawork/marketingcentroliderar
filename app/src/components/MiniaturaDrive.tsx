import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { urlMiniatura } from '../lib/drive'
import { cx } from '../lib/format'

/** Miniatura do Drive carregada sob demanda; se falhar, mostra a alternativa. */
export function Miniatura({ id, alternativa, className }: { id: string; alternativa: ReactNode; className?: string }) {
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'falhou'>(id ? 'carregando' : 'falhou')
  return (
    <>
      {estado !== 'ok' && alternativa}
      {id && estado !== 'falhou' && (
        <img
          src={urlMiniatura(id)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setEstado('ok')}
          onError={() => setEstado('falhou')}
          className={cx('absolute inset-0 size-full object-cover', estado === 'carregando' && 'opacity-0', className)}
        />
      )}
    </>
  )
}

export function CapaGrafica({ titulo, icone: Icone }: { titulo: string; icone: LucideIcon }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-brand-700 to-brand-500 p-4 text-white">
      <Icone className="absolute top-3 right-3 size-12 opacity-30" aria-hidden />
      <p className="line-clamp-2 text-lg leading-tight font-semibold break-words">{titulo}</p>
    </div>
  )
}

