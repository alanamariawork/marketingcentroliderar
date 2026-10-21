# Gestão de Marketing — Grupo Mendes: implementação

Implementação em React + TypeScript + Vite (pasta `app/`) do modelo aprovado em
`referencia/marketing-grupo-mendes.html`. O HTML original foi copiado sem alterações
(SHA-256 `7cd7352c40046864c05e1250f4a9f9291316fb2a418ff0952b167605c75a7961`).

## Como executar

```bash
cd app
npm install
npm run dev        # http://localhost:5173  (abre em Centro Liderar / Cronograma)
npm test           # testes de regras, dados importados, armazenamento e datas
npm run build      # verificação de tipos + build estático em app/dist
npm run preview    # serve o build em http://localhost:4173
```

Verificação no navegador (opcional): com o `preview` rodando,
`npm i --no-save playwright && node scripts/verificacao-navegador.mjs`.
As capturas de tela ficam em `app/verificacao/` (fora do Git).

## Identidade visual

**Pendência:** nenhum arquivo oficial do Centro Liderar (logotipo, cores, tipografia ou manual)
foi encontrado no repositório nem na pasta do projeto. A interface usa uma **base neutra
provisória**, sem reaproveitar as cores do HTML de demonstração nem a identidade da Mulher Que
Age que existe na branch principal.

- Tema centralizado no bloco `@theme` de `app/src/index.css` (cores, fontes, raios, sombras).
- Nome/logotipo do menu em `app/src/components/Marca.tsx`.
- O catálogo do Drive lista pastas que podem conter a marca (por exemplo
  `LIDERAR / CLIENTES MÍDIAS / LIDERAR / LOGO` e `LOGO EM COREL`); os arquivos não foram baixados
  nem usados. Quando os arquivos oficiais forem enviados, basta trocar os valores do tema e o
  componente `Marca`.

## Organização do código

| Camada | Arquivos |
| --- | --- |
| Tema | `src/index.css` |
| Componentes | `src/components/` (menu, modal acessível, avisos, formulário, selos, filtros, tabela) |
| Páginas | `src/pages/` (Cronograma, Atividades, Insights, Drive, Dashboard) |
| Formulários | `src/forms/` (atividade, detalhe/aprovação, material, conta, resultados) |
| Dados importados | `src/data/importados/insights.json` (1.203 registros) |
| Catálogo do Drive | `public/dados/drive-catalogo.json` (68.592 itens, baixado só ao abrir o Drive) |
| Regras de cálculo | `src/lib/insights.ts` (score, agregação, collabs, funil, validação), `src/lib/aprovacao.ts` |
| Filtros e pesquisa | `src/lib/insights.ts` (filtros), `src/lib/drive.ts` (pesquisa e capas) |
| Calendário | `src/lib/calendario.ts`, `src/lib/dates.ts` (America/Fortaleza, sem deslocamento de dia) |
| Armazenamento | `src/data/armazenamento.ts`, `src/state/` |

Os dados foram extraídos do HTML por `scripts/extrair-referencia.mjs`, que copia os registros
exatamente como estão (um por linha, para facilitar a revisão).

## O que permanece depois de recarregar

| Dado | Onde fica | Após recarregar |
| --- | --- | --- |
| Insights (importados + adicionados/editados) | `localStorage`, chave `mendes-insights-v1` (mesma chave e formato da referência) | **Permanece** neste navegador |
| Atividades, histórico de aprovação | Memória da aba | Volta às 3 atividades demonstrativas (igual à referência) |
| Anexo de vídeo local | Endereço `blob:` da aba | Some; nunca é enviado nem compartilhado |
| Contas adicionadas | Memória da aba | Some (na referência a conta não era guardada) |
| Perfil simulado, filtros | Memória da aba | Volta ao padrão |
| Grupos abertos do menu | `localStorage` (`gm-marketing:menu-expandido`) | Permanece (preferência visual) |
| Catálogo do Drive | Arquivo de dados, nunca no `localStorage` | Recarregado do arquivo |

Ao abrir, os registros importados que ainda não existem nos dados salvos são acrescentados; nada
salvo é sobrescrito. Se os dados salvos estiverem ilegíveis, eles **não** são apagados: o sistema
carrega as planilhas e bloqueia novas gravações nesta sessão, avisando a pessoa. Falhas de gravação
mostram erro e mantêm o formulário preenchido; o sucesso só aparece depois da gravação. Para testar:
`localStorage.setItem('gm-marketing:simular-erro', '1')`.

## Dados históricos conferidos no HTML

- Centro Liderar: 50 registros (regra Liderar). MQA: 29 (regra MQA). Jaciara Mendes — Instagram:
  1.124. Total 1.203, ids únicos. Nenhum registro foi criado para completar contagens.
- Diamante Business, Jaciara — YouTube, TikTok e Tráfego: 0 registros (sem métricas fictícias).
- A regra Liderar aparece em 261 linhas da Jaciara. Em todas, a fórmula preservada da planilha é
  `SUM(reproduções, compartilhamentos, seguimentos/3)`, ou seja, a correspondência está comprovada
  no próprio dado; as demais 863 linhas da Jaciara ficam sem regra; quando a planilha tinha score, ele é mantido separado e fora do ranking.
- Preservados: ids, links, datas, aba e linha de origem, observações, inconsistências sinalizadas,
  valores ausentes (`null`), score histórico (`sourceScore`) e fórmula de origem.
- Catálogo do Drive: 68.592 itens (2.023 pastas, 42.979 fotos, 17.893 vídeos, 5.697 documentos),
  consulta de 16/10/2026, com o aviso de dez pastas com listagem parcial.

## Diferenças em relação à referência (documentadas)

1. **Funil sem acento.** As abas da Jaciara gravaram `NUTRICAO` e `OBJECAO`. Na referência esses
   posts não entravam no filtro “NUTRIÇÃO/OBJEÇÃO” e contavam como “sem classificação” no funil.
   Agora a comparação ignora acentos (o valor gravado não muda). Ao editar e salvar um desses
   registros, a etapa passa a ser gravada com acento.
2. **Versão da entrega.** A referência sempre mostrava “versão 1”. Agora, quando Carlos reenvia
   depois de ajustes, a versão sobe (versão 2, 3…), e o histórico registra autor e horário.
3. **Material para aprovação.** O campo único “Link da arte, Canva ou Google Drive” virou três
   campos (Canva, Google Drive, URL da arte), como pedido. Carlos pode atualizar o material
   enquanto a entrega está em produção ou em ajustes.
4. **Tabela de Insights paginada** (50 por página) e os dois scores (recalculado e da planilha)
   aparecem juntos e identificados.
5. **Rótulos das contas**: exibidos como “Centro Liderar — Instagram”, “Jaciara — YouTube” etc.;
   os identificadores internos continuam os da referência.
6. **Exclusão**: atividades e registros de Insights criados pela pessoa podem ser excluídos com
   confirmação. Registros importados não têm exclusão (voltariam na próxima abertura).
7. **Drive**: filtro adicional “Pasta” para ir direto a uma subpasta.
8. Removidos “Produção humana com apoio de IA” e “Dados fictícios” do rodapé; o rodapé agora
   distingue atividades demonstrativas dos dados reais importados.

## Pendências e limitações

- Identidade visual oficial do Centro Liderar (ver acima).
- “Simular perfil” não é autenticação. Não há login, backend nem sincronização entre pessoas.
- Atividades, contas e vídeos são da sessão. Vídeo local não é enviado nem compartilhado; Kélvia
  só o vê se estiver na mesma aba.
- Catálogo do Drive é um retrato de 16/10/2026, incompleto em dez pastas e sem sincronização.
  Miniaturas e prévias dependem das permissões do Google Drive de quem está vendo.
- O consolidado das collabs compara o link sem parâmetros: o mesmo post publicado como `/p/` e
  `/reel/` conta duas vezes (comportamento da referência).
- Nenhuma publicação automática foi feita (sem deploy, sem merge).

## Sugestões de melhoria (fora do escopo aprovado)

- Guardar atividades e contas no navegador (ou em um backend) para não perder ao recarregar.
- Autenticação real com papéis (produção, aprovação) e upload de vídeo em armazenamento seguro.
- Normalizar categorias com espaços extras vindas das planilhas (“Pro perfil ”, “Impulsionando ”).
- Exportar Insights e Dashboard em planilha.
- Atualização periódica do catálogo do Drive por integração autorizada.
