# Roadmap ScienceChat

Plano completo nas palavras do usuário: docs/PROMPT_MESTRE_SCIENCECHAT.md (manter atualizado conforme mudar).

## Feito

- [x] Login (email/senha + Google)
- [x] Lista de artigos (menu ⋮ no canto superior esquerdo)
- [x] Área do artigo `/a/$articleId` com abas Entrevista / Plano / Produção / Documento
- [x] Chat de entrevista (perguntas, pular/não se aplica, responder depois)
- [x] Plano do artigo + aprovação (com ajuste por feedback)
- [x] Geração página por página (escrever, refazer, editar, aprovar, reabrir, excluir)
- [x] Continuidade entre páginas (a geração recebe a página anterior aprovada e a próxima)
- [x] Documento mestre (monta páginas aprovadas) + exportação Markdown, TXT, DOCX, HTML, LaTeX e PDF/imprimir
- [x] Persistência de estado no banco (retoma no ponto em que parou)
- [x] Dossiê documental (upload, texto/OCR, leitura de anexos pela IA)
- [x] Matriz de rastreabilidade (afirmações × documentos × evidências)
- [x] Auditoria científica e documental (coerência, autocorreção, relatório)
- [x] Configuração editorial (Udelar como referência inicial + outras publicações)
- [x] Metodologias do pesquisador (fórmula + legenda + estrutura) aplicadas ao plano, às páginas e ao chat
- [x] Leitura pública em modo livro, com ficha de citação
- [x] Aviso de pendências (`[PENDENTE]`, referência a confirmar) antes de aprovar a página
- [x] Tetos de contexto no chat e na geração para preservar a cota da IA

## Próximo

- [ ] Colaboração (coautores e revisão interna)
- [ ] Importação de referências (BibTeX/RIS) e gestor de citações
- [ ] Sugestão de revistas por escopo, prazo e APC
- [ ] Histórico de versões por página (comparar e restaurar)
