import { useMemo, useState } from 'react'
import { CalendarDays, FolderOpen, FolderPlus, Layers, Pencil, Plus, Search } from 'lucide-react'
import { FORMATOS_POSTAGEM, RESPONSAVEIS_ATRIBUIVEIS } from '../data/constants'
import type { Criativo, EventoCampanha, FormatoPostagem, Responsavel, StatusCriativo } from '../data/types'
import {
  agruparPorEvento,
  filtrarCriativos,
  filtrosAtivos,
  FILTROS_CRIATIVOS_VAZIOS,
  ordenarCriativos,
  STATUS_CRIATIVO,
  statusDoCriativo,
  versaoAtual,
  type FiltrosCriativos,
  type GrupoCriativos,
} from '../lib/criativos'
import { diaDoCarimbo, formatarData } from '../lib/dates'
import { cx } from '../lib/format'
import { useCriativos } from '../state/Criativos'
import { useModais } from '../state/Modais'
import { CapaCriativo } from '../components/PecasCriativo'
import { EstadoVazio } from '../components/Estados'
import { Etiqueta, Nota, SeloPessoa, SeloStatusCriativo, SeloTipo } from '../components/Selos'

const SEM_EVENTO = '-'
const plural = (n: number, um: string, varios: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

/**
 * Drive › Criativos: artes e vídeos produzidos (inclusive no Canva), na pasta
 * lógica "Produção", agrupados por evento ou campanha. Organização do sistema:
 * nada é criado nem movido no Google Drive.
 */
export function Criativos() {
  const { criativos, eventos, aviso } = useCriativos()
  const [nivel, setNivel] = useState<'raiz' | 'producao'>('raiz')
  /** null = todos os grupos; SEM_EVENTO = sem evento vinculado; senão, id do evento. */
  const [grupo, setGrupo] = useState<string | null>(null)

  const abrirProducao = () => {
    setNivel('producao')
    setGrupo(null)
  }

  return (
    <div className="space-y-5">
      <header className="card bg-gradient-to-br from-surface to-surface-muted p-5">
        <p className="eyebrow">Criativos · Centro Liderar</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Artes e vídeos produzidos</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Materiais feitos pela equipe, inclusive no Canva, organizados por evento ou campanha, com revisão e aprovação
          por versão.
        </p>
      </header>

      <nav aria-label="Caminho dos criativos" className="flex flex-wrap items-center gap-1 text-sm">
        <Migalha atual={nivel === 'raiz'} onClick={() => setNivel('raiz')}>
          Criativos
        </Migalha>
        {nivel === 'producao' && (
          <>
            <span className="text-ink-muted" aria-hidden>/</span>
            <Migalha atual={grupo === null} onClick={abrirProducao}>
              Produção
            </Migalha>
          </>
        )}
        {nivel === 'producao' && grupo !== null && (
          <>
            <span className="text-ink-muted" aria-hidden>/</span>
            <Migalha atual onClick={() => {}}>
              {grupo === SEM_EVENTO ? 'Sem evento vinculado' : (eventos.find((e) => e.id === grupo)?.nome ?? 'Evento')}
            </Migalha>
          </>
        )}
      </nav>

      {aviso && <Nota tom="aviso">{aviso}</Nota>}

      {nivel === 'raiz' ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <li className="card flex flex-col overflow-hidden">
            <div className="relative aspect-[4/3] overflow-hidden bg-brand-700">
              <CapaCriativo peca={ordenarCriativos(criativos)[0]?.versoes.at(-1)?.pecas[0]} titulo="Produção" />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                <FolderOpen className="size-3.5" aria-hidden />
                Pasta do sistema
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <h3 className="text-base font-semibold text-ink">Produção</h3>
              <p className="text-sm text-ink-soft tabular-nums">
                {plural(criativos.length, 'criativo', 'criativos')} · {plural(eventos.length, 'evento ou campanha', 'eventos e campanhas')}
              </p>
              <p className="text-[11px] text-ink-muted">Pasta lógica do sistema: não existe nem é criada no Google Drive.</p>
              <button type="button" className="btn-primary mt-auto" onClick={abrirProducao}>
                Abrir pasta
                <span className="sr-only">: Produção</span>
              </button>
            </div>
          </li>
        </ul>
      ) : (
        <Producao grupo={grupo} onGrupo={setGrupo} />
      )}

      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-medium text-ink">Onde os criativos ficam salvos</summary>
        <div className="mt-3 space-y-2 text-sm text-ink-soft">
          <p>
            Cadastros, versões e decisões ficam salvos <strong>neste navegador</strong>. Imagens e vídeos anexados ficam
            no armazenamento do navegador (até 200 MB por arquivo): não são enviados ao Google Drive e não aparecem para
            outras pessoas nem em outros aparelhos. Para compartilhar, use links de arquivos do Drive.
          </p>
          <p>
            O link do Canva é só uma referência para edição: o sistema não sincroniza nem importa designs do Canva e não
            percebe mudanças feitas lá. A aprovação vale para o material anexado na versão revisada.
          </p>
          <p>Remover um criativo ou uma peça nunca exclui arquivos reais do Google Drive.</p>
        </div>
      </details>
    </div>
  )
}

function Migalha({ atual, onClick, children }: { atual: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-current={atual ? 'page' : undefined}
      onClick={onClick}
      className={cx('rounded px-1.5 py-0.5 hover:bg-surface-muted', atual ? 'font-semibold text-ink' : 'text-brand-600')}
    >
      {children}
    </button>
  )
}

function Producao({ grupo, onGrupo }: { grupo: string | null; onGrupo: (g: string | null) => void }) {
  const { criativos, eventos } = useCriativos()
  const { abrir } = useModais()
  const [filtros, setFiltros] = useState<FiltrosCriativos>(FILTROS_CRIATIVOS_VAZIOS)
  const mudar = (m: Partial<FiltrosCriativos>) => setFiltros((f) => ({ ...f, ...m }))

  // Dentro de um grupo, o grupo é o filtro de evento.
  const efetivos = useMemo(() => (grupo === null ? filtros : { ...filtros, eventoId: grupo }), [filtros, grupo])
  const filtrados = useMemo(() => ordenarCriativos(filtrarCriativos(criativos, efetivos, eventos)), [criativos, efetivos, eventos])
  const grupos = useMemo(() => agruparPorEvento(filtrados, eventos), [filtrados, eventos])
  const ativos = filtrosAtivos(filtros)
  const evento = grupo && grupo !== SEM_EVENTO ? eventos.find((e) => e.id === grupo) : undefined

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => abrir({ tipo: 'form-criativo', eventoId: evento?.id })}
        >
          <Plus className="size-4" aria-hidden />
          Adicionar criativo
        </button>
        {grupo === null && (
          <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'evento' })}>
            <FolderPlus className="size-4" aria-hidden />
            Novo evento ou campanha
          </button>
        )}
      </div>

      {evento && <DetalhesDoEvento evento={evento} total={criativos.filter((c) => c.eventoId === evento.id).length} />}

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-ink-soft sm:col-span-2">
          Busca
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              className="field-control pl-9"
              placeholder="Nome, evento, observações…"
              value={filtros.texto}
              onChange={(e) => mudar({ texto: e.target.value })}
            />
          </span>
        </label>
        {grupo === null && (
          <label className="text-sm text-ink-soft">
            Evento ou campanha
            <select className="field-control mt-1" value={filtros.eventoId} onChange={(e) => mudar({ eventoId: e.target.value })}>
              <option value="">Todos</option>
              {[...eventos]
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              <option value={SEM_EVENTO}>Sem evento vinculado</option>
            </select>
          </label>
        )}
        <label className="text-sm text-ink-soft">
          Formato
          <select className="field-control mt-1" value={filtros.formato} onChange={(e) => mudar({ formato: e.target.value as FormatoPostagem | '' })}>
            <option value="">Todos</option>
            {FORMATOS_POSTAGEM.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Responsável
          <select
            className="field-control mt-1"
            value={filtros.responsavel}
            onChange={(e) => mudar({ responsavel: e.target.value as Responsavel | '' })}
          >
            <option value="">Todos</option>
            {RESPONSAVEIS_ATRIBUIVEIS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Status
          <select className="field-control mt-1" value={filtros.status} onChange={(e) => mudar({ status: e.target.value as StatusCriativo | '' })}>
            <option value="">Todos</option>
            {STATUS_CRIATIVO.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Atualizado de
          <input type="date" className="field-control mt-1" value={filtros.de} max={filtros.ate || undefined} onChange={(e) => mudar({ de: e.target.value })} />
        </label>
        <label className="text-sm text-ink-soft">
          Atualizado até
          <input type="date" className="field-control mt-1" value={filtros.ate} min={filtros.de || undefined} onChange={(e) => mudar({ ate: e.target.value })} />
        </label>
        <div className="flex items-end">
          <button type="button" className="btn-ghost" onClick={() => setFiltros(FILTROS_CRIATIVOS_VAZIOS)} disabled={!ativos}>
            Limpar filtros
          </button>
        </div>
        <p className="text-xs text-ink-muted sm:col-span-2 lg:col-span-4">
          A data é a da última atualização do criativo neste sistema.
        </p>
      </div>

      {grupo === null && !ativos ? (
        <>
          <p aria-live="polite" className="text-sm text-ink-soft">
            <strong>{plural(grupos.length, 'grupo', 'grupos')}</strong> · {plural(criativos.length, 'criativo', 'criativos')}
          </p>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {grupos.map((g) => (
              <CartaoGrupo key={g.id || SEM_EVENTO} g={g} onAbrir={() => onGrupo(g.id || SEM_EVENTO)} />
            ))}
          </ul>
        </>
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-ink-soft">
            <strong>{plural(filtrados.length, 'criativo', 'criativos')}</strong>
            {grupo === null && ' em todos os grupos'}
          </p>
          {filtrados.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtrados.map((c) => (
                <CartaoCriativo key={c.id} c={c} evento={eventos.find((e) => e.id === c.eventoId)} />
              ))}
            </ul>
          ) : (
            <EstadoVazio icone={Layers} titulo={ativos ? 'Nenhum criativo neste filtro.' : 'Nenhum criativo neste grupo ainda.'}>
              <p className="mt-1 max-w-md text-sm text-ink-muted">
                {ativos ? 'Limpe os filtros ou tente outra busca.' : 'Use “Adicionar criativo” para cadastrar o primeiro.'}
              </p>
            </EstadoVazio>
          )}
        </>
      )}
    </div>
  )
}

function DetalhesDoEvento({ evento, total }: { evento: EventoCampanha; total: number }) {
  const { abrir } = useModais()
  return (
    <section aria-label={`Detalhes de ${evento.nome}`} className="card space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">{evento.tipo}</p>
          <h3 className="text-lg font-semibold text-ink">{evento.nome}</h3>
        </div>
        <button type="button" className="btn-secondary" onClick={() => abrir({ tipo: 'evento', id: evento.id })}>
          <Pencil className="size-4" aria-hidden />
          Editar {evento.tipo.toLowerCase()}
        </button>
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-4 text-ink-muted" aria-hidden />
          {evento.data ? formatarData(evento.data) : 'Data não definida'}
        </span>
        <span className="tabular-nums">{plural(total, 'criativo vinculado', 'criativos vinculados')}</span>
      </p>
      {evento.observacoes && <p className="text-sm whitespace-pre-line text-ink-soft">{evento.observacoes}</p>}
    </section>
  )
}

function CartaoGrupo({ g, onAbrir }: { g: GrupoCriativos; onAbrir: () => void }) {
  const nome = g.evento?.nome ?? 'Sem evento vinculado'
  const capa = g.criativos.find((c) => versaoAtual(c).pecas.length)
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-700">
        <CapaCriativo peca={capa ? versaoAtual(capa).pecas[0] : undefined} titulo={nome} linkDrive={capa?.drive} />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
          <FolderOpen className="size-3.5" aria-hidden />
          {g.evento?.tipo ?? 'Grupo'}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-base font-semibold break-words text-ink">{nome}</h3>
        <p className="text-sm text-ink-soft tabular-nums">{plural(g.criativos.length, 'criativo', 'criativos')}</p>
        {g.evento?.data && <p className="text-[11px] text-ink-muted">Data: {formatarData(g.evento.data)}</p>}
        <button type="button" className="btn-primary mt-auto" onClick={onAbrir}>
          Abrir grupo
          <span className="sr-only">: {nome}</span>
        </button>
      </div>
    </li>
  )
}

function CartaoCriativo({ c, evento }: { c: Criativo; evento?: EventoCampanha }) {
  const { abrir } = useModais()
  const v = versaoAtual(c)
  const capa = v.pecas[0]
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-700">
        <CapaCriativo peca={capa} titulo={c.nome} linkDrive={c.drive} />
        {capa && (
          <span className="absolute top-3 left-3">
            <SeloTipo tipo={capa.midia} sobreImagem />
          </span>
        )}
        {v.pecas.length > 1 && (
          <span className="absolute top-3 right-3 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
            {v.pecas.length} peças
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex flex-wrap gap-1.5">
          <SeloStatusCriativo status={statusDoCriativo(c)} />
          <Etiqueta>Versão {v.numero}</Etiqueta>
          {diaDoCarimbo(c.criadoEm) && <Etiqueta><span className="sr-only">Ano: </span>{diaDoCarimbo(c.criadoEm).slice(0, 4)}</Etiqueta>}
        </div>
        <h3 className="text-base leading-snug font-semibold break-words text-ink">{c.nome}</h3>
        <p className="text-xs text-ink-muted">{evento?.nome ?? 'Sem evento vinculado'}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          <SeloPessoa nome={c.responsavel} />
          <span>{c.formato}</span>
        </p>
        <p className="text-[11px] text-ink-muted">Atualizado em {formatarData(diaDoCarimbo(c.atualizadoEm))}</p>
        <button type="button" className="btn-primary mt-auto" onClick={() => abrir({ tipo: 'criativo', id: c.id })}>
          Ver detalhes
          <span className="sr-only">: {c.nome}</span>
        </button>
      </div>
    </li>
  )
}
