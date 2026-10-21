import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, FileText, Film, FolderOpen, Image as ImageIcon, Search } from 'lucide-react'
import {
  DRIVE_ATALHOS,
  DRIVE_DATA_CONSULTA,
  DRIVE_GUIA,
  DRIVE_ITENS_POR_PAGINA,
  DRIVE_RAIZ_PASTA,
  DRIVE_RAIZ_URL,
} from '../data/constants'
import type { EmpresaId, TipoItemDrive } from '../data/types'
import { carregarCatalogoDrive } from '../data/armazenamento'
import { idDoArquivo, indexar, pesquisar, termosDaBusca, urlMiniatura, urlPrevia, type IndiceDrive, type ItemIndexado } from '../lib/drive'
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
  const [tipo, setTipo] = useState<TipoItemDrive | ''>('')
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
        <p className="mt-1 text-sm text-ink-muted">Navegue pelas pastas ou encontre materiais por palavras-chave.</p>
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
          <select className="field-control mt-1" value={tipo} onChange={(e) => setTipo(e.target.value as TipoItemDrive | '')}>
            <option value="">Todos os tipos</option>
            {(['Foto', 'Vídeo', 'Documento', 'Pasta'] as const).map((t) => (
              <option key={t}>{t}</option>
            ))}
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
        <strong className="tabular-nums">{resultados.length.toLocaleString('pt-BR')}</strong> resultados ·{' '}
        {comTermos ? 'nesta pasta e subpastas' : 'conteúdo direto da pasta'}
      </p>

      {visiveis.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((x) => (
            <CartaoDrive key={x.indice} x={x} indice={indice} onAbrirPasta={abrirPasta} onPrevia={setPrevia} />
          ))}
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
            Consulta de {DRIVE_DATA_CONSULTA}: {indice.itens.length.toLocaleString('pt-BR')} itens. Dez pastas têm listagem
            parcial, então o catálogo não está completo.
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

const ICONE_TIPO = { Pasta: FolderOpen, Foto: ImageIcon, Vídeo: Film, Documento: FileText }

function CartaoDrive({
  x,
  indice,
  onAbrirPasta,
  onPrevia,
}: {
  x: ItemIndexado
  indice: IndiceDrive
  onAbrirPasta: (p: string) => void
  onPrevia: (x: ItemIndexado) => void
}) {
  const pasta = x.type === 'Pasta'
  const capa = pasta ? indice.capas.get(x.path) : x
  const idCapa = idDoArquivo(capa?.url)
  const [falhou, setFalhou] = useState(false)
  const Icone = ICONE_TIPO[x.type] ?? FileText
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-brand-600 to-brand-500 text-white">
        <Icone className="size-10 opacity-60" aria-hidden />
        {idCapa && !falhou && (
          <img
            src={urlMiniatura(idCapa)}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFalhou(true)}
            className={cx('absolute inset-0 size-full object-cover', pasta && 'opacity-45')}
          />
        )}
        {pasta && (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-base font-semibold break-words">
            {x.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="eyebrow">{pasta ? 'Coleção · Pasta' : x.type}</p>
        <h3 className="text-sm font-semibold break-words text-ink">{x.name}</h3>
        <p className="text-[11px] break-words text-ink-muted">{x.pai}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {pasta ? (
            <button type="button" className="btn-primary flex-1" onClick={() => onAbrirPasta(x.path)}>
              Abrir pasta
              <span className="sr-only">: {x.name}</span>
            </button>
          ) : (
            <button type="button" className="btn-primary flex-1" onClick={() => onPrevia(x)}>
              Visualizar prévia
              <span className="sr-only">: {x.name}</span>
            </button>
          )}
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

function PreviaDrive({ x, onFechar }: { x: ItemIndexado; onFechar: () => void }) {
  const id = idDoArquivo(x.url)
  return (
    <Dialog
      aberto
      variante="central"
      titulo={x.name}
      descricao={x.pai}
      onFechar={onFechar}
      largura="max-w-5xl h-[88vh]"
      rodape={
        <>
          <p className="mr-auto self-center text-xs text-ink-muted">
            Se a prévia não carregar, o formato ou as permissões do Google Drive podem impedir a exibição.
          </p>
          <a href={x.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
            Abrir no Drive
            <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(abre em outra aba)</span>
          </a>
        </>
      }
    >
      {id ? (
        <iframe title={`Prévia de ${x.name}`} src={urlPrevia(id)} allow="fullscreen" allowFullScreen className="h-full min-h-[60vh] w-full rounded-[var(--radius-control)] border-0 bg-surface-muted" />
      ) : (
        <Nota tom="aviso">A prévia deste item está indisponível. Use “Abrir no Drive” para vê-lo no Google Drive.</Nota>
      )}
    </Dialog>
  )
}
