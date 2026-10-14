# Grupo Mendes · Gestão de Marketing (frontend)

Interface de gestão de marketing para **Smart Games**, **Up Machines** e **Centro Liderar**.
Esta etapa tem **somente o frontend**: não há backend, autenticação nem integrações externas.
Os dados ficam no `localStorage` do navegador (modo de demonstração).

## Como executar

```bash
cd app
npm install
npm run dev        # http://localhost:5173
```

Outros comandos:

| Comando             | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `npm run build`     | Verificação de tipos + build de produção (`dist/`) |
| `npm run preview`   | Serve o build de produção                    |
| `npm test`          | Testes unitários (datas, indicadores, repositório) |
| `npm run typecheck` | Só a verificação de tipos                    |

O build usa caminhos relativos e roteamento por hash (`#/empresa/pagina`), então funciona em
qualquer hospedagem estática.

## Estrutura

```
src/
  data/        tipos, listas fixas (empresas, responsáveis, formatos…) e o repositório
  state/       dados da empresa selecionada (React context) e pilha de modais
  forms/       formulários: conteúdo, atividade, conta, link, resultados
  pages/       Cronograma, Atividades, Insights, Drive, Dashboard
  components/  barra lateral, modal acessível, selos, gráficos, estados, filtros
  lib/         datas (fuso America/Fortaleza), indicadores, rotas, formatação
  index.css    TEMA — todas as cores, fontes, raios e sombras
```

## Pontos de extensão

- **Identidade visual:** a identidade oficial do Grupo Mendes não estava no repositório. O tema atual é
  uma base neutra provisória. Para aplicá-la, troque apenas os valores do bloco `@theme` em
  `src/index.css` (cores da marca, barra lateral, fontes, raios, sombras e as cores dos responsáveis)
  e, se houver logotipo, substitua o texto “Grupo Mendes” no topo de `src/components/Sidebar.tsx`.
- **API:** as telas só acessam dados pela interface `Repositorio` (`src/data/repositorio.ts`), que já é
  assíncrona. Para conectar um backend, crie outra implementação com os mesmos métodos e troque a
  constante `repositorio` no fim do arquivo.
- **Chaves no navegador:** `gm-marketing:v1:<empresa>:<coleção>` (coleções: `contas`, `conteudos`,
  `atividades`, `links`).
- **Testar falhas de gravação:** no console do navegador,
  `localStorage.setItem('gm-marketing:simular-erro', '1')`; para voltar ao normal, `removeItem`.

## Regras de dados

- Cada registro é gravado com o `empresaId` da empresa selecionada; trocar de empresa recria o estado.
- Datas são guardadas como `AAAA-MM-DD` e horários como `HH:mm` no fuso America/Fortaleza; o
  calendário calcula dias em UTC puro para não haver deslocamento de dia.
- Métricas vazias são gravadas como “não preenchido” (`null`), diferente de zero.
- O dashboard calcula tudo a partir dos registros locais; sem resultados registrados, mostra
  “Sem resultados registrados” em vez de números.
- Excluir uma conta com conteúdos vinculados é bloqueado; excluir um conteúdo remove só o vínculo
  das atividades ligadas a ele.
