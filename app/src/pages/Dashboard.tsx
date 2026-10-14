import { useMemo, useState, type ReactNode } from 'react'
import { BarChart3, CheckCircle2, Eye, Heart, LayoutDashboard, ListTodo } from 'lucide-react'
import { EstadoVazio } from '../components/Estados'
import { BarraFiltros, Filtro, Segmentado } from '../components/Filtros'
import { BarrasHorizontais, BarrasVerticais, CartaoGrafico } from '../components/Graficos'
import { PERIODOS, formatarData, hoje, intervaloDoPeriodo, type Periodo } from '../lib/dates'
import { formatarNumero } from '../lib/format'
import {
  METRICAS,
  calcularIndicadores,
  comparacaoContas,
  filtrarPublicados,
  serieEvolucao,
  type Metrica,
} from '../lib/indicadores'
import { hrefDaRota } from '../lib/rotas'
import { useDadosEmpresa } from '../state/DadosEmpresa'
import { useModais } from '../state/Modais'

const TODOS = 'todos'

export function Dashboard() {
  const { conteudos, atividades, contas, empresaId } = useDadosEmpresa()
  const { abrir } = useModais()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [fConta, setFConta] = useState(TODOS)
  const [metrica, setMetrica] = useState<Metrica>('publicados')
  const dataHoje = hoje()
  const intervalo = useMemo(() => intervaloDoPeriodo(periodo, dataHoje), [periodo, dataHoje])

  const publicados = useMemo(
    () => filtrarPublicados(conteudos, intervalo, fConta === TODOS ? null : fConta),
    [conteudos, intervalo, fConta],
  )
  const ind = calcularIndicadores(publicados, atividades, dataHoje)
  const serie = useMemo(() => serieEvolucao(publicados, intervalo, metrica), [publicados, intervalo, metrica])
  const porConta = useMemo(
    () => comparacaoContas(publicados, fConta === TODOS ? contas : contas.filter((c) => c.id === fConta), metrica),
    [publicados, contas, fConta, metrica],
  )
  const nomeMetrica = METRICAS.find((m) => m.id === metrica)!.nome

  if (conteudos.length === 0 && atividades.length === 0) {
    return (
      <EstadoVazio
        icone={LayoutDashboard}
        titulo="Ainda não há dados para exibir. Os indicadores são calculados a partir dos conteúdos e atividades cadastrados."
        acao="Adicionar conteúdo"
        onAcao={() => abrir({ tipo: 'conteudo' })}
      />
    )
  }

  const semRegistroMetrica = metrica !== 'publicados' && serie.every((p) => p.valor === null)
  const legendaPeriodo = intervalo
    ? `${formatarData(intervalo.inicio)} a ${formatarData(intervalo.fim)}`
    : 'Todo o período'

  return (
    <div className="space-y-5">
      <BarraFiltros>
        <Filtro<Periodo>
          rotulo="Período"
          valor={periodo}
          onChange={setPeriodo}
          opcoes={PERIODOS.map((p) => ({ valor: p.id, nome: p.nome }))}
        />
        <Filtro
          rotulo="Conta"
          valor={fConta}
          onChange={setFConta}
          opcoes={[{ valor: TODOS, nome: 'Todas as contas' }, ...contas.map((c) => ({ valor: c.id, nome: c.nome }))]}
        />
      </BarraFiltros>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores">
        <Indicador
          icone={<CheckCircle2 className="size-4" aria-hidden />}
          rotulo="Conteúdos publicados"
          valor={formatarNumero(ind.publicados)}
          nota={legendaPeriodo}
        />
        <Indicador
          icone={<Eye className="size-4" aria-hidden />}
          rotulo="Alcance"
          valor={ind.alcance === null ? null : formatarNumero(ind.alcance)}
          nota={
            ind.publicados === 0
              ? 'Nenhum conteúdo publicado no período'
              : `Soma de ${ind.comAlcance} de ${ind.publicados} conteúdo(s) com alcance registrado`
          }
        />
        <Indicador
          icone={<Heart className="size-4" aria-hidden />}
          rotulo="Interações"
          valor={ind.interacoes === null ? null : formatarNumero(ind.interacoes)}
          nota={
            ind.publicados === 0
              ? 'Nenhum conteúdo publicado no período'
              : `Curtidas, comentários, compartilhamentos e salvamentos de ${ind.comInteracoes} conteúdo(s)`
          }
        />
        <Indicador
          icone={<ListTodo className="size-4" aria-hidden />}
          rotulo="Atividades pendentes"
          valor={formatarNumero(ind.pendentes)}
          nota={`${ind.atrasadas} atrasada(s) · todas as datas`}
          destaque={ind.atrasadas > 0}
        />
      </ul>

      {ind.publicados === 0 ? (
        <EstadoVazio
          icone={BarChart3}
          titulo="Nenhum conteúdo publicado no período e conta selecionados. Os gráficos aparecem quando houver conteúdos com status “Publicado”."
        >
          <a href={hrefDaRota({ empresaId, pagina: 'cronograma' })} className="btn-primary mt-5">
            Abrir cronograma
          </a>
        </EstadoVazio>
      ) : (
        <>
          <Segmentado
            rotulo="Métrica dos gráficos"
            valor={metrica}
            onChange={setMetrica}
            opcoes={METRICAS.map((m) => ({ valor: m.id, nome: m.nome }))}
          />
          {semRegistroMetrica ? (
            <EstadoVazio icone={BarChart3} titulo="Ainda não há resultados. Registre as métricas de um conteúdo publicado.">
              <a href={hrefDaRota({ empresaId, pagina: 'insights' })} className="btn-primary mt-5">
                Registrar resultados
              </a>
            </EstadoVazio>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <CartaoGrafico
                titulo={`Evolução · ${nomeMetrica}`}
                subtitulo={legendaPeriodo}
                pontos={serie}
                rotuloValor={nomeMetrica}
                rotuloCategoria="Período"
              >
                <BarrasVerticais pontos={serie} rotuloValor={nomeMetrica} />
              </CartaoGrafico>
              <CartaoGrafico
                titulo={`Comparação entre contas · ${nomeMetrica}`}
                subtitulo={legendaPeriodo}
                pontos={porConta}
                rotuloValor={nomeMetrica}
                rotuloCategoria="Conta"
              >
                {porConta.length === 0 ? (
                  <p className="text-sm text-ink-muted">Nenhuma conta cadastrada.</p>
                ) : (
                  <BarrasHorizontais pontos={porConta} rotuloValor={nomeMetrica} />
                )}
              </CartaoGrafico>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Indicador({
  icone,
  rotulo,
  valor,
  nota,
  destaque,
}: {
  icone: ReactNode
  rotulo: string
  valor: string | null
  nota: string
  destaque?: boolean
}) {
  return (
    <li className="card p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        {icone}
        {rotulo}
      </p>
      {valor === null ? (
        <p className="mt-2 text-lg font-semibold text-ink-muted">Sem resultados registrados</p>
      ) : (
        <p className="mt-1 text-3xl font-semibold text-ink tabular-nums">{valor}</p>
      )}
      <p className={destaque ? 'mt-1 text-xs font-medium text-danger' : 'mt-1 text-xs text-ink-muted'}>{nota}</p>
    </li>
  )
}
