# Centro Liderar — Gestão de Marketing: implementação

Implementação em React + TypeScript + Vite (pasta `app/`) do modelo aprovado em
`referencia/marketing-grupo-mendes.html`. O HTML original foi copiado sem alterações
(SHA-256 `7cd7352c40046864c05e1250f4a9f9291316fb2a418ff0952b167605c75a7961`).

## Escopo desta versão

O sistema é **exclusivo do Centro Liderar** (“Centro Liderar — Gestão de Marketing”). Não há
seletor de empresas: a barra lateral mostra Cronograma, Atividades, Drive e Dashboard (com os Insights dentro), e
o botão “Adicionar conta”, que vincula a nova conta automaticamente ao Centro Liderar.

As contas são perfis e canais administrados pelo Centro Liderar, não empresas: Centro Liderar —
Instagram, MQA — Instagram, Diamante Business — Instagram, Jaciara Mendes — Instagram,
Jaciara — YouTube, Jaciara — TikTok e Jaciara — Tráfego.

Smart Games e Up Machines saíram da interface e do escopo, mas **nenhum dado foi excluído**: o
modelo de dados continua aceitando essas empresas, e registros delas que já estejam salvos no
navegador (chave `mendes-insights-v1`) permanecem gravados, apenas sem exibição. Endereços antigos
`#/centro-liderar/<página>` continuam funcionando; os de outras empresas abrem o Cronograma.

## Como executar

```bash
cd app
npm install
npm run dev        # http://localhost:5173  (abre no Cronograma; rotas #/cronograma, #/dashboard/registros…)
npm test           # testes de regras, dados importados, armazenamento e datas
npm run build      # verificação de tipos + build estático em app/dist
npm run preview    # serve o build em http://localhost:4173
```

Verificação no navegador (opcional): com o `preview` rodando,
`npm i --no-save playwright && node scripts/verificacao-navegador.mjs`.
As capturas de tela ficam em `app/verificacao/` (fora do Git).

## Identidade visual

Desde 18/11/2026 o sistema usa a **aparência do backoffice do Centro Liderar** (pacote
`backoffice-com-pedagogico-2026-11-16.zip`, arquivo `src/styles/tokens.css` de lá), nas páginas claras:

- Fundo em neutro quente `#ebe4da`, cartões brancos com borda `#e9e2da` e sombra discreta.
- Cor principal grafite `#2d3a45` (botões, conta selecionada, gráficos) e acento dourado `#a07a4f`
  (indicador do menu, aba ativa, linha de referência).
- Barra lateral escura `#1c232a`, item ativo `#35383a` com barra dourada, ícones em `#dcc7a8`.
- Texto `#2c2522` / `#574d47` / `#675c55`; sucesso `#2c7a53`, atenção `#95600f`, perigo `#b0281f`.
- Fonte **Inter** (embutida com `@fontsource-variable/inter`, sem depender de serviço externo).
- Marca no menu igual à do backoffice: símbolo "CL" em degradê grafite→dourado, "Centro Liderar" e
  "Gestão de Marketing"; favicon do backoffice.

Os valores ficam no bloco `@theme` de `app/src/index.css`; a marca em `app/src/components/Marca.tsx`.
O tema escuro vinho da Visão Geral do backoffice não foi usado: lá ele vale só para aquela página, e as
páginas operacionais são claras.

## Organização do código

| Camada | Arquivos |
| --- | --- |
| Tema | `src/index.css` |
| Componentes | `src/components/` (menu, modal acessível, avisos, formulário, selos, filtros, tabela) |
| Páginas | `src/pages/` (Cronograma, Atividades, Drive, Dashboard) |
| Formulários | `src/forms/` (atividade, detalhe/aprovação, material, conta, resultados) |
| Dados importados | `src/data/importados/insights.json` (1.203 registros) |
| Catálogo do Drive | `public/dados/drive-catalogo/` (68.592 itens em 3 partes + índice, baixado só ao abrir o Drive) |
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
| Filtros | Memória da aba | Volta ao padrão |
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

- **Login pendente.** Não há autenticação, backend nem sincronização entre pessoas. Sem login, o sistema não
  identifica ninguém e não permite enviar para aprovação, aprovar nem pedir ajustes pela interface (ver abaixo).
- **Cores de Insights pendentes** (ver “Ajustes de 22/10/2026”).
- Atividades, contas e vídeos são da sessão. Vídeo local não é enviado nem compartilhado; Kélvia
  só o vê se estiver na mesma aba.
- Catálogo do Drive é um retrato de 16/10/2026, incompleto em dez pastas e sem sincronização.
  Miniaturas e prévias dependem das permissões do Google Drive de quem está vendo.
- O consolidado das collabs compara o link sem parâmetros: o mesmo post publicado como `/p/` e
  `/reel/` conta duas vezes (comportamento da referência).
- Nenhuma publicação automática foi feita (sem deploy, sem merge).

## Ajustes de 22/10/2026

### 1. Seletor “Simular perfil” removido
- Saiu do cabeçalho. O usuário agora vem de um único ponto de integração (`src/state/Autenticacao.ts`), que
  devolve `null` porque ainda não existe login. Nenhuma identidade é atribuída automaticamente.
- As regras continuam em `src/lib/aprovacao.ts`: Carlos envia, somente Kélvia aprova ou pede ajustes. Sem usuário,
  `podeEnviar`/`podeDecidir` são falsos e `aplicarAcao` recusa a ação. O detalhe da entrega explica a pendência.
- Responsáveis, status, versões e histórico de decisões foram preservados. Alterar data e hora continua
  possível e fica registrado como “Sem identificação”.
- **Pendência:** para voltar a enviar e aprovar pelo sistema é preciso implementar autenticação e devolver a
  pessoa autenticada em `obterUsuarioAutenticado()`.

### 2. Botão “Aguardando Kélvia” removido
- O botão e o filtro ligado a ele saíram de Atividades; todas as atividades aparecem nas três colunas. A coluna
  “Aguardando aprovação”, os status e as regras foram mantidos.

### 3. Cores da página Insights — não aplicadas (falta referência)
Foram lidas no Google Drive as planilhas “MKT_PLANILHA ANALISE DE FUNIL CENTRO LIDERAR _ 2026” e
“ANALISE DE POST - JACIARA 2024/2026”, exportadas em XLSX e HTML, e a formatação de todas as células foi analisada:
- Não há formatação condicional nem legenda de cores em nenhuma aba (a “LEGENDA” da aba JACIARA 25 é a
  distribuição de funil por dia da semana).
- Há linhas pintadas à mão (verde, cinza, roxo, azul, amarelo, vermelho), sem regra: a mesma cor aparece em
  funis, formatos e categorias diferentes, e o verde não corresponde ao maior score do mês.
- As cores dos menus suspensos (chips de ESCALA/NUTRIÇÃO/OBJEÇÃO, categoria, status) não são exportadas pelo
  Google Sheets em XLSX nem em HTML.
Como as associações não puderam ser comprovadas, nenhuma cor foi inventada. **Para aplicar, é preciso fornecer:**
a legenda das cores usadas nas duas planilhas (o que significa cada cor de linha) ou capturas de tela das abas
mostrando as cores dos menus suspensos, indicando a planilha de origem de cada regra.

### 4. Drive: somente fotos e vídeos
- Classificação em `tipoDeMidia` (`src/lib/drive.ts`): MIME type quando existir; depois o tipo do catálogo, que
  foi gerado a partir do MIME (conferido por amostragem no Drive: `image/heif` → Foto, `video/mp4` sem
  extensão → Vídeo, atalhos `application/vnd.google-apps.shortcut` com nome “.jpg” → Documento); por último a
  extensão. Arquivos de criação com MIME de imagem (Corel `.cdr`, Photoshop `.psd`) ficam fora.
- Resultado: 60.764 mídias (42.871 fotos e 17.893 vídeos) e 1.477 pastas com mídia na árvore; 5.805 arquivos
  ficaram fora. Navegação, busca, contadores e paginação usam só esses itens.
- Pastas sem mídia catalogada não aparecem; o aviso deixa claro que isso não prova que estejam vazias
  (dez pastas têm listagem parcial). Nada é movido ou excluído no Drive.

### 5. Vitrine de pastas com capas temáticas
- Cartões 4:3 com capa, nome completo, caminho, quantidade de fotos e vídeos catalogados, “Abrir pasta” e
  “Abrir no Drive”.
- Temas configurados em `DRIVE_TEMAS` (`src/data/constants.ts`): Jaciara, Real Time, Transmissão, Captação de
  Conteúdo, Tráfego, MQA, Diamante e Centro Liderar, identificados pelo nome da pasta ou da pasta acima.
- Jaciara (e Centro Liderar) só recebem foto quando ela está identificada: nome do arquivo com o termo ou pasta
  de fotos imediata com o termo (ex.: “FOTOS ALMOÇO - JACIARA”). Nos demais temas, a capa é uma foto da própria
  pasta (fotos diretas primeiro). Só JPG/PNG/WebP viram capa, porque HEIC e RAW podem não ter miniatura.
- Sem foto adequada, ou se a miniatura falhar, a capa é gráfica (título e ícone do tema). A escolha segue a
  ordem do catálogo, portanto é estável. Miniaturas com carregamento sob demanda.

### 6. Prévia: investigação e correção
Verificado antes de alterar:
- **ID e tipo de link:** a extração funcionava para `/file/d/<id>`, mas também aceitava links de pasta. Agora
  pastas (`/drive/folders/`) e links do Docs não geram prévia.
- **Permissões:** a pasta LIDERAR e os arquivos conferidos estão como “qualquer pessoa com o link: leitor”, então
  a permissão não impede a prévia desses arquivos. Nenhuma permissão foi alterada.
- **Atalhos:** 1.877 “.jpg” e vários “.mov” do catálogo são atalhos do Drive, não arquivos; a prévia usava o
  ID do atalho e falhava. Eles saíram da biblioteca.
- **Incorporação:** o link de compartilhamento (`/view`) não é incorporável; o visualizador `/preview` é. Na
  versão publicada para visualização, a política de segurança da página bloqueia o Google Drive, por isso
  miniaturas e prévias não apareciam ali.
- **Formatos:** HEIC e RAW (ARW) podem não ter miniatura; vídeos grandes podem estar “em processamento”.
- **Antes**, o modal mostrava só um iframe, sem estado de carregamento nem erro.

Agora: fotos abrem como imagem ampliada gerada pelo Drive (carregamento verificável, com “Ampliar”); vídeos
usam o player incorporado do Drive, com controles. O modal tem nome do arquivo, “Carregando…”, aviso após 15 s,
mensagem de falha compreensível, Esc, botão de fechar, foco preso e devolvido, e “Abrir no Drive”.

**Não verificado com arquivos reais:** o ambiente de desenvolvimento não tem acesso de rede ao
drive.google.com, então miniaturas, fotos ampliadas e o player não puderam ser vistos carregando de verdade. Os
testes cobrem o caso de falha (Drive bloqueado). Para confirmar, abra o Drive pelo `npm run dev` ou
`npm run preview` e veja uma foto JPG e um vídeo MP4.

### Testado
- 38 testes de unidade (inclui sem login ninguém envia/aprova, classificação de mídia, capas, ID de arquivo).
- Verificação de tipos e build sem erros.
- 86 verificações no navegador (Chromium): sem seletor de perfil, sem envio/aprovação sem login, Kanban sem
  atividades ocultas, histórico preservado, Drive só com fotos/vídeos/pastas (buscas por “contrato”, “pdf”,
  “docx”, “planilha”), contagens, paginação, prévia de foto e vídeo com Drive bloqueado, foco, botão geral no
  final, celular (390 px) sem rolagem horizontal, e as verificações anteriores de Insights e Cronograma.

## Drive: Acervo e Criativos (30/10/2026)

A página Drive tem duas abas: **Acervo** (a biblioteca de fotos e vídeos de antes, preservada) e **Criativos**
(artes e vídeos produzidos, inclusive no Canva).

### Acervo: filtros, datas e ordenação

- Filtros: palavras-chave, tipo, pasta, e **Período**: qualquer data, por ano, por intervalo (data inicial e
  final) ou somente “Data não informada”. Ano e intervalo são modos de um mesmo campo, então nunca conflitam.
- **Data usada**: “Criação no Drive” ou “Última modificação no Drive”, sempre identificada no resumo dos
  resultados. O texto da tela avisa que essas datas não são a data de gravação nem do evento. Nenhuma data é
  deduzida do nome do arquivo.
- **Ordenação**: relevância da pesquisa (o comportamento anterior), nome A–Z e Z–A, última modificação e criação
  (mais recentes ou mais antigos primeiro). Ordena todos os resultados filtrados antes da paginação; sem data vai
  para o fim nas duas direções; desempate por nome e ID do Drive. Pastas vêm antes dos arquivos e usam a data da
  própria pasta, apresentada como “Pasta modificada no Drive”, nunca como edição dos arquivos internos.
- Com palavras-chave ou filtro de data, a pesquisa cobre a pasta atual e as subpastas.
- **Selos**: tipo (Foto/Vídeo, pílula escura com ícone), ano (quando conhecido) e a data de última modificação
  quando disponível; “Data não informada” quando não.

**Pendência de metadados:** o catálogo atual (consulta de 16/10/2026) **não traz** `createdTime` nem
`modifiedTime`. A estrutura está pronta (`ItemDrive.createdTime` e `ItemDrive.modifiedTime`, em RFC 3339, como o
Drive devolve), mas hoje todos os itens aparecem como “Data não informada” e a tela mostra um aviso. Para ativar os
filtros por data, o catálogo precisa ser gerado de novo pedindo esses dois campos à API do Drive
(`files.list` com `fields=files(id,name,mimeType,createdTime,modifiedTime,parents)`). A verificação no navegador
usa o catálogo real com datas de teste para validar filtros e ordenação.

### Criativos

- Pasta lógica **Produção** (do sistema, não do Google Drive: nada é criado ou movido lá), com um grupo por
  **evento ou campanha** e o grupo “Sem evento vinculado”. O sistema não tinha cadastro de eventos ou campanhas,
  então foi criado um simples (nome, tipo, data, observações) dentro de Produção. Ao abrir um grupo, a tela
  mostra os detalhes do evento, a contagem e os criativos vinculados.
- Busca e filtros por evento/campanha, formato, responsável, status e data (última atualização no sistema).
  Capas: a primeira peça do criativo; sem peça, capa gráfica.
- **Cadastro**: nome (obrigatório), evento/campanha, atividade vinculada (opcional), responsável, formato,
  link editável do Canva (só referência; validado como canva.com), link de arquivo ou pasta do Drive
  (identificado como arquivo ou pasta), observações e as peças: imagens e vídeos anexados ou links de arquivos
  do Drive, com ordem manual (carrosséis). Link de pasta não vira peça.
- **Detalhes**: prévia com navegação entre peças, Abrir no Canva, Abrir no Drive, observações, revisão e
  histórico de versões e decisões (versão, autor, data e hora, decisão, comentário), e consulta de versões
  anteriores. Se a prévia do Drive falhar, a tela explica e oferece o link; as permissões não são alteradas.
- **Status**: Em produção, Em revisão, Ajustes solicitados, Aprovado, derivados das decisões da versão atual.
  Ações: Enviar/Reenviar para revisão (Carlos), Aprovar e Solicitar ajustes (Kélvia; ajustes exigem comentário).
  Decisão por criativo e versão, sem aprovação em lote.
- **Versões**: a aprovação vale para uma versão. Trocar, remover, acrescentar ou reordenar peças de uma versão já
  enviada ou decidida cria a versão seguinte, preserva a anterior e a decisão dela, e exige nova revisão. Antes
  da primeira revisão, o material é ajustado na própria versão. Responsável, evento, vínculo, links e
  observações não mudam a versão.
- **Atividade vinculada**: uma atividade só pode ter um criativo. O criativo é a referência da decisão: a
  atividade passa a mostrar o status e a versão do criativo (Kanban, Cronograma e detalhe), e o detalhe da
  atividade aponta para o criativo em vez de ter material e decisão próprios.

**Pendência de autenticação:** continua sem login. Ninguém é identificado, então os botões de envio e decisão
aparecem desativados com explicação, e nenhuma decisão é atribuída à Kélvia. O fluxo completo (envio, aprovação,
ajustes, nova revisão) está coberto por testes de unidade e passa a funcionar na tela quando
`obterUsuarioAutenticado()` devolver a pessoa logada.

**Armazenamento:** o projeto não tem backend nem armazenamento de arquivos. Os cadastros (criativos, eventos,
versões, decisões) ficam no localStorage, como os Insights, só com texto. Imagens e vídeos anexados ficam no
IndexedDB do navegador (até 200 MB por arquivo), nunca no localStorage. Tudo isso fica **só neste navegador**:
não é enviado ao Google Drive, não aparece para outras pessoas nem em outro aparelho e some se os dados do
navegador forem limpos. Para compartilhar, use links de arquivos do Drive. As atividades continuam só na memória
da aba: o vínculo com uma atividade nova aparece como “não encontrada nesta sessão” depois de recarregar
(as atividades demonstrativas sempre existem). Remover um criativo nunca exclui arquivos do Drive ou do Canva.

### Testado

- 59 testes de unidade (datas do Drive, ano/intervalo/sem data, ordenação global antes da paginação, status,
  decisões, versões, links, vínculo com atividade, filtros, grupos, armazenamento sem binários).
- Verificação de tipos e build sem erros.
- 87 verificações gerais no navegador (sem regressões) e a verificação específica
  `scripts/verificacao-drive-criativos.mjs` (Acervo com e sem datas, ordenação, Criativos, vínculos, imagem,
  vídeo e carrossel, links, nova versão, persistência após recarregar, remoção, celular).

## Dashboard com Insights dentro (17/11/2026)

A aba **Insights** passou a ficar dentro do **Dashboard**, que segue a estrutura do DashPortal adaptada aos
Insights orgânicos. A barra lateral agora mostra Cronograma, Atividades, Drive e Dashboard. Endereços antigos
(`#/insights`, `#/centro-liderar/insights`) abrem `#/dashboard/registros`.

- **Cabeçalho de dados**: fonte (planilhas importadas + registros salvos neste navegador), última atualização,
  botão **Atualizar** e atualização automática a cada 60 minutos (relê os dados locais e importados).
- **Abas de conta**: "Todas as contas" (com collabs contadas uma vez) e uma aba por conta, com a contagem de
  registros. Jaciara Mendes — Instagram continua selecionada por padrão.
- **Período**: Período automático, Hoje, Ontem, Este mês, Últimos dias (quantidade editável), Avançado (De/Até) e
  Todo o histórico. Os números são comparados com o período anterior do mesmo tamanho. Como os registros são
  coletados depois da postagem (a última é de 09/10/2026), o período automático cobre os **30 dias que terminam
  na publicação mais recente da seleção**; Hoje, Ontem e Este mês podem ficar vazios, e a tela diz isso.
- **Subabas** (`#/dashboard/<subaba>`):
  - **Consolidados**: 8 indicadores com variação, taxas e médias, gráfico dos últimos 12 meses, score por regra
    e distribuição do funil.
  - **Detalhamento**: resumo do histórico e tabela mês a mês com linha de total; desempenho por formato.
  - **Publicações**: tendência diária e ranking de publicações (alcance, reproduções, interações, seguidores,
    Score Liderar, Score MQA) com link do Instagram e "Ver / editar".
  - **Registros (Insights)**: a antiga página Insights (tabela paginada, Adicionar dados, edição).
- **Adaptações**: o DashPortal é de tráfego pago. Sem investimento nos Insights orgânicos, CPM/CTR/CPC viraram
  taxa de engajamento (interações ÷ alcance, só nos posts com os dois), alcance médio por post, % de não
  seguidores e tempo médio de visualização. A subaba "Criativos" chama-se **Publicações** para não confundir com
  Drive › Criativos. Valores ausentes continuam sem entrar como zero.
- **Código**: `src/lib/dashboard.ts` (períodos, totais, mês a mês, dia a dia, ranking), `src/pages/Dashboard.tsx`.
  `src/pages/Insights.tsx` e `src/components/FiltrosInsights.tsx` foram removidos.
- **Testes**: `src/__tests__/dashboard.test.ts`; no navegador, `scripts/verificacao-dashboard.mjs` (37 verificações,
  incluindo celular a 390 px) e `scripts/verificacao-navegador.mjs` atualizado (88 verificações).

## Sugestões de melhoria (fora do escopo aprovado)

- Guardar atividades e contas no navegador (ou em um backend) para não perder ao recarregar.
- Autenticação real com papéis (produção, aprovação) e upload de vídeo em armazenamento seguro.
- Normalizar categorias com espaços extras vindas das planilhas (“Pro perfil ”, “Impulsionando ”).
- Exportar Insights e Dashboard em planilha.
- Atualização periódica do catálogo do Drive por integração autorizada.
