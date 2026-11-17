import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

// Verificação no navegador do Dashboard (modelo DashPortal, com Insights dentro).
// Uso: npm run build && npx vite preview --port 4173, e em outro terminal:
//   node scripts/verificacao-dashboard.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const OUT = new URL('../verificacao/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const results = []
process.on('exit', () => console.log(results.join('\n')))
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Fortaleza' })
await ctx.route(/drive\.google\.com|instagram|canva/, (r) => r.abort())
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text()) && errors.push(m.text()))
const esperar = (ms = 400) => page.waitForTimeout(ms)
const textoPeriodo = () => page.locator('p', { has: page.getByText('Período:', { exact: true }) }).innerText()
const subaba = (nome) => page.getByRole('navigation', { name: 'Subabas do Dashboard' }).getByRole('link', { name: nome })

await page.goto(`${BASE}#/dashboard`)
await page.waitForSelector('text=Indicadores principais')

// Cabeçalho de dados
ok('cabeçalho mostra a fonte dos dados', (await page.getByText(/Fonte:/).count()) === 1 && (await page.getByText(/planilhas importadas \(1\.203 registros\)/).count()) === 1)
ok('última atualização e atualização automática', (await page.getByText(/Última atualização: \d\d\/\d\d\/\d{4}/).count()) === 1 && (await page.getByText(/a cada 60 minutos/).count()) === 1)
await page.getByRole('button', { name: 'Atualizar' }).click()
await page.getByText(/Última atualização/).waitFor()
ok('botão Atualizar relê os dados e mantém a tela', (await page.getByText('Indicadores principais').count()) === 1 && (await page.getByRole('button', { name: 'Atualizar' }).isEnabled()))

// Abas de conta e subabas
const contas = await page.getByRole('group', { name: 'Contas' }).getByRole('button').allInnerTexts()
ok('abas de conta com "Todas as contas" e contagens', contas[0].startsWith('Todas as contas') && contas.some((c) => /Jaciara Mendes — Instagram\s*1\.124 registros/.test(c)), contas.length + ' abas')
ok('Jaciara selecionada por padrão', (await page.getByRole('button', { name: /Jaciara Mendes — Instagram/ }).getAttribute('aria-pressed')) === 'true')
ok('4 subabas', (await page.getByRole('navigation', { name: 'Subabas do Dashboard' }).getByRole('link').allInnerTexts()).join('|') === 'Consolidados|Detalhamento|Publicações|Registros (Insights)')
ok('Consolidados é a subaba padrão', (await subaba('Consolidados').getAttribute('aria-current')) === 'page')

// Período automático e comparação
const per = await textoPeriodo()
ok('período automático: 30 dias até a última publicação, com comparação', /Automático: 10\/09\/2026 a 09\/10\/2026/.test(per) && /comparado com 11\/08\/2026 a 09\/09\/2026/.test(per), per.split('\n')[0])
ok('indicadores com variação em relação ao período anterior', (await page.getByText(/(Alta|Queda|Estável) de [\d,]+%/).count()) > 0)
ok('taxas e médias', (await page.getByText('Taxa de engajamento').count()) === 1 && (await page.getByText('Alcance médio por post').count()) === 1)
ok('gráfico mensal com 12 meses', (await page.locator('#titulo-mensal').locator('xpath=..').locator('table.sr-only tbody tr').count()) === 12)
ok('funil (distribuição editorial)', (await page.getByRole('heading', { name: 'Distribuição do funil' }).count()) === 1)
await page.screenshot({ path: OUT + 'dashboard-consolidados.png', fullPage: true })

// Presets de período
await page.getByLabel('Período').selectOption('hoje')
await esperar()
ok('hoje: sem publicações, aviso claro', (await page.getByText(/Nenhuma publicação neste período/).count()) === 1)
await page.getByLabel('Período').selectOption('ontem')
ok('ontem', /Período: \d\d\/\d\d\/\d{4} ·/.test(await textoPeriodo()))
await page.getByLabel('Período').selectOption('este-mes')
ok('este mês', /Período: 01\/\d\d\/\d{4} a/.test(await textoPeriodo()))
await page.getByLabel('Período').selectOption('ultimos')
await page.getByLabel('Quantidade de dias').fill('90')
await esperar()
ok('últimos dias: quantidade editável', (await page.getByLabel('Quantidade de dias').inputValue()) === '90')
await page.getByLabel('Período').selectOption('avancado')
await page.getByLabel('De', { exact: true }).fill('2025-01-01')
await page.getByLabel('Até', { exact: true }).fill('2025-03-31')
await esperar()
ok('avançado: intervalo e comparação com o trimestre anterior', /01\/01\/2025 a 31\/03\/2025 · comparado com 03\/10\/2024 a 31\/12\/2024/.test(await textoPeriodo()), (await textoPeriodo()).split('\n')[0])
const pubs = Number((await page.locator('.card', { has: page.locator('p', { hasText: /^Publicações$/ }) }).locator('p').nth(1).innerText()).replace(/\./g, ''))
ok('indicadores seguem o período', pubs > 0 && pubs < 1124, String(pubs))

// Filtro de funil
await page.getByRole('combobox', { name: /^Funil/ }).selectOption('ESCALA')
await esperar()
const pubsEscala = Number((await page.locator('.card', { has: page.locator('p', { hasText: /^Publicações$/ }) }).locator('p').nth(1).innerText()).replace(/\./g, ''))
ok('filtro de funil', pubsEscala < pubs, `${pubs} → ${pubsEscala}`)
await page.getByRole('button', { name: 'Limpar filtros' }).click()
ok('limpar filtros volta ao período automático', (await page.getByLabel('Período').inputValue()) === 'automatico' && (await page.getByRole('combobox', { name: /^Funil/ }).inputValue()) === '')

// Detalhamento
await subaba('Detalhamento').click()
await esperar()
ok('endereço da subaba', page.url().endsWith('#/dashboard/detalhamento'))
ok('detalhamento: resumo do histórico', (await page.getByText(/ago\/24 a out\/26/).count()) === 1)
const linhasMes = await page.locator('table').first().locator('tbody tr').count()
ok('tabela mês a mês com linha de total', linhasMes > 12 && (await page.locator('tfoot').getByText('Total').count()) === 1, `${linhasMes} meses`)
ok('desempenho por formato', (await page.getByRole('heading', { name: 'Desempenho por formato' }).count()) === 1)
await page.screenshot({ path: OUT + 'dashboard-detalhamento.png', fullPage: true })

// Publicações
await subaba('Publicações').click()
await esperar()
ok('tendência diária', (await page.getByRole('heading', { name: 'Tendência diária' }).count()) === 1 && (await page.locator('#titulo-diaria').locator('xpath=..').locator('div[aria-hidden] > div').count()) === 30)
const itens = await page.locator('ol > li.card').count()
ok('ranking de publicações com link do Instagram', itens > 0 && itens <= 30 && (await page.getByRole('link', { name: /Abrir no Instagram/ }).count()) > 0, `${itens} posts`)
const valores = (await page.locator('ol > li.card').locator('p.text-lg').allInnerTexts()).map((v) => Number(v.replace(/\./g, '').replace(',', '.')))
ok('ranking do maior para o menor', valores.every((v, i) => i === 0 || v <= valores[i - 1]), valores.slice(0, 3).join(', '))
await page.getByLabel('Ordenar por').selectOption('reproducoes')
ok('ranking por outro critério', (await page.getByText(/maior reproduções/).count()) === 1)
await page.locator('ol > li.card').first().getByRole('button', { name: /Ver \/ editar/ }).click()
ok('abre o registro para editar', (await page.getByRole('dialog').count()) === 1)
await page.keyboard.press('Escape')
await page.screenshot({ path: OUT + 'dashboard-publicacoes.png', fullPage: true })

// Registros (antiga aba Insights)
await subaba('Registros (Insights)').click()
await esperar()
ok('registros: botão Adicionar dados e tabela', (await page.getByRole('button', { name: 'Adicionar dados' }).count()) === 1 && (await page.locator('tbody tr').count()) > 0)
await page.getByRole('button', { name: /Todas as contas/ }).click()
await page.getByLabel('Período').selectOption('tudo')
await esperar()
ok('todas as contas, todo o histórico: 1.203 registros', (await page.getByText('1.203 publicações nesta seleção').count()) === 1)
await page.getByRole('button', { name: /Diamante Business/ }).click()
await page.getByRole('link', { name: 'Consolidados' }).click()
await esperar()
ok('conta sem dados: estado vazio', (await page.getByText('Sem dados para análise nesta seleção.').count()) === 1)

// Celular
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', timezoneId: 'America/Fortaleza' })
const mp = await m.newPage()
for (const s of ['consolidados', 'detalhamento', 'publicacoes', 'registros']) {
  await mp.goto(`${BASE}#/dashboard/${s}`)
  await mp.waitForTimeout(900)
  ok(`celular sem rolagem horizontal: ${s}`, (await mp.evaluate(() => document.documentElement.scrollWidth)) <= 390)
  await mp.screenshot({ path: OUT + `celular-dashboard-${s}.png` })
}

ok('sem erros de JavaScript', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
writeFileSync(OUT + 'resultado-dashboard.txt', results.join('\n'))
console.log(results.filter((r) => r.startsWith('FAIL')).length, 'falhas de', results.length)
