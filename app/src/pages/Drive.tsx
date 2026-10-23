import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Building2,
  Camera,
  ExternalLink,
  Film,
  FolderOpen,
  Gem,
  Image as ImageIcon,
  Loader2,
  MonitorPlay,
  Radio,
  Search,
  Sparkles,
  Target,
  UserRound,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react'
import {
  type IconeTema,
  DRIVE_ATALHOS,
  DRIVE_DATA_CONSULTA,
  DRIVE_GUIA,
  DRIVE_ITENS_POR_PAGINA,
  DRIVE_RAIZ_PASTA,
  DRIVE_RAIZ_URL,
} from '../data/constants'
import type { EmpresaId } from '../data/types'
import { carregarCatalogoDrive } from '../data/armazenamento'
import {
  idDoArquivo,
  indexar,
  pesquisar,
  termosDaBusca,
  urlMiniatura,
  urlPrevia,
  type FiltroTipoDrive,
  type IndiceDrive,
  type ItemIndexado,
} from '../lib/drive'
import { cx } from '../lib/format'
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados'
import { Dialog } from '../components/Dialog'
import { Nota } from '../components/Selos'
import { Paginacao } from '../components/TabelaInsights'

let indiceEmCache: IndiceDrive | null = null

function useIndiceDrive() {
  const [indice, setIndice] = useState<IndiceDrive | null>(indiceEmCache)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    if (indiceEmCache) return
    let ativo = true
    setErro(null)
    carregarCatalogoDrive()
      .then((c) => {
        indiceEmCache = indexar(c)
        if (ativo) setIndice(indiceEmCache)
      })
      .catch(() => ativo && setErro('Não foi possível carregar o catálogo do Drive. Verifique a conexão e tente novamente.'))
    return () => {
      ativo = false
    }
  }, [tentativa])
  return { indice, erro, tentarDeNovo: () => setTentativa((t) => t + 1) }
}

/** Somente o Centro Liderar tem biblioteca configurada nesta etapa. */
export function Drive({ empresaId }: { empresaId: EmpresaId }) {
  if (empresaId !== 'centro-liderar') {
    return (
      <EstadoVazio icone={FolderOpen} titulo="A biblioteca desta empresa ainda não foi configurada.">
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          Quando houver uma pasta do Google Drive definida para esta empresa, o catálogo dela poderá ser exibido aqui.
        </p>
      </EstadoVazio>
    )
  }
  return <BibliotecaLiderar />
}

function BibliotecaLiderar() {
  const { indice, erro, tentarDeNovo } = useIndiceDrive()
  const [pasta, setPasta] = useState(DRIVE_RAIZ_PASTA)
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<FiltroTipoDrive>('')
  const [relacionados, setRelacionados] = useState(true)
  const [inicio, setInicio] = useState(0)
  const [previa, setPrevia] = useState<ItemIndexado | null>(null)
  const topo = useRef<HTMLDivElement>(null)

  // Pesquisa com pequena espera enquanto a pessoa digita.
  useEffect(() => {
    const t = setTimeout(() => setBusca(texto), 180)
    return () => clearTimeout(t)
  }, [texto])
  useEffect(() => setInicio(0), [busca, tipo, relacionados, pasta])

  const resultados = useMemo(
    () => (indice ? pesquisar(indice, { texto: busca, tipo, pasta, relacionados }) : []),
    [indice, busca, tipo, pasta, relacionados],
  )

  if (erro) return <EstadoErro mensagem={erro} onTentar={tentarDeNovo} />
  if (!indice) return <Carregando texto="Carregando o catálogo do Drive (68.592 itens)…" />

  const partes = pasta.split(' / ')
  const subpastas = indice.subpastas.get(pasta) ?? []
  const abrirPasta = (p: string) => {
    setPasta(p)
    setTexto('')
    setBusca('')
    topo.current?.scrollIntoView({ block: 'start' })
  }
  const visiveis = resultados.slice(inicio, inicio + DRIVE_ITENS_POR_PAGINA)
  const comTermos = termosDaBusca(busca).length > 0

  return (
    <div className="space-y-5" ref={topo}>
      <header className="card bg-gradient-to-br from-surface to-surface-muted p-5">
        <p className="eyebrow">Acervo de conteúdos · LIDERAR</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Biblioteca de conteúdos</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Fotos e vídeos do acervo, organizados pelas pastas do Google Drive. Navegue pelas pastas ou pesquise por
          palavras-chave.
        </p>
      </header>

      <nav aria-label="Caminho da pasta" className="flex flex-wrap items-center gap-1 text-sm">
        {partes.map((parte, i) => {
          const caminho = partes.slice(0, i + 1).join(' / ')
          const atual = i === partes.length - 1
          return (
            <span key={caminho} className="flex items-center gap-1">
              {i > 0 && <span className="text-ink-muted" aria-hidden>/</span>}
              <button
                type="button"
                aria-current={atual ? 'page' : undefined}
                onClick={() => abrirPasta(caminho)}
                className={cx('rounded px-1.5 py-0.5 hover:bg-surface-muted', atual ? 'font-semibold text-ink' : 'text-brand-600')}
              >
                {parte}
              </button>
            </span>
          )
        })}
      </nav>

      <div className="card grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="text-sm text-ink-soft">
          Palavras-chave
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              className="field-control pl-9"
              placeholder="Ex.: fotos Jaciara, bastidores MQA, vídeos equipe…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </span>
        </label>
        <label className="text-sm text-ink-soft">
          Tipo
          <select className="field-control mt-1" value={tipo} onChange={(e) => setTipo(e.target.value as FiltroTipoDrive)}>
            <option value="">Fotos, vídeos e pastas</option>
            <option value="Foto">Somente fotos</option>
            <option value="Vídeo">Somente vídeos</option>
            <option value="Pasta">Somente pastas</option>
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Pasta
          <select
            className="field-control mt-1"
            value=""
            onChange={(e) => e.target.value && abrirPasta(e.target.value)}
            disabled={!subpastas.length && pasta === DRIVE_RAIZ_PASTA}
          >
            <option value="">{subpastas.length ? 'Ir para subpasta…' : 'Sem subpastas'}</option>
            {pasta !== DRIVE_RAIZ_PASTA && <option value={DRIVE_RAIZ_PASTA}>LIDERAR (início)</option>}
            {subpastas.map((s) => (
              <option key={s.path} value={s.path}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Modo de pesquisa
          <select className="field-control mt-1" value={relacionados ? 'r' : 'l'} onChange={(e) => setRelacionados(e.target.value === 'r')}>
            <option value="r">Com termos relacionados</option>
            <option value="l">Só as palavras digitadas</option>
          </select>
        </label>
      </div>
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-ghost px-2.5 py-1 text-xs"
          onClick={() => {
            setTexto('')
            setBusca('')
            setTipo('')
          }}
        >
          Limpar filtros
        </button>
        {DRIVE_ATALHOS.map((w) => (
          <button key={w} type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setTexto(w)}>
            {w}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        A pesquisa compara nomes e caminhos, sem diferenciar acentos e maiúsculas, e usa um dicionário local de termos
        relacionados. Ela não analisa o conteúdo das fotos e vídeos e não utiliza um modelo de IA conectado.
      </p>

      <p aria-live="polite" className="text-sm text-ink-soft">
        <ResumoResultados itens={resultados} /> · {comTermos ? 'nesta pasta e subpastas' : 'conteúdo direto da pasta'}
      </p>

      {visiveis.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((x) =>
            x.type === 'Pasta' ? (
              <CartaoPasta key={x.indice} x={x} indice={indice} onAbrir={abrirPasta} />
            ) : (
              <CartaoMidia key={x.indice} x={x} onPrevia={setPrevia} />
            ),
          )}
        </ul>
      ) : (
        <EstadoVazio icone={Search} titulo="Nenhum material encontrado.">
          <p className="mt-1 max-w-md text-sm text-ink-muted">Tente outra palavra-chave, outro tipo ou volte para a pasta LIDERAR.</p>
        </EstadoVazio>
      )}
      <Paginacao inicio={inicio} porPagina={DRIVE_ITENS_POR_PAGINA} total={resultados.length} onMudar={(n) => { setInicio(n); topo.current?.scrollIntoView({ block: 'start' }) }} />

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">Sobre o catálogo e sua atualização</summary>
        <div className="mt-3 space-y-2 text-sm text-ink-soft">
          <p>
            Consulta de {DRIVE_DATA_CONSULTA}: 68.592 itens catalogados. Dez pastas têm listagem parcial, então o
            catálogo não está completo.
          </p>
          <p>
            Esta biblioteca mostra somente fotos e vídeos e as pastas que têm fotos ou vídeos catalogados. Ficaram de
            fora {indice.ignorados.toLocaleString('pt-BR')} arquivos: documentos, planilhas, apresentações, PDFs,
            áudios, arquivos de criação (Corel, Photoshop), atalhos e arquivos sem tipo identificado. Uma pasta ausente
            aqui pode ter fotos ou vídeos que o catálogo não listou: ausência no catálogo não prova que a pasta está
            vazia. Nada foi movido ou excluído no Google Drive.
          </p>
          <p>
            O catálogo não é sincronizado automaticamente: novos arquivos do Drive só aparecem quando o catálogo for
            atualizado. Pastas e arquivos conservam a organização original do Google Drive. A abertura e a prévia
            respeitam as permissões de cada arquivo no Google Drive.
          </p>
        </div>
      </details>

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">Guia de organização desejada · {DRIVE_GUIA.length} caminhos</summary>
        <p className="mt-3 text-sm text-ink-soft">
          Estrutura planejada, apenas como orientação. Este guia não move nem renomeia arquivos reais; a navegação acima
          usa as pastas reais do acervo.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {DRIVE_GUIA.map(([caminho, descricao]) => (
            <li key={caminho} className="rounded-[var(--radius-control)] border border-line p-3">
              <p className="text-sm font-semibold text-ink">LIDERAR / {caminho}</p>
              <p className="text-xs text-ink-muted">{descricao}</p>
            </li>
          ))}
        </ul>
      </details>

      {previa && <PreviaDrive x={previa} onFechar={() => setPrevia(null)} />}

      {/* Botão geral: somente no final da aba */}
      <div className="flex justify-end border-t border-line pt-5">
        <a href={DRIVE_RAIZ_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          Abrir LIDERAR no Google Drive
          <ExternalLink className="size-4" aria-hidden />
          <span className="sr-only">(abre em outra aba)</span>
        </a>
      </div>
    </div>
  )
}

const ICONE_TEMA: Record<IconeTema, LucideIcon> = {
  pessoa: UserRound,
  predio: Building2,
  estrela: Sparkles,
  diamante: Gem,
  camera: Camera,
  transmissao: MonitorPlay,
  evento: Radio,
  alvo: Target,
}

const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

function ResumoResultados({ itens }: { itens: ItemIndexado[] }) {
  let pastas = 0
  let fotos = 0
  let videos = 0
  for (const x of itens) {
    if (x.type === 'Pasta') pastas++
    else if (x.midia === 'Foto') fotos++
    else videos++
  }
  return (
    <strong className="tabular-nums">
      {[plural(pastas, 'pasta', 'pastas'), plural(fotos, 'foto', 'fotos'), plural(videos, 'vídeo', 'vídeos')].join(' · ')}
    </strong>
  )
}

/** Miniatura do Drive carregada sob demanda; se falhar, mostra a alternativa. */
function Miniatura({ id, alternativa, className }: { id: string; alternativa: ReactNode; className?: string }) {
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

function CapaGrafica({ titulo, icone: Icone }: { titulo: string; icone: LucideIcon }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-brand-700 to-brand-500 p-4 text-white">
      <Icone className="absolute top-3 right-3 size-12 opacity-30" aria-hidden />
      <p className="line-clamp-2 text-lg leading-tight font-semibold break-words">{titulo}</p>
    </div>
  )
}

function CartaoPasta({ x, indice, onAbrir }: { x: ItemIndexado; indice: IndiceDrive; onAbrir: (p: string) => void }) {
  const { tema, foto } = indice.capaDe(x.path)
  const contagem = indice.contagens.get(x.path) ?? { fotos: 0, videos: 0 }
  const Icone = tema ? ICONE_TEMA[tema.icone] : FolderOpen
  const rotulo = tema?.rotulo ?? 'Pasta'
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-700">
        <Miniatura
          id={idDoArquivo(foto?.url)}
          alternativa={<CapaGrafica titulo={x.name} icone={Icone} />}
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Icone className="size-3.5" aria-hidden />
          {rotulo}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-base leading-snug font-semibold break-words text-ink">{x.name}</h3>
        <p className="text-xs break-words text-ink-muted">{x.pai}</p>
        <p className="text-sm text-ink-soft tabular-nums">
          {plural(contagem.fotos, 'foto', 'fotos')} · {plural(contagem.videos, 'vídeo', 'vídeos')} catalogados
        </p>
        <p className="text-[11px] text-ink-muted">
          {foto ? `Capa: ${foto.name}` : tema ? `Capa gráfica · ${tema.descricao}` : 'Capa gráfica'}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <button type="button" className="btn-primary flex-1" onClick={() => onAbrir(x.path)}>
            Abrir pasta
            <span className="sr-only">: {x.name}</span>
          </button>
          <a href={x.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
            Abrir no Drive
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">: {x.name} (abre em outra aba)</span>
          </a>
        </div>
      </div>
    </li>
  )
}

function CartaoMidia({ x, onPrevia }: { x: ItemIndexado; onPrevia: (x: ItemIndexado) => void }) {
  const video = x.midia === 'Vídeo'
  const Icone = video ? Film : ImageIcon
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        <Miniatura
          id={idDoArquivo(x.url)}
          alternativa={
            <div className="absolute inset-0 flex items-center justify-center text-ink-muted">
              <Icone className="size-10" aria-hidden />
            </div>
          }
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
          <Icone className="size-3.5" aria-hidden />
          {x.midia}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-sm font-semibold break-words text-ink">{x.name}</h3>
        <p className="text-[11px] break-words text-ink-muted">{x.pai}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <button type="button" className="btn-primary flex-1" onClick={() => onPrevia(x)}>
            Visualizar prévia
            <span className="sr-only">: {x.name}</span>
          </button>
          <a href={x.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1">
            Abrir no Drive
            <ExternalLink className="size-3.5" aria-hidden />
            <span className="sr-only">: {x.name} (abre em outra aba)</span>
          </a>
        </div>
      </div>
    </li>
  )
}

/** Tempo máximo de espera antes de orientar a pessoa (a prévia nunca fica carregando sem explicação). */
const ESPERA_PREVIA_MS = 15000

/**
 * Fotos: imagem ampliada gerada pelo Drive (o carregamento é verificável).
 * Vídeos: player incorporado do Drive, com controles. O carregamento do iframe
 * não prova que o vídeo apareceu, então a orientação continua visível.
 */
function PreviaDrive({ x, onFechar }: { x: ItemIndexado; onFechar: () => void }) {
  const id = idDoArquivo(x.url)
  const video = x.midia === 'Vídeo'
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'falhou' | 'demorando'>(id ? 'carregando' : 'falhou')
  const [ampliada, setAmpliada] = useState(false)

  useEffect(() => {
    if (estado !== 'carregando') return
    const t = setTimeout(() => setEstado('demorando'), ESPERA_PREVIA_MS)
    return () => clearTimeout(t)
  }, [estado])

  return (
    <Dialog
      aberto
      variante="central"
      titulo={x.name}
      descricao={`${x.midia} · ${x.pai}`}
      onFechar={onFechar}
      largura="max-w-5xl"
      rodape={
        <>
          {!video && estado === 'ok' && (
            <button type="button" className="btn-secondary mr-auto" aria-pressed={ampliada} onClick={() => setAmpliada((v) => !v)}>
              {ampliada ? <ZoomOut className="size-4" aria-hidden /> : <ZoomIn className="size-4" aria-hidden />}
              {ampliada ? 'Ajustar à tela' : 'Ampliar'}
            </button>
          )}
          <a href={x.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Abrir no Drive
            <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(abre em outra aba)</span>
          </a>
        </>
      }
    >
      <div className="space-y-3">
        {(estado === 'carregando' || estado === 'demorando') && id && (
          <p role="status" className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Carregando a prévia do Google Drive…
          </p>
        )}
        {estado === 'demorando' && (
          <Nota tom="aviso">
            A prévia está demorando. Arquivos grandes ou recém-enviados podem ainda estar em processamento no Google
            Drive. Use “Abrir no Drive” para ver o arquivo.
          </Nota>
        )}
        {estado === 'falhou' && (
          <Nota tom="aviso">
            {id
              ? `Não foi possível exibir a prévia deste ${video ? 'vídeo' : 'arquivo'}. O formato pode não ter miniatura no Google Drive (como RAW ou HEIC), o arquivo pode exigir permissão de acesso ou o navegador pode estar bloqueando o Google Drive.`
              : 'Este item não tem um endereço de arquivo do Google Drive que permita prévia.'}{' '}
            Use “Abrir no Drive” para vê-lo no Google Drive.
          </Nota>
        )}
        {id && !video && estado !== 'falhou' && (
          <div className={cx('rounded-[var(--radius-control)] bg-surface-muted', ampliada ? 'max-h-[70vh] overflow-auto' : 'flex justify-center')}>
            <img
              src={urlMiniatura(id, 1600)}
              alt={`Prévia ampliada de ${x.name}`}
              referrerPolicy="no-referrer"
              onLoad={() => setEstado('ok')}
              onError={() => setEstado('falhou')}
              className={cx(ampliada ? 'max-w-none' : 'max-h-[65vh] w-auto max-w-full object-contain', estado !== 'ok' && 'h-0')}
            />
          </div>
        )}
        {id && video && estado !== 'falhou' && (
          <>
            <iframe
              title={`Player do Google Drive: ${x.name}`}
              src={urlPrevia(id)}
              allow="autoplay; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
              onLoad={() => setEstado('ok')}
              className="aspect-video w-full rounded-[var(--radius-control)] border-0 bg-black"
            />
            <p className="text-xs text-ink-muted">
              O vídeo é reproduzido pelo player do Google Drive, com os controles dele. Se o player mostrar erro, pedir
              acesso ou avisar que o vídeo ainda está em processamento, use “Abrir no Drive”.
            </p>
          </>
        )}
      </div>
    </Dialog>
  )
}
