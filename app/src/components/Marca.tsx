/**
 * Marca exibida no menu. Nenhum logotipo oficial foi encontrado no projeto:
 * por isso o nome aparece em texto. Ao receber o arquivo oficial, coloque-o em
 * src/assets/ e substitua o conteúdo deste componente por <img alt="…">.
 */
export function Marca() {
  return (
    <div>
      <p className="font-display text-[17px] leading-tight font-semibold tracking-[0.04em] text-white uppercase">
        Grupo Mendes
      </p>
      <p className="mt-0.5 text-[11px] tracking-[0.08em] text-sidebar-muted uppercase">Gestão de marketing</p>
    </div>
  )
}
