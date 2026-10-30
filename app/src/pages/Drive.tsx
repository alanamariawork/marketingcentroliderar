import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  CalendarDays,
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
  anosDisponiveis,
  diaDe,
  FILTRO_DATA_VAZIO,
  idDoArquivo,
  indexar,
  ORDENS_DRIVE,
  pesquisaNaArvore,
  pesquisar,
  ROTULO_BASE_DATA,
  urlMiniatura,
  urlPrevia,
  type BaseData,
  type FiltroData,
  type FiltroTipoDrive,
  type IndiceDrive,
  type ItemIndexado,
  type ModoData,
  type OrdemDrive,
} from '../lib/drive'
import { formatarData } from '../lib/dates'
import { Criativos } from './Criativos'
import { CapaGrafica, Miniatura } from '../components/MiniaturaDrive'
import { cx } from '../lib/format'
import { Carregando, EstadoErro, EstadoVazio } from '../components/Estados'
import { Dialog } from '../components/Dialog'
import { Etiqueta, Nota } from '../components/Selos'
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
  return <AbasDrive />
}

type Aba = 'acervo' | 'criativos'
const ABAS: { id: Aba; rotulo: string; descricao: string }[] = [
  { id: 'acervo', rotulo: 'Acervo', descricao: 'Fotos e vídeos do Google Drive' },
  { id: 'criativos', rotulo: 'Criativos', descricao: 'Artes e vídeos produzidos' },
]

function AbasDrive() {
  const [aba, setAba] = useState<Aba>('acervo')
  const refs = useRef<Record<Aba, HTMLButtonElement | null>>({ acervo: null, criativos: null })
  function teclar(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const proxima: Aba = aba === 'acervo' ? 'criativos' : 'acervo'
    setAba(proxima)
    refs.current[proxima]?.focus()
  }
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Áreas do Drive" className="flex gap-1 border-b border-line" onKeyDown={teclar}>
        {ABAS.map((x) => (
          <button
            key={x.id}
            ref={(el) => {
              refs.current[x.id] = el
            }}
            type="button"
            role="tab"
            id={`aba-${x.id}`}
            aria-selected={aba === x.id}
            aria-controls={`painel-${x.id}`}
            tabIndex={aba === x.id ? 0 : -1}
            onClick={() => setAba(x.id)}
            className={cx(
              '-mb-px border-b-2 px-4 py-2.5 text-left text-sm',
              aba === x.id ? 'border-brand-600 font-semibold text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {x.rotulo}
            <span className="hidden text-xs font-normal text-ink-muted sm:block">{x.descricao}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {aba === 'acervo' ? <BibliotecaLiderar /> : <Criativos />}
      </div>
    </div>
  )
}

function BibliotecaLiderar() {
  const { indice, erro, tentarDeNovo } = useIndiceDrive()
  const [pasta, setPasta] = useState(DRIVE_RAIZ_PASTA)
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<FiltroTipoDrive>('')
  const [relacionados, setRelacionados] = useState(true)
  const [data, setData] = useState<FiltroData>(FILTRO_DATA_VAZIO)
  const [ordem, setOrdem] = useState<OrdemDrive>('relevancia')
  const [inicio, setInicio] = useState(0)
  const [previa, setPrevia] = useState<ItemIndexado | null>(null)
  const topo = useRef<HTMLDivElement>(null)

  // Pesquisa com pequena espera enquanto a pessoa digita.
  useEffect(() => {
    const t = setTimeout(() => setBusca(texto), 180)
    return () => clearTimeout(t)
  }, [texto])
  useEffect(() => setInicio(0), [busca, tipo, relacionados, pasta, data, ordem])

  const resultados = useMemo(
    () => (indice ? pesquisar(indice, { texto: busca, tipo, pasta, relacionados, data, ordem }) : []),
    [indice, busca, tipo, pasta, relacionados, data, ordem],
  )
  const anos = useMemo(() => (indice ? anosDisponiveis(indice.itens, data.base) : []), [indice, data.base])

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
  const naArvore = pesquisaNaArvore({ texto: busca, data })
  const semDatas = indice.datados[data.base] === 0
  const mudarData = (m: Partial<FiltroData>) => setData((d) => ({ ...d, ...m }))

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
      <fieldset className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_2fr_1fr]">
        <legend className="sr-only">Datas e ordenação</legend>
        <label className="text-sm text-ink-soft">
          Data usada
          <select className="field-control mt-1" value={data.base} onChange={(e) => mudarData({ base: e.target.value as BaseData, ano: '' })}>
            {(Object.keys(ROTULO_BASE_DATA) as BaseData[]).map((b) => (
              <option key={b} value={b}>
                {ROTULO_BASE_DATA[b]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Período
          <select className="field-control mt-1" value={data.modo} onChange={(e) => mudarData({ modo: e.target.value as ModoData })}>
            <option value="todas">Qualquer data</option>
            <option value="ano">Por ano</option>
            <option value="intervalo">Por intervalo de datas</option>
            <option value="sem-data">Somente “Data não informada”</option>
          </select>
        </label>
        <div className="text-sm text-ink-soft">
          {data.modo === 'ano' ? (
            <label className="block">
              Ano
              <select className="field-control mt-1" value={data.ano} onChange={(e) => mudarData({ ano: e.target.value })} disabled={!anos.length}>
                <option value="">{anos.length ? 'Todos os anos com data' : 'Nenhum ano no catálogo'}</option>
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          ) : data.modo === 'intervalo' ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                Data inicial
                <input type="date" className="field-control mt-1" value={data.de} max={data.ate || undefined} onChange={(e) => mudarData({ de: e.target.value })} />
              </label>
              <label className="block">
                Data final
                <input type="date" className="field-control mt-1" value={data.ate} min={data.de || undefined} onChange={(e) => mudarData({ ate: e.target.value })} />
              </label>
            </div>
          ) : (
            <p className="mt-6 text-xs text-ink-muted">
              {data.modo === 'sem-data'
                ? 'Mostrando só itens sem esta data no catálogo.'
                : 'Escolha “Por ano” ou “Por intervalo de datas” (um de cada vez).'}
            </p>
          )}
        </div>
        <label className="text-sm text-ink-soft">
          Ordenar por
          <select className="field-control mt-1" value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemDrive)}>
            {ORDENS_DRIVE.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-ink-muted md:col-span-4">
          Datas do Google Drive: criação e última modificação do arquivo no Drive. Elas não representam necessariamente
          a data de gravação ou do evento. Nada é deduzido pelo nome do arquivo. Nas ordenações por data, itens sem data
          ficam no fim; as pastas vêm antes dos arquivos e usam a data da própria pasta.
        </p>
        {semDatas && (
          <div className="md:col-span-4">
            <Nota tom="aviso">
              O catálogo atual (consulta de {DRIVE_DATA_CONSULTA}) não traz a {ROTULO_BASE_DATA[data.base].toLowerCase()}.
              Por isso todos os itens aparecem como “Data não informada” e os filtros por ano e intervalo não encontram
              resultados. É preciso atualizar o catálogo com as datas do Google Drive (createdTime e modifiedTime).
            </Nota>
          </div>
        )}
      </fieldset>
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-ghost px-2.5 py-1 text-xs"
          onClick={() => {
            setTexto('')
            setBusca('')
            setTipo('')
            setData(FILTRO_DATA_VAZIO)
            setOrdem('relevancia')
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
        <ResumoResultados itens={resultados} /> · {naArvore ? 'nesta pasta e subpastas' : 'conteúdo direto da pasta'} ·
        Data usada: <strong>{ROTULO_BASE_DATA[data.base]}</strong>
      </p>

      {visiveis.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((x) =>
            x.type === 'Pasta' ? (
              <CartaoPasta key={x.indice} x={x} indice={indice} base={data.base} onAbrir={abrirPasta} />
            ) : (
              <CartaoMidia key={x.indice} x={x} base={data.base} onPrevia={setPrevia} />
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

/** Selo de ano (da data escolhida) e linha com a última modificação no Drive. */
function DatasDoItem({ x, base, pasta }: { x: ItemIndexado; base: BaseData; pasta?: boolean }) {
  const ano = diaDe(x, base).slice(0, 4)
  const modificacao = diaDe(x, 'modificacao')
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {ano ? (
          <Etiqueta>
            <CalendarDays className="mr-1 size-3" aria-hidden />
            <span className="sr-only">Ano ({ROTULO_BASE_DATA[base]}): </span>
            {ano}
          </Etiqueta>
        ) : null}
      </div>
      <p className="text-[11px] text-ink-muted">
        {modificacao
          ? `${pasta ? 'Pasta modificada' : 'Modificado'} no Drive em ${formatarData(modificacao)}`
          : `${pasta ? 'Modificação da pasta' : 'Última modificação'}: Data não informada`}
        {base === 'criacao' && ` · Criação: ${diaDe(x, 'criacao') ? formatarData(diaDe(x, 'criacao')) : 'Data não informada'}`}
      </p>
    </>
  )
}

function CartaoPasta({ x, indice, base, onAbrir }: { x: ItemIndexado; indice: IndiceDrive; base: BaseData; onAbrir: (p: string) => void }) {
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
        <DatasDoItem x={x} base={base} pasta />
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

function CartaoMidia({ x, base, onPrevia }: { x: ItemIndexado; base: BaseData; onPrevia: (x: ItemIndexado) => void }) {
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
        <DatasDoItem x={x} base={base} />
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
