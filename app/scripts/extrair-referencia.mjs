// Extrai os dados embutidos no HTML de referência (preservado em
// ../referencia/marketing-grupo-mendes.html) para arquivos de dados próprios.
// Não altera nenhum valor: os registros são copiados exatamente como estão.
//
// Uso: node scripts/extrair-referencia.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = (p) => fileURLToPath(new URL(p, import.meta.url))
const html = readFileSync(raiz('../../referencia/marketing-grupo-mendes.html'), 'utf8')

function extrair(nome) {
  const linha = html.split('\n').find((l) => l.startsWith(`const ${nome}=`))
  if (!linha) throw new Error(`"${nome}" não encontrado no HTML de referência`)
  return JSON.parse(linha.slice(`const ${nome}=`.length).replace(/;\s*$/, ''))
}

const insights = extrair('importedInsights')
const drive = extrair('driveCatalog')

// Um registro por linha: diffs legíveis e o mesmo conteúdo do HTML.
const umPorLinha = (lista) => '[\n' + lista.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n'
writeFileSync(raiz('../src/data/importados/insights.json'), umPorLinha(insights))
writeFileSync(raiz('../public/dados/drive-catalogo.json'), umPorLinha(drive))

const contar = (lista, f) => lista.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {})
console.log('Insights importados:', insights.length, contar(insights, (x) => x.account))
console.log('Catálogo do Drive:', drive.length, contar(drive, (x) => x.type))
