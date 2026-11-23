# ScienceChat: uma plataforma de produção científica independente, documentada e auditável com inteligência artificial

**Autor:** John Adrian — Pesquisador independente
**Área:** Ciência da Computação · Metodologia Científica · Epistemologia
**Idioma:** Português (pt-BR)
**Natureza da pesquisa:** Pesquisa aplicada, de desenvolvimento tecnológico, com componente conceitual

## Resumo

Este artigo apresenta o ScienceChat, uma plataforma de produção científica assistida por inteligência artificial cujo objetivo é remover as barreiras institucionais que hoje condicionam o acesso à pesquisa. A premissa epistemológica é direta: a qualidade de uma investigação se mede pela consistência de seu problema, método, evidências e argumentação, e não pela posição institucional de quem a produz. A plataforma organiza o trabalho científico em dois momentos que não se misturam — primeiro a investigação e a preparação documental; depois a produção textual página por página, com aprovação humana em cada unidade. Sobre essa arquitetura, o artigo descreve mecanismos técnicos: uma entrevista científica adaptativa com provocação fundamentada, um dossiê documental com leitura de PDFs digitalizados e imagens, uma matriz de rastreabilidade entre afirmações e evidências, um motor de geração modular com continuidade textual, conformidade editorial com exportação por norma e um fluxo de publicação com revisão por pares. O sistema é implementado em TypeScript sobre Cloudflare Workers, D1 e Workers AI, com fallback para modelos externos, e foi avaliado por meio de cenários de uso: pesquisador autodidata, pesquisador empírico e pesquisador com destino editorial institucional. Os resultados indicam que é possível preservar o rigor científico sem converter exigências burocráticas em barreiras artificiais de acesso à ciência.

**Palavras-chave:** produção científica independente; inteligência artificial; rastreabilidade documental; geração modular; ciência aberta

## Abstract

This article presents ScienceChat, a platform for AI-assisted scientific production whose goal is to remove the institutional barriers that currently condition access to research. The epistemological premise is straightforward: the quality of an investigation is measured by the consistency of its problem, method, evidence, and argumentation, not by the institutional position of its author. The platform separates the scientific workflow into two stages that are never mixed — first investigation and documentary preparation; then page-by-page textual production, with human approval at every unit. Over this architecture, the article describes technical mechanisms: an adaptive scientific interview with evidence-based challenge, a documentary dossier with OCR and vision-based reading, a traceability matrix between claims and evidence, a modular generation engine with textual continuity, editorial compliance with standard-based export, and a publication flow with peer review. The system is implemented in TypeScript on Cloudflare Workers, D1, and Workers AI, with fallback to external models, and was evaluated through usage scenarios: self-taught researcher, empirical researcher, and researcher with an institutional publishing target. The results indicate that scientific rigor can be preserved without turning bureaucratic requirements into artificial barriers to science.

**Keywords:** independent scientific production; artificial intelligence; documentary traceability; modular generation; open science

## 1. Introdução

A produção de conhecimento científico é, há séculos, mediada por instituições. Universidades, laboratórios e periódicos organizam a validação, a memória e a circulação do saber. Essa mediação trouxe ganhos inegáveis de padronização e controle de qualidade. Ela também criou, porém, uma equivalência implícita entre a legitimidade de uma pesquisa e a filiação institucional de quem a realiza. Essa equivalência é falsa. Um argumento não se torna mais verdadeiro porque seu autor possui um vínculo acadêmico, nem menos rigoroso porque não possui.

O problema que este artigo enfrenta é, portanto, duplo. De um lado, existe uma exclusão prática: pesquisadores independentes, autodidatas e profissionais de fora da academia encontram dificuldades para estruturar, documentar e apresentar contribuições originais segundo os padrões exigidos pela comunicação científica. De outro lado, existe um risco técnico: as ferramentas de inteligência artificial generativa amplamente disponíveis tendem a produzir texto plausível sem qualquer vínculo verificável com dados, fontes ou evidências, o que agrava o problema em vez de resolvê-lo.

A questão de pesquisa que orienta este trabalho pode ser assim formulada: é possível construir uma plataforma que reduza as barreiras de acesso à produção científica sem sacrificar o rigor, a rastreabilidade e a autoria? A hipótese defendida é que sim, desde que a ferramenta seja projetada em torno de três compromissos: separar investigação de redação, exigir aprovação humana em cada unidade textual e manter a correspondência entre o que o autor afirma e o que os documentos demonstram.

O objetivo geral é desenvolver e descrever o ScienceChat, uma plataforma de produção científica assistida por inteligência artificial. Os objetivos específicos são: (i) projetar um fluxo que impeça a mistura entre entrevista e redação; (ii) implementar um dossiê documental com extração de texto, OCR e associação de cada documento às respostas; (iii) construir um motor de geração modular página por página com continuidade; (iv) implementar conformidade editorial com exportação por norma e elementos pré-textuais; e (v) avaliar a plataforma em cenários representativos de pesquisadores sem vínculo institucional.

A justificativa é simultaneamente epistemológica e técnica. Epistemológica, porque a ciência é um método e não um privilégio; técnica, porque a automação da escrita só é defensável quando subordinada à verificação.

## 2. Fundamentação teórica

### 2.1. A ciência como método, não como credencial

A distinção entre a validade de um enunciado e a autoridade de quem o profere é antiga na filosofia da ciência. O critério de demarcação não repousa sobre o título de quem fala, mas sobre a possibilidade de submeter o enunciado a exame. Uma investigação se sustenta quando seu problema é claro, seu método é explícito, suas evidências são apresentáveis e sua argumentação é coerente. Essa é a base conceitual que autoriza tratar um pesquisador independente em igualdade de condições funcionais com um pesquisador vinculado a uma instituição.

A consequência prática dessa posição é que a ferramenta não deve presumir graduação, orientador, laboratório ou vínculo. Quando essas informações existirem, elas são registradas; quando não existirem, a ausência não pode impedir a elaboração do trabalho. O ScienceChat aceita o ORCID como credencial substituta do vínculo: um identificador pessoal e gratuito que confere rastreabilidade ao autor sem exigir afiliação.

### 2.2. Geração de texto e o problema da sustentação

Modelos de linguagem produzem texto estatisticamente plausível. Essa característica é útil para a forma e perigosa para o conteúdo: um texto pode soar rigoroso sem que cada afirmação esteja sustentada. A literatura sobre verificação de geração automática converge para uma exigência metodológica: separar a produção do texto da verificação de suas afirmações. É essa separação que o ScienceChat adota como princípio de arquitetura, tratando a auditoria documental como um mecanismo independente da escrita.

### 2.3. Continuidade em geração modular

A produção textual fragmentada corre o risco de incoerência: repetição, contradição e perda de fio argumentativo entre unidades. A solução adotada não é enviar o documento inteiro a cada requisição, mas manter um contexto consolidado — mapa científico, resumo, estrutura, conteúdo imediatamente anterior, referências e evidências pertinentes — de modo que cada nova página continue de onde a anterior terminou, sem repetir nem contradizer o que já foi aprovado.

### 2.4. Verificação como prática, não como adjetivo

Um elemento que distingue o ScienceChat de assistentes genéricos é tratar a verificação como componente de primeira classe. Três decisões decorrem dessa posição: (i) a provocação ao pesquisador deve ser fundamentada — uma objeção sem fonte é tão fraca quanto uma afirmação sem evidência; (ii) a ausência de documento não é prova de falsidade — afirmações declaradas, hipóteses e contribuições teóricas originais têm estatuto epistêmico próprio; (iii) o sistema deve distinguir explicitamente o que o autor afirma, o que os documentos demonstram, o que a auditoria verificou e o que permanece sem comprovação.

## 3. Metodologia

A pesquisa é de natureza aplicada e de desenvolvimento tecnológico, com componente conceitual. O percurso metodológico compreendeu cinco etapas.

Primeiro, a especificação do fluxo científico em dois momentos estanques, derivada da análise das etapas reais de uma investigação: identificação do autor, descoberta da pesquisa, problema e hipóteses, objetivos e contribuição, natureza e metodologia, fundamentação, dados e resultados, referências, dossiê documental, conformidade editorial e publicação.

Segundo, o projeto e a implementação da plataforma em TypeScript, sobre o runtime de borda Cloudflare Workers, com persistência relacional em D1 (SQLite distribuído), armazenamento de arquivos e inferência por Workers AI — com fallback para modelos externos quando a cota do provedor primário se esgota. A escolha por uma arquitetura de borda buscou baixa latência e operação sem servidores dedicados.

Terceiro, a construção dos mecanismos centrais: (i) entrevista adaptativa com perguntas classificadas em essenciais, complementares e condicionais, conduzida por um assistente que testa afirmações e exerce o papel de advogado do diabo com fontes reais de bases públicas (OpenAlex/Crossref); (ii) dossiê documental com extração de texto de DOCX e PDF, OCR de documentos digitalizados e leitura de imagens por modelo de visão; (iii) matriz de rastreabilidade, que vincula afirmações a respostas, documentos, trechos e grau de correspondência; (iv) motor de geração página por página com continuidade e saneamento do texto produzido.

Quarto, a conformidade editorial e a saída: configuração do destino editorial (Udelar como referência inicial, outras publicações ou publicação independente), geração de elementos pré-textuais no padrão ABNT (capa, folha de rosto com nota de natureza, numeração progressiva de seções), exportação em Markdown, TXT, HTML, LaTeX, DOCX e PDF/impressão, e leitura em modo livro.

Quinto, a publicação: um fluxo com estados (rascunho → submetido → em revisão → aceito → publicado) que aplica uma revisão por pares automatizada sobre o documento completo e, uma vez aprovado, expõe o artigo em uma área pública com identificador estável e citação sugerida.

Como limitação metodológica, registra-se que a avaliação é funcional e orientada a cenários, e não um estudo controlado com amostra ampla. Os resultados devem ser lidos como demonstração de viabilidade e não como medição de eficácia comparativa.

## 4. Resultados

### 4.1. A separação entre investigação e produção

O primeiro resultado é arquitetural. A plataforma implementa uma máquina de estados persistente em que a fase de produção textual só é alcançada após a conclusão da entrevista, da coleta documental e da aprovação explícita da estrutura do artigo. O sistema não inicia a redação antes da aprovação; não pergunta novamente o que já foi respondido; e não avança de página sem apresentar o texto produzido e aguardar decisão do pesquisador. Essa separação, verificada nos três cenários, elimina a principal fonte de degradação observada em assistentes que redigem a partir de um tema genérico.

Um detalhe operacional relevante é a guarda da entrevista: o sistema impede que o diálogo pule etapas essenciais (por exemplo, avançar para resultados sem que o método tenha sido esclarecido) e não repete perguntas já respondidas, ainda que reformuladas. Isso sustenta a qualidade do material que chega à fase de escrita.

### 4.2. Dossiê documental e matriz de rastreabilidade

O segundo resultado é a materialização da correspondência entre afirmações e evidências. Cada afirmação relevante recebe um registro com identificador, texto, categoria científica, resposta de origem, documento associado, trecho relevante, grau de correspondência, limitações e estado de verificação. A plataforma distingue explicitamente o que o pesquisador afirma, o que os documentos demonstram, o que a auditoria conseguiu verificar e o que permanece sem comprovação suficiente. Um resultado importante dessa distinção é que a ausência de documento não é tratada como prova de falsidade: a classificação "não verificável com os materiais apresentados" é diferente de "contradita por evidência".

A leitura documental cobre três situações antes frágeis: texto nativo de DOCX e PDF com codificação comprimida, documentos digitalizados (imagem sem camada de texto), e fotografias de páginas ou gráficos. Nos dois últimos casos, um modelo de visão extrai o conteúdo sob demanda; quando a extração é impossível (formatos de compressão de imagem não suportados, como JBIG2 ou JPEG 2000), o sistema avisa em vez de falhar silenciosamente.

### 4.3. Geração página por página com continuidade

O terceiro resultado é o motor de produção modular. A seção científica é separada da página física: uma seção pode ocupar uma ou mais páginas, e a página é tratada como unidade de trabalho e revisão, não como obrigação de preencher exatamente uma folha. O sistema mantém um documento mestre persistente, no qual cada página aprovada é incorporada automaticamente, preservando ordem, títulos, referências e elementos editoriais. A montagem final reúne as páginas aprovadas sem reescrevê-las, garantindo que o texto que o pesquisador aprovou seja o texto que aparece no documento.

Dois mecanismos de saneamento complementam a geração: a remoção de meta-comentário (frases dirigidas ao pesquisador que vazam para o conteúdo, como "vou escrever…" ou resquícios de chamadas de ferramenta) e a deduplicação de parágrafos e frases repetidas entre páginas — defeitos típicos da geração fragmentada. Páginas que fiquem abaixo do mínimo de extensão recebem aviso explícito, convidando o pesquisador a regenerar ou revisar.

### 4.4. Conformidade editorial e exportação

O quarto resultado é a ponte entre o rascunho e a submissão. O módulo editorial registra o destino do trabalho — Udelar como referência inicial, outra publicação ou publicação independente — e o padrão de citação escolhido (ABNT, APA, IEEE, Vancouver, Chicago, norma própria da Udelar ou padrão do próprio autor), sem inventar requisitos: o que não foi verificado em documento oficial fica marcado como pendente.

Sobre as páginas aprovadas, o sistema gera os elementos pré-textuais da ABNT NBR 14724 — capa com autor, título e local/ano; folha de rosto com a nota de natureza do trabalho; numeração progressiva de seções — e exporta o documento em Markdown, TXT, HTML, LaTeX e DOCX, além da renderização em folha A4 para impressão/PDF. Um modo de leitura em livro permite revisar o texto integral com a paginação contínua. Nenhuma etapa de exportação reescreve o conteúdo aprovado: os formatos apenas reembalam o mesmo texto.

### 4.5. Avaliação por cenários

No cenário do pesquisador autodidata, a plataforma permitiu criar o projeto, informar o nome como autor e ORCID, pular perguntas não aplicáveis, apresentar a tese, anexar documentos (incluindo PDFs digitalizados), desenvolver a fundamentação, aprovar a estrutura, gerar páginas sucessivas com continuidade, exportar nos formatos exigidos e submeter à revisão por pares. Nenhuma etapa exigiu diploma, orientador ou instituição.

No cenário do pesquisador empírico, verificou-se a rastreabilidade entre dados, resultados e afirmações. A plataforma recusou-se a inventar resultados ausentes e sinalizou os pontos em que a sustentação documental era parcial.

No cenário com destino editorial institucional, a plataforma tratou a universidade de referência como prioridade editorial sem inventar exigências: os requisitos foram registrados como itens a verificar em documentos oficiais, e a estrutura proposta foi apresentada para aprovação antes de qualquer redação.

Um caso de uso real, conduzido durante o desenvolvimento, ilustra o fluxo completo: um pesquisador independente documentou uma tese sobre filtragem administrativa estatal a partir de certidões digitais, boletins de ocorrência, despachos judiciais e logs de atendimento — material heterogêneo que exigiu OCR, visão e montagem de cronologia. O sistema sustentou a entrevista até a consolidação da tese, produziu o plano e as páginas com aprovação, e apontou na auditoria as afirmações que careciam de evidência documental — exatamente os pontos que o próprio pesquisador havia listado como pendentes.

### 4.6. Discussão

Os resultados sustentam a hipótese inicial com uma ressalva. A separação entre investigação e produção, a rastreabilidade documental e a geração modular efetivamente reduzem o risco de texto plausível e insustentado. A conformidade editorial e a exportação por norma aproximam o rascunho da submissão real sem delegar a autoria. Contudo, a qualidade final permanece dependente da qualidade das informações fornecidas pelo pesquisador: a plataforma organiza, verifica e explicita, mas não substitui o juízo científico de quem investiga. Essa dependência não é um defeito, e sim a confirmação do princípio central: o pesquisador não entrega sua autoria à inteligência artificial; ele a utiliza como ferramenta.

Uma limitação relevante é que a avaliação não mediu, de forma quantitativa, o esforço cognitivo do usuário nem a taxa de erro da auditoria em conjuntos documentais extensos. O casamento entre afirmações e trechos de documentos é feito por sobreposição lexical e sinais textuais, o que é suficiente para sinalizar pontos de atenção, mas não substitui a leitura humana do dossiê. Trabalhos futuros deveriam instrumentar essas medidas e comparar a plataforma com fluxos assistidos por outros modelos.

## 5. Conclusão

Este artigo apresentou o ScienceChat como uma plataforma de produção científica independente, documentada e auditável. A contribuição principal é a articulação de mecanismos — entrevista científica adaptativa com provocação fundamentada, dossiê documental com OCR e visão, matriz de rastreabilidade, geração modular página por página, conformidade editorial com exportação por norma e publicação com revisão por pares — em um fluxo que preserva o rigor sem converter exigências burocráticas em barreiras de acesso. A implementação em TypeScript sobre infraestrutura de borda demonstra a viabilidade técnica de operar esse fluxo com baixo custo e sem servidores dedicados.

A conclusão central é epistemológica antes de ser tecnológica: a ciência não é propriedade das instituições. A qualidade de uma pesquisa se mede pela consistência de seu problema, método, evidências e argumentação. Uma plataforma que respeite essa premissa pode devolver a produção do conhecimento a quem tem uma ideia, um problema e a disposição de investigar.

## Referências

As referências deste artigo devem ser verificadas e completadas pelo autor junto às bases científicas. Recomenda-se consultar Crossref, OpenAlex e SciELO para os trabalhos citados conceitualmente na seção 2, bem como os documentos oficiais de diretrizes editoriais da instituição de destino, quando houver.

- Documentação oficial da plataforma Cloudflare Workers, D1 e Workers AI (a verificar e citar conforme a versão consultada).
- Diretrizes editoriais da Universidad de la República — Udelar (a verificar junto aos documentos oficiais da unidade ou publicação de destino).
- ABNT NBR 14724:2011 — Trabalhos acadêmicos: apresentação (a verificar e citar conforme a versão vigente).

---

*Criado com ScienceChat · Variant · CEO John Adrian*
