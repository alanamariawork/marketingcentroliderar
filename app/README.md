# Centro Liderar — Gestão de Marketing

Sistema de gestão de marketing exclusivo do **Centro Liderar**, com Cronograma, Atividades,
Insights, Drive e Dashboard e as contas (perfis e canais) administradas pelo Centro Liderar. Implementa o modelo aprovado em
`../referencia/marketing-grupo-mendes.html` (preservado sem alterações).

Somente frontend: sem backend, autenticação ou integrações externas. Sem login, ninguém é
identificado e o envio e a aprovação ficam indisponíveis (ver `src/state/Autenticacao.ts`).

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run build      # gera dist/ (caminhos relativos, rotas por hash: #/pagina)
```

Detalhes de arquitetura, persistência, dados importados, diferenças em relação à referência,
pendências (identidade visual oficial) e sugestões: [`../docs/IMPLEMENTACAO.md`](../docs/IMPLEMENTACAO.md).
