import { NOME_DO_SISTEMA } from '../data/constants'

/**
 * Marca exibida no menu. O logotipo oficial do Centro Liderar ainda não foi
 * enviado ao projeto: por isso o nome aparece em texto. Ao receber o arquivo
 * oficial, coloque-o em src/assets/ e substitua o primeiro parágrafo por
 * <img alt="Centro Liderar">.
 */
export function Marca() {
  const [nome, subtitulo] = NOME_DO_SISTEMA.split(' — ')
  return (
    <div>
      <p className="font-display text-[18px] leading-tight font-semibold tracking-[0.04em] text-white uppercase">{nome}</p>
      <p className="mt-0.5 text-[11px] tracking-[0.08em] text-sidebar-muted uppercase">{subtitulo}</p>
    </div>
  )
}
