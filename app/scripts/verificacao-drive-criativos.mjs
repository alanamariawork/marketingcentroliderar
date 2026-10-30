import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

// Verificação no navegador do Drive (Acervo com datas e ordenação; Criativos).
// Uso: npm run build && npx vite preview --port 4173, e em outro terminal:
//   node scripts/verificacao-drive-criativos.mjs
// O catálogo real não traz datas do Drive; para testar filtros e ordenação, um
// contexto recebe o mesmo catálogo com datas de teste (marcadas só no teste).
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const OUT = new URL('../verificacao/', import.meta.url).pathname
const FIX = new URL('./fixtures/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const results = []
process.on('exit', () => console.log(results.join('\n')))
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`) }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const errors = []
const novaPagina = async (ctx) => {
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errors.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text()) && errors.push(m.text()))
  return p
}
const resumo = (p) => p.locator('#painel-acervo p[aria-live="polite"]').first().innerText()
const esperar = (p, ms = 500) => p.waitForTimeout(ms)
const brParaIso = (s) => s.split('/').reverse().join('-')

/* ---------- 1. Catálogo real: sem datas ---------- */
const ctxReal = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Fortaleza' })
await ctxReal.route(/drive\.google\.com|canva/, (r) => r.abort())
let page = await novaPagina(ctxReal)
await page.goto(`${BASE}#/drive`)
await page.waitForSelector('text=Biblioteca de conteúdos', { timeout: 30000 })
ok('abas Acervo e Criativos', (await page.getByRole('tab').allInnerTexts()).map((t) => t.split('\n')[0]).join(',') === 'Acervo,Criativos')
ok('Acervo selecionado por padrão', (await page.getByRole('tab', { name: /Acervo/ }).getAttribute('aria-selected')) === 'true')
ok('catálogo sem datas: aviso de atualização', (await page.getByText(/não traz a última modificação no drive/i).count()) === 1)
ok('data usada identificada', /Data usada: Última modificação no Drive/.test(await resumo(page)))
ok('cartões mostram "Data não informada"', (await page.getByText(/Data não informada/).count()) > 0)
await page.getByLabel('Período').selectOption('ano')
ok('ano sem dados: opção desativada e explicada', (await page.getByRole('combobox', { name: /^Ano\b/ }).isDisabled()) && (await page.getByText('Nenhum ano no catálogo').count()) === 1)
await page.getByLabel('Período').selectOption('sem-data')
await esperar(page)
ok('consulta de arquivos sem data (todos, no catálogo atual)', /nesta pasta e subpastas/.test(await resumo(page)) && !/^0 pastas · 0 fotos · 0 vídeos/.test(await resumo(page)), await resumo(page))
await page.screenshot({ path: OUT + 'acervo-sem-datas.png' })
await ctxReal.close()

/* ---------- 2. Catálogo com datas de teste ---------- */
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Fortaleza' })
await ctx.route(/drive\.google\.com|canva/, (r) => r.abort())
await ctx.route(/dados\/drive-catalogo\/parte-\d\.json/, async (route) => {
  const resp = await route.fetch()
  const itens = await resp.json()
  itens.forEach((x, i) => {
    if (i % 3 === 0) return // um terço fica sem data
    const ano = 2023 + (i % 4)
    const mes = String(1 + (Math.floor(i / 4) % 12)).padStart(2, '0')
    const dia = String(1 + (Math.floor(i / 48) % 28)).padStart(2, '0')
    x.modifiedTime = `${ano}-${mes}-${dia}T15:00:00.000Z`
    x.createdTime = `${ano - 1}-${mes}-${dia}T15:00:00.000Z`
  })
  await route.fulfill({ response: resp, json: itens })
})
page = await novaPagina(ctx)
await page.goto(`${BASE}#/drive`)
await page.waitForSelector('text=Biblioteca de conteúdos', { timeout: 30000 })
ok('com datas no catálogo, sem aviso de atualização', (await page.getByText(/não traz a/).count()) === 0)

const datasVisiveis = async () => {
  const textos = await page.locator('#painel-acervo li.card p').allInnerTexts()
  return textos.map((t) => /(?:Modificado|Pasta modificada) no Drive em (\d\d\/\d\d\/\d{4})/.exec(t)?.[1] ?? (/Data não informada/.test(t) && /modifica/i.test(t) ? '' : null)).filter((x) => x !== null)
}

await page.getByLabel('Período').selectOption('ano')
const anos = await page.getByRole('combobox', { name: /^Ano\b/ }).locator('option').allInnerTexts()
ok('anos vêm das datas do catálogo', anos.includes('2024') && anos.includes('2026'), anos.join(','))
await page.getByRole('combobox', { name: /^Ano\b/ }).selectOption('2024')
await esperar(page)
let ds = await datasVisiveis()
ok('filtro por ano (última modificação)', ds.length > 0 && ds.every((d) => d.endsWith('/2024')), `${ds.length} itens`)
ok('selo de ano no cartão', (await page.locator('#painel-acervo li.card').first().innerText()).includes('2024'))
await page.getByLabel('Período').selectOption('intervalo')
ok('ano e intervalo são alternativos', (await page.getByRole('combobox', { name: /^Ano\b/ }).count()) === 0 && (await page.getByLabel('Data inicial').count()) === 1)
await page.getByLabel('Data inicial').fill('2025-02-01')
await page.getByLabel('Data final').fill('2025-03-31')
await esperar(page)
ds = await datasVisiveis()
ok('filtro por intervalo de datas', ds.length > 0 && ds.every((d) => brParaIso(d) >= '2025-02-01' && brParaIso(d) <= '2025-03-31'), `${ds.length} itens`)
await page.getByLabel('Data usada').selectOption('criacao')
await esperar(page)
ok('troca para data de criação', /Data usada: Criação no Drive/.test(await resumo(page)))
const criacoes = (await page.locator('#painel-acervo li.card p').allInnerTexts()).map((t) => /Criação: (\d\d\/\d\d\/\d{4})/.exec(t)?.[1]).filter(Boolean)
ok('intervalo aplicado à data de criação', criacoes.length > 0 && criacoes.every((d) => brParaIso(d) >= '2025-02-01' && brParaIso(d) <= '2025-03-31'), `${criacoes.length} itens`)
await page.getByLabel('Período').selectOption('sem-data')
await esperar(page)
ok('somente sem data', (await datasVisiveis()).every((d) => d === ''))

await page.getByRole('button', { name: 'Limpar filtros' }).click()
await esperar(page)
ok('limpar filtros volta ao padrão', (await page.getByLabel('Período').inputValue()) === 'todas' && (await page.getByLabel('Data usada').inputValue()) === 'modificacao' && (await page.getByLabel('Ordenar por').inputValue()) === 'relevancia')

await page.getByPlaceholder(/fotos Jaciara/).fill('jpg')
await page.getByLabel('Tipo').selectOption('Foto')
await page.getByLabel('Ordenar por').selectOption('mod-desc')
await esperar(page, 800)
ds = (await datasVisiveis()).map(brParaIso)
ok('mais recentes primeiro na 1ª página (ordem global)', ds.length === 60 && ds.every((d, i) => i === 0 || d <= ds[i - 1]) && ds[0].startsWith('2026'), `${ds[0]} … ${ds.at(-1)}`)
const total = Number(/de ([\d.]+)/.exec(await page.getByRole('navigation', { name: 'Paginação' }).innerText())[1].replace(/\./g, ''))
for (let n = 0; n < Math.ceil(total / 60) - 1; n++) await page.getByRole('button', { name: 'Próxima' }).click()
await esperar(page)
ds = await datasVisiveis()
ok('sem data ficam no fim', ds.length > 0 && ds.at(-1) === '', `última página: ${ds.filter((d) => d === '').length} sem data`)
await page.getByLabel('Ordenar por').selectOption('mod-asc')
await esperar(page, 800)
ds = (await datasVisiveis()).map(brParaIso)
ok('mais antigos primeiro', ds.every((d, i) => i === 0 || (d >= ds[i - 1] && d !== '')) && ds[0].startsWith('2023'), ds[0])
await page.getByLabel('Ordenar por').selectOption('nome-desc')
await esperar(page, 800)
const nomes = await page.locator('#painel-acervo li.card h3').allInnerTexts()
ok('nome Z–A', nomes.every((n, i) => i === 0 || n.localeCompare(nomes[i - 1], 'pt-BR', { numeric: true }) <= 0), nomes.slice(0, 3).join(' | '))
await page.screenshot({ path: OUT + 'acervo-ordenacao.png' })

/* ---------- 3. Criativos ---------- */
await page.getByRole('tab', { name: /Criativos/ }).click()
ok('aba Criativos com a pasta Produção', (await page.getByRole('heading', { name: 'Produção' }).count()) === 1)
await page.getByRole('button', { name: /Abrir pasta.*Produção/ }).click()
ok('Produção: grupo "Sem evento vinculado"', (await page.getByRole('heading', { name: 'Sem evento vinculado' }).count()) === 1)

await page.getByRole('button', { name: 'Novo evento ou campanha' }).click()
let dlg = page.getByRole('dialog')
await dlg.getByLabel('Nome').fill('Encontro Diamante 2026')
await dlg.getByLabel('Data').fill('2026-11-20')
await dlg.getByRole('button', { name: 'Salvar' }).click()
ok('evento criado como grupo', (await page.getByRole('heading', { name: 'Encontro Diamante 2026' }).count()) === 1)
await page.getByRole('button', { name: /Abrir grupo.*Encontro Diamante 2026/ }).click()
ok('detalhes do evento', (await page.getByRole('region', { name: /Detalhes de Encontro Diamante 2026/ }).getByText('20/11/2026').count()) === 1)

await page.getByRole('button', { name: 'Adicionar criativo' }).click()
dlg = page.getByRole('dialog')
ok('evento já vem selecionado', (await dlg.getByLabel('Evento ou campanha').locator('option:checked').innerText()).startsWith('Encontro Diamante 2026'))
await dlg.getByRole('button', { name: 'Salvar' }).click()
ok('nome obrigatório', (await dlg.getByText('Informe o nome do criativo.').count()) === 1)
await dlg.getByLabel('Nome do criativo').fill('Carrossel do Encontro')
await dlg.getByLabel('Formato da publicação').selectOption('Carrossel')
await dlg.getByLabel('Responsável').selectOption('Jordana')
await dlg.getByLabel('Atividade vinculada').selectOption({ label: 'Bastidores · Encontro de mentoria' })
await dlg.getByLabel('Link editável do Canva').fill('https://drive.google.com/file/d/abc/view')
await dlg.getByLabel('Link do arquivo ou pasta no Drive').fill('https://drive.google.com/drive/folders/1PASTA')
ok('link de pasta identificado como pasta', (await dlg.getByText(/Link de pasta do Drive: abre a pasta/).count()) === 1)
await dlg.locator('input[type=file]').setInputFiles([FIX + 'peca-1.png', FIX + 'peca-2.png', FIX + 'peca-3.png'])
await dlg.getByRole('button', { name: 'Remover peça: peca-3.png' }).waitFor()
await dlg.getByLabel('Link de arquivo do Drive').fill('https://drive.google.com/drive/folders/1PASTA')
await dlg.getByRole('button', { name: 'Adicionar peça' }).click()
ok('pasta não vira peça (imagem/vídeo)', (await dlg.getByText(/Este é um link de pasta/).count()) === 1)
await dlg.getByLabel('Link de arquivo do Drive').fill('https://drive.google.com/file/d/1ARQUIVO/view')
await dlg.getByRole('button', { name: 'Adicionar peça' }).click()
await dlg.getByRole('button', { name: 'Mover para cima: peca-3.png' }).click()
const ordem = await dlg.getByRole('list', { name: 'Peças do criativo' }).locator('li').allInnerTexts()
ok('ordenação manual das peças', /peca-1/.test(ordem[0]) && /peca-3/.test(ordem[1]) && /peca-2/.test(ordem[2]) && /Drive/.test(ordem[3]), ordem.map((x) => x.split('\n').find((l) => /peca|Arquivo do Drive \d/.test(l))).join(' > '))
await dlg.getByRole('button', { name: 'Salvar' }).click()
ok('Canva exige link do Canva', (await dlg.getByText('Informe um link do Canva (canva.com).').count()) === 1)
await dlg.getByLabel('Link editável do Canva').fill('https://www.canva.com/design/DAFteste/edit')
await dlg.getByRole('button', { name: 'Salvar' }).click()
await page.getByRole('heading', { name: 'Carrossel do Encontro' }).waitFor()
const cartao = page.locator('li.card', { hasText: 'Carrossel do Encontro' })
const txt = await cartao.innerText()
ok('cartão: status, versão, evento, responsável, formato, peças', /Em produção/.test(txt) && /Versão 1/.test(txt) && /Encontro Diamante 2026/.test(txt) && /Jordana/.test(txt) && /Carrossel/.test(txt) && /4 peças/.test(txt), txt.replace(/\n/g, ' | '))
ok('selo de tipo e selo de status distintos (texto, não só cor)', (await cartao.getByText('Tipo:').count()) === 1 && (await cartao.getByText('Status:').count()) === 1)
ok('capa do cartão é a 1ª peça', await cartao.locator('img').first().evaluate((i) => i.complete && i.naturalWidth > 0))
ok('contagem no evento', (await page.getByText('1 criativo vinculado').count()) === 1)

await cartao.getByRole('button', { name: /Ver detalhes/ }).click()
dlg = page.getByRole('dialog')
await dlg.locator('img[alt="Prévia de peca-1.png"]').waitFor({ timeout: 5000 })
ok('detalhe: prévia da 1ª peça (imagem anexada)', await dlg.locator('img[alt="Prévia de peca-1.png"]').evaluate((i) => i.complete && i.naturalWidth > 0))
ok('navegação do carrossel', (await dlg.getByText('Peça 1 de 4').count()) === 1)
await dlg.getByRole('button', { name: 'Próxima' }).click()
await dlg.locator('img[alt="Prévia de peca-3.png"]').waitFor({ timeout: 5000 }).catch(() => {})
ok('próxima peça', (await dlg.getByText('Peça 2 de 4').count()) === 1 && (await dlg.locator('img[alt="Prévia de peca-3.png"]').count()) === 1)
await dlg.getByRole('list', { name: 'Peças' }).getByRole('button').nth(3).click()
await esperar(page, 800)
ok('peça do Drive sem acesso: explica e oferece o link', (await dlg.getByText(/Não foi possível exibir a prévia/).count()) === 1 && (await dlg.getByRole('link', { name: /Abrir arquivo no Drive/ }).count()) === 1)
ok('Abrir no Canva e Abrir pasta no Drive', (await dlg.getByRole('link', { name: /Abrir no Canva/ }).getAttribute('href')).includes('canva.com') && (await dlg.getByRole('link', { name: /Abrir pasta no Drive/ }).count()) === 1)
ok('sem login: envio e decisão indisponíveis e explicados', (await dlg.getByRole('button', { name: 'Enviar para revisão' }).isDisabled()) && (await dlg.getByText(/ainda não tem login/).count()) === 1)
ok('nenhuma decisão atribuída à Kélvia', (await dlg.getByText('Sem envio nem decisão nesta versão.').count()) === 1)
ok('atividade vinculada aparece no criativo', (await dlg.getByRole('button', { name: 'Bastidores · Encontro de mentoria' }).count()) === 1)
await page.screenshot({ path: OUT + 'criativo-detalhe.png' })
await page.keyboard.press('Escape')

// Atividade vinculada: uma só decisão para as duas telas
await page.goto(`${BASE}#/atividades`)
await esperar(page)
const coluna = (id) => page.locator('section', { has: page.locator(`[id="coluna-${id}"]`) })
const colProducao = coluna('Em produção')
ok('atividade vinculada segue o status do criativo no Kanban', (await colProducao.getByRole('heading', { name: 'Bastidores · Encontro de mentoria' }).count()) === 1 && (await coluna('Aprovado').getByRole('heading', { name: 'Bastidores · Encontro de mentoria' }).count()) === 0)
await page.getByRole('button', { name: /Abrir entrega.*Bastidores/ }).click()
dlg = page.getByRole('dialog')
ok('detalhe da atividade mostra o criativo vinculado', (await dlg.getByText('Criativo vinculado').count()) === 1 && (await dlg.getByText('Carrossel do Encontro').count()) === 1)
ok('histórico da atividade preservado', (await dlg.getByText('Kélvia aprovou a versão 1.').count()) === 1)
await dlg.getByRole('button', { name: 'Abrir criativo' }).click()
ok('abre o criativo a partir da atividade', (await page.getByRole('dialog', { name: 'Carrossel do Encontro' }).count()) === 1)
await page.keyboard.press('Escape')

// Vídeo sem evento
await page.goto(`${BASE}#/drive`)
await page.getByRole('tab', { name: /Criativos/ }).click()
await page.getByRole('button', { name: /Abrir pasta.*Produção/ }).click()
await page.getByRole('button', { name: 'Adicionar criativo' }).click()
dlg = page.getByRole('dialog')
await dlg.getByLabel('Nome do criativo').fill('Reels convite')
await dlg.getByLabel('Formato da publicação').selectOption('Reels')
await dlg.locator('input[type=file]').setInputFiles(FIX + 'convite.webm')
await dlg.getByRole('button', { name: 'Remover peça: convite.webm' }).waitFor()
await dlg.getByRole('button', { name: 'Salvar' }).click()
await esperar(page)
ok('criativo sem evento no grupo "Sem evento vinculado"', /1 criativo/.test(await page.locator('li.card', { hasText: 'Sem evento vinculado' }).innerText()))

// Criativo aprovado (dado de teste gravado como se a aprovação tivesse sido feita com login)
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('centro-liderar-criativos-v1'))
  const q = '2026-10-20T13:00:00.000Z'
  d.criativos.push({
    id: 'teste-aprovado', empresaId: 'centro-liderar', nome: 'Story aprovado', eventoId: '', atividadeId: '', responsavel: 'Carlos',
    formato: 'Story', canva: '', drive: '', observacoes: 'Dado de teste',
    versoes: [{ numero: 1, criadaEm: q, autor: 'Carlos', pecas: [{ id: 'pd1', origem: 'drive', nome: 'Arte final', midia: 'Foto', url: 'https://drive.google.com/file/d/1TESTE/view' }] }],
    decisoes: [
      { versao: 1, autor: 'Carlos', quando: q, decisao: 'Enviado para revisão', comentario: '' },
      { versao: 1, autor: 'Kélvia', quando: '2026-10-21T13:00:00.000Z', decisao: 'Aprovado', comentario: '' },
    ],
    historico: [], criadoEm: q, atualizadoEm: '2026-10-21T13:00:00.000Z',
  })
  localStorage.setItem('centro-liderar-criativos-v1', JSON.stringify(d))
})

const abrirCriativo = async (nome) => {
  await page.getByLabel('Busca').fill(nome)
  await esperar(page, 300)
  await page.locator('li.card', { hasText: nome }).getByRole('button', { name: /Ver detalhes/ }).click()
}

/* ---------- 4. Persistência após recarregar ---------- */
await page.reload()
await page.getByRole('tab', { name: /Criativos/ }).click()
await page.getByRole('button', { name: /Abrir pasta.*Produção/ }).click()
ok('persistência: grupos e criativos após recarregar', (await page.getByRole('heading', { name: 'Encontro Diamante 2026' }).count()) === 1 && /2 criativos/.test(await page.locator('li.card', { hasText: 'Sem evento vinculado' }).innerText()))
await page.getByLabel('Status').selectOption('Aprovado')
await esperar(page)
ok('filtro por status', (await page.locator('li.card h3').allInnerTexts()).join() === 'Story aprovado')
await page.getByLabel('Status').selectOption('')
await page.getByLabel('Formato').selectOption('Reels')
await esperar(page)
ok('filtro por formato', (await page.locator('li.card h3').allInnerTexts()).join() === 'Reels convite')
await page.getByRole('button', { name: 'Limpar filtros' }).click()
await page.getByLabel('Busca').fill('encontro')
await esperar(page)
ok('busca', (await page.locator('li.card h3').allInnerTexts()).join() === 'Carrossel do Encontro')
await page.getByLabel('Busca').fill('')
await page.getByLabel('Responsável').selectOption('Jordana')
await page.getByLabel('Evento ou campanha').selectOption({ label: 'Encontro Diamante 2026' })
await page.getByLabel('Atualizado de').fill('2026-10-01')
await esperar(page)
ok('filtros por evento, responsável e data', (await page.locator('li.card h3').allInnerTexts()).join() === 'Carrossel do Encontro')
await page.getByRole('button', { name: 'Limpar filtros' }).click()

await abrirCriativo('Reels convite')
dlg = page.getByRole('dialog')
await esperar(page, 800)
ok('vídeo anexado reproduzível após recarregar', await dlg.locator('video').evaluate((v) => v.readyState >= 1 && v.duration > 0))
await page.keyboard.press('Escape')
await abrirCriativo('Carrossel do Encontro')
await page.getByRole('dialog').locator('img[alt="Prévia de peca-1.png"]').waitFor({ timeout: 5000 })
ok('imagem anexada após recarregar', await page.getByRole('dialog').locator('img[alt="Prévia de peca-1.png"]').evaluate((i) => i.complete && i.naturalWidth > 0))
await page.keyboard.press('Escape')

/* ---------- 5. Nova versão ao trocar material aprovado ---------- */
await abrirCriativo('Story aprovado')
dlg = page.getByRole('dialog')
ok('aprovado: selo e histórico', (await dlg.getByText('Status:').count()) >= 1 && (await dlg.getByText('Aprovada', { exact: true }).count()) === 1)
await dlg.getByRole('button', { name: 'Editar' }).click()
dlg = page.getByRole('dialog')
await dlg.getByLabel('Responsável').selectOption('Jordana')
ok('mudar só o responsável não cria versão', (await dlg.getByText(/forma a versão 2/).count()) === 0)
await dlg.locator('input[type=file]').setInputFiles(FIX + 'peca-4.png')
await dlg.getByRole('button', { name: 'Remover peça: peca-4.png' }).waitFor()
await dlg.getByRole('button', { name: 'Remover peça: Arte final' }).click()
ok('aviso de nova versão ao trocar material aprovado', (await dlg.getByText(/forma a versão 2/).count()) === 1)
await dlg.getByRole('button', { name: 'Salvar' }).click()
await esperar(page)
const story = await page.locator('li.card', { hasText: 'Story aprovado' }).innerText()
ok('nova versão exige nova revisão', /Versão 2/.test(story) && /Em produção/.test(story), story.replace(/\n/g, ' | '))
await abrirCriativo('Story aprovado')
dlg = page.getByRole('dialog')
ok('versão anterior e aprovação preservadas', (await dlg.getByText('Aprovada', { exact: true }).count()) === 1 && (await dlg.getByRole('cell', { name: 'Kélvia' }).count()) === 1)
ok('envio passa a "Reenviar para revisão"', (await dlg.getByRole('button', { name: 'Reenviar para revisão' }).count()) === 1)
await dlg.getByLabel('Versão exibida').selectOption('1')
ok('consulta a versão anterior', (await dlg.getByText('Prévia da versão 1 (anterior)').count()) === 1)
await page.screenshot({ path: OUT + 'criativo-versoes.png' })

/* ---------- 6. Remover ---------- */
await dlg.getByRole('button', { name: 'Remover criativo' }).click()
ok('remoção avisa que o Drive não é afetado', (await page.getByText(/Nenhum arquivo do Google Drive ou do Canva é excluído/).count()) === 1)
await page.getByRole('button', { name: 'Remover', exact: true }).click()
await esperar(page)
ok('criativo removido', (await page.locator('li.card', { hasText: 'Story aprovado' }).count()) === 0)
ok('nenhum binário no localStorage', await page.evaluate(() => !/data:|base64/.test(localStorage.getItem('centro-liderar-criativos-v1'))))
ok('sem "Simular perfil", "Aguardando Kélvia" ou rodapé de aprovação', (await page.getByText(/Simular perfil|Aguardando Kélvia|Aprovação centralizada/).count()) === 0)

/* ---------- 7. Celular ---------- */
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR', timezoneId: 'America/Fortaleza' })
await m.route(/drive\.google\.com|canva/, (r) => r.abort())
const mp = await novaPagina(m)
await mp.goto(`${BASE}#/drive`)
await mp.waitForSelector('text=Biblioteca de conteúdos', { timeout: 30000 })
ok('celular: Acervo sem rolagem horizontal', (await mp.evaluate(() => document.documentElement.scrollWidth)) <= 390)
await mp.screenshot({ path: OUT + 'celular-acervo.png', fullPage: false })
await mp.getByRole('tab', { name: /Criativos/ }).click()
await mp.getByRole('button', { name: /Abrir pasta.*Produção/ }).click()
ok('celular: Criativos sem rolagem horizontal', (await mp.evaluate(() => document.documentElement.scrollWidth)) <= 390)
await mp.getByRole('button', { name: 'Adicionar criativo' }).click()
ok('celular: cadastro sem rolagem horizontal', (await mp.evaluate(() => document.documentElement.scrollWidth)) <= 390)
await mp.screenshot({ path: OUT + 'celular-criativo-form.png' })

ok('sem erros de JavaScript', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close()
writeFileSync(OUT + 'resultado-drive-criativos.txt', results.join('\n'))
console.log(results.filter((r) => r.startsWith('FAIL')).length, 'falhas de', results.length)
