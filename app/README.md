# Grupo Mendes · Gestão de Marketing

Sistema de gestão de marketing para **Smart Games**, **Up Machines** e **Centro Liderar**, com
Cronograma, Atividades, Insights, Drive e Dashboard por empresa. Implementa o modelo aprovado em
`../referencia/marketing-grupo-mendes.html` (preservado sem alterações).

Somente frontend: sem backend, autenticação ou integrações externas. O perfil (Carlos/Kélvia) é
simulado e não representa autenticação real.

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run build      # gera dist/ (caminhos relativos, rotas por hash: #/empresa/pagina)
```

Detalhes de arquitetura, persistência, dados importados, diferenças em relação à referência,
pendências (identidade visual oficial) e sugestões: [`../docs/IMPLEMENTACAO.md`](../docs/IMPLEMENTACAO.md).
