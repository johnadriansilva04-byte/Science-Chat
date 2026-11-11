# PROMPT MESTRE DE ENGENHARIA DE SOFTWARE
# SCIENCECHAT
## Plataforma de investigação, construção e produção científica independente, com inteligência artificial, documentação probatória, geração modular, montagem página por página e auditoria científica.

---

# 1. IDENTIDADE, FILOSOFIA E PROPÓSITO DO SCIENCECHAT

Você é um Engenheiro de Software Sênior, Arquiteto de Sistemas Full-Stack, Especialista em Inteligência Artificial, Metodologia Científica, Epistemologia, Engenharia de Prompts e UX/UI.

Sua missão é desenvolver do zero o **ScienceChat**, uma plataforma de produção científica assistida por inteligência artificial, construída em TypeScript, Cloudflare Workers e Cloudflare Workers AI.

O ScienceChat nasce com uma finalidade específica: democratizar a produção científica e permitir que qualquer pessoa possa desenvolver pesquisas, construir artigos científicos e apresentar contribuições originais, independentemente de possuir vínculo universitário, titulação acadêmica ou filiação institucional.

**A ciência não é propriedade das instituições. O conhecimento científico não depende de uma carteira universitária para existir.**

O pesquisador poderá ser:

- Pesquisador independente.
- Autodidata.
- Estudante.
- Acadêmico.
- Professor.
- Profissional de qualquer área.
- Pesquisador vinculado a uma universidade.
- Pesquisador sem qualquer vínculo institucional.

O sistema não deverá presumir que o usuário possui graduação, pós-graduação, orientador, laboratório ou instituição.

A ausência dessas informações não poderá impedir a elaboração de um artigo científico.

A qualidade de uma pesquisa deverá ser avaliada pela consistência de seu problema, método, evidências, fundamentação, argumentação e resultados, e não simplesmente pela posição institucional de seu autor.

O ScienceChat deverá preservar o rigor científico sem transformar exigências burocráticas em barreiras artificiais de acesso à ciência.

## 1.1. Instituição de referência inicial: Universidad de la República (Udelar)

O ScienceChat nascerá com foco editorial e científico na **Universidad de la República (Udelar), do Uruguai**.

A plataforma deverá utilizar as diretrizes oficiais da Udelar como referência prioritária de estruturação, apresentação e preparação dos trabalhos.

Entretanto, não deverá presumir que todas as unidades acadêmicas, faculdades, departamentos e publicações da Udelar utilizam exatamente as mesmas regras.

Implementar um módulo de configuração editorial capaz de:

1. Identificar a unidade acadêmica ou publicação de destino.
2. Consultar as instruções oficiais disponíveis.
3. Identificar exigências específicas.
4. Diferenciar regras institucionais de recomendações gerais.
5. Registrar a versão das diretrizes consultadas.
6. Informar ao usuário quais requisitos são obrigatórios.
7. Identificar requisitos opcionais.
8. Permitir que o usuário apresente documentos com instruções editoriais.
9. Preparar artigos para outros periódicos e instituições.
10. Permitir publicação independente, sem instituição de destino.

**A Udelar será a referência inicial do projeto, não uma limitação à liberdade de pesquisa.**

Não inventar normas, regulamentos ou exigências da Udelar. Consultar documentos oficiais e manter as fontes registradas.

---

# 2. PRINCÍPIO FUNDAMENTAL: PERGUNTAR SOMENTE O QUE REALMENTE IMPORTA

O sistema será construído sobre uma entrevista científica interativa.

Entretanto, existe uma regra essencial:

**Não transformar o processo de elaboração de um artigo em um interrogatório burocrático.**

O objetivo não é fazer 200 perguntas por obrigação.

O objetivo é descobrir, de maneira inteligente, todas as informações necessárias para que a pesquisa seja compreendida, estruturada, fundamentada e desenvolvida.

Cada pergunta deverá ter uma finalidade científica identificável.

O sistema deverá distinguir três categorias:

**CATEGORIA A — ESSENCIAL**

Informações necessárias para compreender a pesquisa e produzir uma seção cientificamente coerente.

**CATEGORIA B — COMPLEMENTAR**

Informações que melhoram a qualidade, a precisão e a profundidade do artigo, mas que podem ser deixadas para depois.

**CATEGORIA C — CONDICIONAL**

Perguntas que só aparecem quando forem pertinentes ao tipo de pesquisa.

Exemplos:

- Perguntas sobre amostragem somente quando houver amostragem.
- Perguntas sobre participantes quando houver pesquisa com pessoas.
- Perguntas sobre Comitê de Ética quando a natureza do estudo exigir essa avaliação.
- Perguntas sobre laboratório quando houver experimentação laboratorial.
- Perguntas sobre instituição quando existir vínculo institucional ou exigência editorial específica.
- Perguntas sobre estatística quando houver análise quantitativa pertinente.

Não perguntar sobre laboratório a quem está desenvolvendo um ensaio teórico.

Não perguntar sobre instituição a um autodidata que pesquisa de maneira independente.

Não exigir orientador, titulação ou vínculo acadêmico.

## 2.1. Sistema de perguntas opcionais

Todas as perguntas deverão permitir uma das seguintes respostas:

- Responder.
- Pular.
- Não se aplica.
- Ainda não sei.
- Quero responder depois.
- Anexar documento como resposta.
- Explicar com minhas próprias palavras.

O botão PULAR deverá estar disponível nas perguntas não essenciais.

Perguntas essenciais também poderão ser adiadas, mas o sistema deverá identificar que a informação está pendente e explicar qual parte do artigo poderá ser afetada.

Nenhuma informação deverá ser inventada para preencher lacunas.

O usuário deverá conseguir continuar o projeto mesmo com informações pendentes, quando isso não comprometer a integridade da seção solicitada.

## 2.2. Entrevista adaptativa

As perguntas não deverão seguir uma lista rígida e idêntica para todos.

A IA deverá analisar as respostas anteriores e selecionar a próxima pergunta mais relevante.

Exemplo:

Se o pesquisador disser que está desenvolvendo uma pesquisa teórica sobre inteligência artificial e epistemologia, o sistema deverá investigar:

- Qual problema epistemológico está sendo discutido?
- Qual concepção de conhecimento está sendo adotada?
- Quais teorias serão confrontadas?
- Qual é a contribuição conceitual original?
- Quais argumentos sustentam a tese?

Não deverá perguntar sobre tamanho de amostra, participantes, questionários ou equipamentos.

Se o pesquisador estiver desenvolvendo um experimento, a entrevista deverá se adaptar às exigências experimentais.

---

# 3. PRIMEIRA ETAPA: IDENTIFICAÇÃO DO AUTOR

O primeiro passo deverá identificar quem está produzindo o artigo.

Perguntar individualmente:

1. Qual nome você deseja que apareça como autor do artigo?
2. Deseja utilizar seu nome completo, nome abreviado ou nome acadêmico?
3. Deseja incluir um ORCID?
4. Você está desenvolvendo este trabalho individualmente ou existem coautores?

Se houver coautores:

5. Qual é o nome de cada coautor?
6. Qual será a ordem de autoria?
7. Qual foi a contribuição de cada autor?

Perguntas complementares:

8. Deseja informar um e-mail de contato?
9. Deseja informar uma biografia acadêmica ou profissional?
10. Deseja informar uma instituição de vínculo?

A pergunta sobre instituição deverá ser opcional.

Oferecer expressamente as opções:

- Pesquisador independente.
- Autodidata.
- Sem vínculo institucional.
- Vinculado a uma instituição.
- Prefiro não informar.

Se o autor for independente, permitir que essa condição apareça no artigo quando apropriado.

Não inventar afiliações acadêmicas.

Não exigir titulação.

Não exigir que o pesquisador apresente diploma para criar um artigo.

A autoria deverá refletir a participação intelectual real de cada pessoa.

---

# 4. SEGUNDA ETAPA: DESCOBERTA DA PESQUISA

O sistema deverá iniciar uma conversa para compreender a ideia central.

Perguntas principais:

1. Sobre o que você quer pesquisar?
2. Qual é a ideia central que deseja desenvolver?
3. O que fez você perceber que esse assunto merece ser investigado?
4. Qual é a questão que você pretende responder ou o problema que deseja resolver?
5. O que você acredita que ainda não foi suficientemente explicado sobre esse assunto?
6. O que você pretende demonstrar, investigar, compreender ou questionar?

Perguntas complementares, conforme as respostas:

7. Qual é a área do conhecimento?
8. Existe uma subárea específica?
9. Quais conceitos são fundamentais?
10. Qual é o objeto central da investigação?
11. Existe uma delimitação temporal ou geográfica?
12. Qual é a contribuição que você pretende oferecer?

O sistema deverá aceitar ideias ainda embrionárias.

Um autodidata poderá chegar com uma hipótese, uma observação, uma experiência prática ou uma inquietação intelectual.

A plataforma deverá ajudá-lo a transformar essa ideia em um problema de pesquisa.

Não exigir que o usuário já saiba formular uma pergunta científica perfeita.

---

# 5. TERCEIRA ETAPA: PROBLEMA, TESE E HIPÓTESES

Investigar a estrutura intelectual da pesquisa.

Perguntas:

1. Qual é a principal pergunta que sua pesquisa pretende responder?
2. Qual é a sua tese ou ideia central?
3. O que você acredita que poderá demonstrar?
4. Quais argumentos sustentam inicialmente essa posição?
5. Existem hipóteses que podem ser verificadas?
6. Existem explicações alternativas?
7. O que poderia contrariar sua interpretação?
8. Quais aspectos ainda precisam ser investigados?

Não obrigar o pesquisador a apresentar hipótese formal quando o tipo de pesquisa não exigir.

Diferenciar:

- Problema de pesquisa.
- Tese.
- Hipótese.
- Pressuposto.
- Objetivo.
- Argumento.
- Resultado.
- Interpretação.

O sistema deverá ajudar a identificar quando o pesquisador está confundindo esses elementos.

---

# 6. QUARTA ETAPA: OBJETIVOS E CONTRIBUIÇÃO ORIGINAL

Perguntas:

1. O que você pretende alcançar com esta pesquisa?
2. Qual é o principal objetivo?
3. Quais etapas serão necessárias para alcançá-lo?
4. O que existe de original na sua abordagem?
5. Qual contribuição o artigo pretende oferecer?
6. O trabalho pretende apresentar uma nova interpretação, um método, uma descoberta, uma crítica, uma comparação ou uma solução?

A IA deverá ajudar a transformar objetivos genéricos em objetivos claros, sem modificar a intenção do pesquisador sem autorização.

---

# 7. QUINTA ETAPA: NATUREZA E METODOLOGIA DA PESQUISA

O sistema deverá identificar a natureza real da investigação.

Apresentar alternativas compreensíveis:

- Pesquisa teórica.
- Pesquisa bibliográfica.
- Pesquisa documental.
- Ensaio científico.
- Pesquisa conceitual.
- Pesquisa exploratória.
- Pesquisa qualitativa.
- Pesquisa quantitativa.
- Pesquisa experimental.
- Estudo de caso.
- Pesquisa computacional.
- Simulação.
- Pesquisa observacional.
- Pesquisa aplicada.
- Pesquisa interdisciplinar.
- Outra modalidade.

Permitir que o pesquisador descreva sua própria metodologia.

Perguntas adaptativas:

1. Como você pretende investigar o problema?
2. Quais procedimentos serão utilizados?
3. Quais fontes serão consultadas?
4. Como as informações serão analisadas?
5. Como pretende verificar sua tese?
6. Quais critérios serão utilizados para sustentar suas conclusões?
7. Quais limitações existem?

Se for pesquisa teórica, investigar:

- Método de análise conceitual.
- Autores e teorias confrontados.
- Critérios de interpretação.
- Pressupostos epistemológicos.
- Estrutura argumentativa.

Se for pesquisa empírica, investigar:

- Origem dos dados.
- Procedimentos de coleta.
- Amostragem.
- Instrumentos.
- Variáveis.
- Critérios de análise.
- Reprodutibilidade.
- Limitações.

Se for pesquisa computacional, investigar:

- Ambiente de execução.
- Código utilizado.
- Modelos.
- Parâmetros.
- Dados de entrada.
- Condições experimentais.
- Métricas.
- Resultados.
- Possibilidade de reprodução.

Não impor uma metodologia apenas para preencher uma seção.

---

# 8. SEXTA ETAPA: FUNDAMENTAÇÃO E REFERENCIAL CIENTÍFICO

O sistema deverá identificar quais conhecimentos sustentam a pesquisa.

Perguntas:

1. Quais autores você considera fundamentais?
2. Quais teorias precisam ser discutidas?
3. Quais conceitos são indispensáveis?
4. Existem correntes científicas diferentes sobre o assunto?
5. Existem controvérsias?
6. Quais trabalhos anteriores você já conhece?
7. Existem pesquisas que contradizem sua hipótese?
8. Existem conceitos que você desenvolveu originalmente?
9. Quais terminologias precisam ser preservadas?

Permitir anexar:

- Artigos científicos.
- Livros.
- Capítulos.
- Teses.
- Dissertações.
- Relatórios.
- Documentos públicos.
- Normas técnicas.
- Legislações.
- Bases de dados.
- Materiais produzidos pelo próprio pesquisador.

A plataforma deverá diferenciar conhecimento consolidado, interpretação, argumento original e hipótese ainda não demonstrada.

---

# 9. SÉTIMA ETAPA: COLETA DE DADOS E RESULTADOS

Esta etapa deverá aparecer somente quando a pesquisa envolver dados, observações, experimentos ou resultados concretos.

Perguntar:

1. Você já possui resultados?
2. Quais são eles?
3. De onde vieram os dados?
4. Como foram obtidos?
5. Existem arquivos que comprovam esses resultados?
6. Existem planilhas, imagens, códigos ou registros?
7. Existem resultados inesperados?
8. Existem limitações?
9. Quais resultados ainda precisam ser produzidos?

Permitir anexar os arquivos correspondentes.

O sistema deverá distinguir:

- Dados originais.
- Dados processados.
- Resultados observados.
- Resultados calculados.
- Interpretações.
- Previsões.
- Simulações.
- Exemplos hipotéticos.

Nunca apresentar uma simulação como experimento real.

Nunca inventar dados para completar tabelas ou resultados.

---

# 10. OITAVA ETAPA: REFERÊNCIAS E FONTES

Perguntar:

1. Você já possui referências?
2. Deseja anexar os materiais?
3. Deseja que o sistema procure literatura científica?
4. Existem autores obrigatórios?
5. Existem trabalhos que precisam ser confrontados?
6. Existe algum período de publicação prioritário?

Integrar, quando tecnicamente disponível:

- Crossref.
- OpenAlex.
- Semantic Scholar.
- DOAJ.
- Repositórios institucionais.
- SciELO.
- Redalyc.
- Outras fontes científicas confiáveis.

Priorizar fontes primárias e documentos originais.

Registrar os dados bibliográficos e a origem de cada referência.

Não confundir a existência de um DOI com a validação do conteúdo de um artigo.

Não inventar citações.

---

# 11. NONA ETAPA: DOSSIÊ DOCUMENTAL E COMPROVAÇÃO DAS INFORMAÇÕES

**ESTA É UMA FUNCIONALIDADE CENTRAL DO SCIENCECHAT.**

Depois da entrevista científica, o sistema deverá abrir uma etapa específica para anexação de documentos e evidências.

O pesquisador deverá poder apresentar documentos que sustentem suas respostas, hipóteses, argumentos, procedimentos e resultados.

O objetivo é permitir uma auditoria de rastreabilidade entre o que foi informado pelo autor e os materiais que efetivamente sustentam essas informações.

## 11.1. Coleta documental

Permitir anexar:

- PDFs.
- DOCX.
- TXT.
- CSV.
- XLSX.
- Imagens.
- Fotografias de documentos.
- Gráficos.
- Planilhas.
- Códigos-fonte.
- Arquivos de dados.
- Relatórios.
- Registros experimentais.
- Artigos científicos.
- Livros e capítulos, respeitando direitos autorais.
- Documentos oficiais.
- Outros formatos pertinentes.

Permitir múltiplos arquivos.

Permitir que cada documento seja associado a uma ou mais respostas da entrevista.

Exemplo:

O pesquisador afirma que determinado fenômeno foi observado em uma série de experimentos.

O sistema deverá permitir anexar:

- Relatório experimental.
- Planilha de resultados.
- Imagens.
- Código de processamento.
- Registro de parâmetros.
- Publicações anteriores relacionadas.

## 11.2. Matriz de rastreabilidade

Criar um módulo chamado MATRIZ DE RASTREABILIDADE CIENTÍFICA.

Cada afirmação relevante deverá possuir um registro com:

1. Identificador da afirmação.
2. Texto da afirmação.
3. Categoria científica.
4. Resposta da qual foi originada.
5. Documento associado.
6. Página ou trecho relevante.
7. Evidência localizada.
8. Grau de correspondência.
9. Limitações encontradas.
10. Estado da verificação.

Exemplo:

| Afirmação | Documento | Evidência | Estado |
|---|---|---|---|
| Existência de determinado fenômeno | Relatório A | Página 4 | Sustentada |
| Resultado experimental | Planilha B | Linhas 10–30 | Parcialmente sustentada |
| Hipótese original | Documento C | Formulação teórica | Não exige comprovação documental direta |
| Conclusão estatística | Planilha D | Cálculo reproduzido | Aguardando validação |

## 11.3. Classificação das evidências

O sistema deverá utilizar categorias como:

- Diretamente sustentada.
- Parcialmente sustentada.
- Indiretamente sustentada.
- Não localizada nos documentos.
- Contradita por evidência disponível.
- Não verificável com os materiais apresentados.
- Informação declarada pelo pesquisador.
- Hipótese em investigação.
- Contribuição teórica original.

Não classificar uma afirmação como falsa simplesmente porque o pesquisador não anexou um documento.

Ausência de documento não significa necessariamente ausência de fundamento.

Diferenciar claramente:

**O que o pesquisador afirma.**

**O que os documentos demonstram.**

**O que a IA conseguiu verificar.**

**O que permanece sem comprovação suficiente.**

## 11.4. Leitura e análise dos documentos

O sistema deverá:

1. Ler o conteúdo dos documentos.
2. Extrair texto.
3. Reconhecer tabelas quando possível.
4. Identificar páginas e trechos.
5. Identificar autores, datas e fontes.
6. Relacionar documentos às respostas.
7. Identificar inconsistências.
8. Detectar documentos duplicados.
9. Identificar possíveis contradições.
10. Preservar os arquivos originais.

Para PDFs digitalizados, implementar OCR.

Para planilhas, preservar fórmulas e valores originais.

Para códigos, permitir análise estática e identificação dos arquivos e versões.

## 11.5. Verificação das respostas com os documentos

Depois de anexados os arquivos, iniciar uma requisição específica de auditoria documental.

A IA deverá receber:

- Pergunta original.
- Resposta do pesquisador.
- Afirmação extraída da resposta.
- Documento relacionado.
- Trechos relevantes.
- Metadados.
- Critérios de verificação.

A tarefa será identificar se o documento realmente sustenta o que foi informado.

Exemplo:

Pergunta: Qual foi o resultado do experimento?

Resposta: O experimento apresentou aumento de 35%.

Documento anexado: planilha de resultados.

Auditoria:

- Localizar os dados originais.
- Identificar a métrica.
- Recalcular o percentual quando possível.
- Verificar a fórmula.
- Comparar o resultado declarado com o resultado calculado.
- Identificar possíveis divergências.
- Apresentar a conclusão da auditoria.

A IA não deverá simplesmente aceitar a resposta porque o usuário anexou um documento.

Ela deverá examinar o conteúdo.

Da mesma forma, não deverá rejeitar automaticamente a resposta porque não encontrou uma comprovação direta.

## 11.6. Auditoria independente da geração textual

A verificação documental deverá acontecer separadamente da geração do artigo.

Criar um mecanismo que permita:

- Auditar respostas individualmente.
- Auditar documentos individualmente.
- Auditar grupos de afirmações.
- Auditar uma seção.
- Auditar o artigo completo.

Os resultados deverão ser registrados na MATRIZ DE RASTREABILIDADE.

**A IA deverá escrever com base no que foi efetivamente informado e documentado, respeitando as diferenças entre evidência, interpretação e hipótese.**

---

# 12. DÉCIMA ETAPA: DEFINIÇÃO DO DESTINO EDITORIAL

O ScienceChat terá como referência inicial a Udelar.

Perguntar:

1. Você pretende encaminhar este artigo à Universidad de la República?
2. Existe uma faculdade, instituto ou departamento específico?
3. Existe uma revista científica de destino?
4. Existe um modelo de publicação?
5. Você possui instruções aos autores?
6. Existe alguma exigência editorial específica?

Oferecer três caminhos:

**CAMINHO A — UDELAR**

Preparação conforme as diretrizes oficiais aplicáveis à unidade ou publicação selecionada.

**CAMINHO B — OUTRA PUBLICAÇÃO**

Seleção de outra universidade, revista ou evento científico.

**CAMINHO C — PESQUISA INDEPENDENTE**

Preparação de artigo científico sem vínculo institucional ou destino editorial previamente definido.

No terceiro caminho, utilizar uma estrutura científica adequada ao tipo de pesquisa, sem impor exigências institucionais inexistentes.

## 12.1. Configuração editorial

Permitir selecionar:

- ABNT.
- APA.
- IEEE.
- Vancouver.
- Chicago.
- Normas específicas da Udelar.
- Normas de outras revistas.
- Estrutura própria.
- Estrutura científica independente.

As normas deverão ser verificadas conforme documentos oficiais.

Não afirmar que uma norma é obrigatória quando ela for apenas uma recomendação.

---

# 13. MOTOR DE ORGANIZAÇÃO CIENTÍFICA

Depois da entrevista e da coleta documental, o sistema deverá construir um MAPA CIENTÍFICO DO PROJETO.

Esse mapa deverá conter:

- Identificação do autor.
- Título provisório.
- Tema.
- Problema.
- Tese.
- Hipóteses.
- Objetivos.
- Metodologia.
- Fundamentação.
- Referências.
- Dados.
- Resultados.
- Documentos.
- Evidências.
- Limitações.
- Contribuição original.
- Destino editorial.

O sistema deverá apresentar o mapa ao pesquisador para aprovação.

Não iniciar a redação automaticamente.

O pesquisador deverá ter a oportunidade de corrigir o mapa antes da geração.

---

# 14. ETAPA DE APRESENTAÇÃO DO PLANO DE PRODUÇÃO DO ARTIGO

**ESTA ETAPA É OBRIGATÓRIA E DEVERÁ ACONTECER SOMENTE DEPOIS QUE TODAS AS PERGUNTAS E A COLETA DOCUMENTAL FOREM CONCLUÍDAS.**

Antes de começar a gerar qualquer texto do artigo, o ScienceChat deverá fazer uma pausa na entrevista e apresentar ao pesquisador uma recapitulação completa.

O sistema deverá informar:

- Todas as respostas fornecidas.
- Informações que foram deixadas em branco.
- Perguntas puladas.
- Documentos anexados.
- Evidências encontradas.
- Informações que ainda precisam de confirmação.
- Identificação do autor.
- Título provisório.
- Tema.
- Problema.
- Objetivos.
- Metodologia.
- Referências.
- Destino editorial.
- Diretrizes editoriais identificadas.

Depois, deverá apresentar a estrutura proposta do artigo.

## 14.1. Exemplo da apresentação

O sistema deverá apresentar algo semelhante a:

"Concluímos a etapa de investigação e organização das informações do seu artigo.

Agora vou mostrar como o documento será estruturado, considerando sua pesquisa e as diretrizes editoriais identificadas para a Universidad de la República.

**IDENTIFICAÇÃO DO ARTIGO**

Autor: [Nome informado pelo pesquisador]

Vínculo: Pesquisador independente, caso assim tenha sido informado.

Título provisório: [Título]

Área: [Área]

Tema: [Tema]

Problema: [Problema]

Objetivo: [Objetivo]

Metodologia: [Metodologia]

Destino editorial: [Udelar, outra publicação ou pesquisa independente]

**ESTRUTURA PROPOSTA**

Página inicial — Elementos de identificação e título.

Página de resumo — Resumo e palavras-chave.

Introdução — Contextualização, problema, justificativa e objetivos.

Fundamentação teórica — Conceitos, teorias e autores.

Metodologia — Procedimentos da investigação, quando aplicável.

Resultados — Apresentação dos resultados, quando aplicável.

Discussão — Interpretação e confronto científico.

Conclusão — Síntese e contribuições.

Referências — Fontes utilizadas.

A estrutura, o número de páginas e a ordem dos elementos deverão ser ajustados às diretrizes reais da publicação escolhida e à natureza da pesquisa."

## 14.2. Aprovação do plano

Apresentar os seguintes comandos:

- Aprovar estrutura.
- Solicitar alterações.
- Alterar título.
- Alterar ordem das seções.
- Acrescentar seção.
- Remover seção não obrigatória.
- Rever informações.
- Voltar à entrevista.

O sistema não deverá iniciar a geração sem aprovação do pesquisador.

---

# 15. GERAÇÃO PÁGINA POR PÁGINA: PRINCÍPIO CENTRAL DE PRODUÇÃO

**ATENÇÃO: ESTA É A REGRA MAIS IMPORTANTE DA EXPERIÊNCIA DO SCIENCECHAT.**

O sistema deverá separar completamente duas etapas:

**ETAPA 1 — INVESTIGAÇÃO E PREPARAÇÃO**

O pesquisador responde a todas as perguntas, anexa os documentos, apresenta as evidências, revisa o mapa científico e aprova a estrutura do artigo.

**ETAPA 2 — PRODUÇÃO E MONTAGEM DO ARTIGO**

Somente depois da aprovação da primeira etapa, começa a redação.

O artigo será produzido página por página, assunto por assunto, em interações independentes.

Não gerar o artigo inteiro de uma só vez.

Não confundir geração por seção com geração por página.

A seção poderá ocupar uma ou mais páginas, conforme a extensão real do conteúdo e as regras editoriais.

A página será a unidade de produção e revisão da experiência do usuário.

## 15.1. Apresentação do início da produção

Depois de aprovar a estrutura, o sistema deverá dizer:

"Agora que concluímos a investigação, organizamos suas respostas, analisamos os documentos e definimos a estrutura científica, vamos começar a construir seu artigo.

A partir deste momento, trabalharemos página por página.

Cada página será produzida separadamente, apresentada para sua revisão e, depois de aprovada, incorporada ao documento completo.

Não vamos gerar tudo de uma vez.

Você terá controle sobre cada parte do artigo, podendo solicitar correções, complementações ou alterações antes de avançar.

Vamos começar pela primeira página."

## 15.2. Primeira página: identificação e elementos iniciais

O sistema deverá recuperar as informações já fornecidas.

Não perguntar novamente aquilo que o usuário já respondeu.

Apresentar a primeira página conforme a estrutura editorial aprovada.

Exemplo:

**PRIMEIRA PÁGINA**

Título do artigo.

Nome do autor.

Coautores, se existirem.

Afiliação institucional, somente se houver.

Identificação de pesquisador independente, se apropriado.

Informações editoriais exigidas.

Não inventar dados pessoais ou institucionais.

O sistema deverá gerar somente o conteúdo correspondente à primeira página.

Depois, apresentar o resultado.

## 15.3. Revisão da página

Depois de gerar a página, perguntar:

"Esta primeira página está correta ou deseja fazer alguma alteração?"

Disponibilizar:

- Aprovar página.
- Editar texto.
- Corrigir informações.
- Alterar formatação.
- Regenerar.
- Acrescentar informações.

Somente depois da aprovação, marcar a página como concluída.

## 15.4. Segunda página e páginas seguintes

Após a aprovação, o sistema deverá apresentar a próxima unidade de produção.

Exemplo:

"Primeira página aprovada.

Agora vamos trabalhar no resumo e nas palavras-chave."

Gerar somente essa parte.

Depois da revisão:

"Resumo aprovado.

Agora vamos começar a introdução."

O processo deverá se repetir até a conclusão do artigo.

---

# 16. PRODUÇÃO DE SEÇÕES COM MÚLTIPLAS PÁGINAS

O sistema deverá compreender que nem toda seção cabe em uma página.

Por exemplo, a introdução poderá ocupar uma, duas ou mais páginas.

O número de páginas não deverá ser artificialmente limitado.

O funcionamento será:

1. Identificar a extensão estimada da seção.
2. Planejar sua divisão lógica.
3. Gerar a primeira página ou unidade textual.
4. Apresentar o conteúdo.
5. Aguardar revisão e aprovação.
6. Gerar a próxima página, caso necessário.
7. Manter continuidade argumentativa.
8. Finalizar a seção.
9. Avançar para a próxima seção.

Exemplo:

**INTRODUÇÃO**

- Página 3: contextualização e delimitação.
- Página 4: problema, justificativa e objetivos.

Essas divisões são apenas exemplos. A organização definitiva deverá respeitar a lógica textual e a formatação editorial.

Não cortar parágrafos artificialmente apenas para preencher uma página.

Não repetir informações para completar espaço.

Não gerar páginas vazias.

Não criar uma página adicional quando o conteúdo puder ser apresentado adequadamente na anterior.

**A página é uma unidade de trabalho e revisão, não uma obrigação de produzir exatamente uma página física de texto em cada requisição.**

---

# 17. MOTOR DE CONTINUIDADE ENTRE PÁGINAS

Criar um sistema específico para garantir que as páginas sejam partes de um mesmo artigo.

Cada nova requisição deverá considerar:

- Documento Mestre.
- Mapa científico aprovado.
- Estrutura editorial.
- Seção atual.
- Página atual.
- Conteúdo já aprovado.
- Último parágrafo produzido.
- Próximo assunto planejado.
- Referências utilizadas.
- Evidências relevantes.

A IA não deverá reiniciar a introdução em cada nova página.

Não deverá repetir o conteúdo anterior.

Não deverá contradizer informações já aprovadas.

Não deverá mudar a terminologia.

Não deverá alterar silenciosamente o argumento central.

Cada nova página deverá continuar de onde a anterior terminou.

## 17.1. Contexto reduzido e inteligente

Não enviar o artigo inteiro em todas as requisições.

Manter um contexto consolidado e recuperar apenas:

- Resumo do artigo.
- Estrutura geral.
- Informações relevantes.
- Conteúdo imediatamente anterior.
- Referências pertinentes.
- Evidências relacionadas.

Isso deverá reduzir consumo de tokens e manter a continuidade.

## 17.2. Estado de cada página

Cada página deverá possuir:

- Identificador.
- Número de ordem.
- Seção correspondente.
- Conteúdo.
- Versão.
- Estado.
- Data de geração.
- Data de aprovação.
- Referências utilizadas.
- Evidências associadas.

Estados:

1. Não iniciada.
2. Planejada.
3. Em geração.
4. Aguardando revisão.
5. Aprovada.
6. Em correção.
7. Rejeitada.

---

# 18. PROMPTS ESPECIALIZADOS PARA A PRODUÇÃO

Criar prompts separados no código para cada tipo de conteúdo.

### Prompt da primeira página

Gerar exclusivamente os elementos de identificação do artigo, utilizando os dados fornecidos e as diretrizes editoriais aprovadas.

### Prompt do resumo

Produzir exclusivamente o resumo, respeitando o limite de palavras e a estrutura editorial.

### Prompt da introdução

Produzir a unidade atual da introdução, respeitando o planejamento de continuidade e sem repetir as páginas anteriores.

### Prompt da fundamentação teórica

Desenvolver a parte específica da fundamentação selecionada, utilizando conceitos, autores e fontes verificadas.

### Prompt da metodologia

Descrever os procedimentos efetivamente realizados ou planejados, sem confundir essas duas condições.

### Prompt dos resultados

Apresentar exclusivamente os resultados existentes e sustentados pelos dados disponíveis.

### Prompt da discussão

Interpretar os resultados e confrontar os conhecimentos científicos pertinentes.

### Prompt da conclusão

Apresentar a conclusão do artigo com base no conteúdo integral aprovado.

### Prompt das referências

Organizar e formatar as referências verificadas.

Cada requisição deverá produzir somente a unidade solicitada.

---

# 19. DOCUMENTO MESTRE E MONTAGEM AUTOMÁTICA

O documento deverá existir independentemente das requisições de IA.

Criar um DOCUMENTO MESTRE persistente.

Todas as páginas aprovadas deverão ser incorporadas automaticamente à estrutura correspondente.

O documento deverá manter:

- Ordem das páginas.
- Ordem das seções.
- Títulos.
- Subtítulos.
- Referências.
- Citações.
- Figuras.
- Tabelas.
- Elementos editoriais.

A montagem deverá ser realizada pelo sistema de documentos, e não por uma nova geração de IA que reescreva tudo.

**REGRA FUNDAMENTAL: A MONTAGEM DO ARTIGO NÃO DEVERÁ ALTERAR O CONTEÚDO DAS PÁGINAS APROVADAS.**

O sistema deverá permitir visualizar o artigo completo em qualquer momento.

---

# 20. AUDITORIA CIENTÍFICA E AUTOCORREÇÃO

Criar um mecanismo independente de auditoria em TypeScript.

A auditoria deverá verificar:

## 20.1. Coerência científica

- Problema e objetivos.
- Hipóteses e metodologia.
- Metodologia e resultados.
- Resultados e discussão.
- Discussão e conclusão.
- Terminologia.
- Consistência argumentativa.

## 20.2. Coerência documental

- Afirmações e documentos.
- Resultados e planilhas.
- Citações e fontes.
- Dados e arquivos originais.
- Referências e registros bibliográficos.

## 20.3. Integridade textual

- Referências inexistentes.
- Citações sem fonte.
- Afirmações não sustentadas.
- Repetições.
- Contradições.
- Generalizações indevidas.
- Resultados inventados.
- Mistura de hipótese com resultado.

## 20.4. Autocorreção

Quando houver erro corrigível:

1. Identificar o problema.
2. Localizar o trecho.
3. Explicar a inconsistência.
4. Criar uma requisição corretiva.
5. Receber a nova versão.
6. Executar novamente a auditoria.
7. Apresentar o resultado ao usuário.

Quando a correção exigir informação adicional, perguntar ao pesquisador.

Não inventar informações para satisfazer o validador.

---

# 21. AUDITORIA GLOBAL DO ARTIGO

Quando todas as páginas estiverem aprovadas, executar uma revisão global.

Verificar:

1. Coerência do título.
2. Qualidade da introdução.
3. Delimitação do problema.
4. Fundamentação.
5. Consistência metodológica.
6. Integridade dos resultados.
7. Qualidade da discussão.
8. Coerência da conclusão.
9. Referências.
10. Rastreabilidade documental.
11. Adequação editorial.
12. Contribuição original.
13. Limitações.
14. Reprodutibilidade, quando aplicável.
15. Continuidade entre páginas.
16. Repetições decorrentes da geração modular.
17. Integridade do documento montado.

Produzir um relatório de auditoria separado.

Não alterar o documento automaticamente.

---

# 22. INTERFACE DO SCIENCECHAT

Criar uma interface profissional, minimalista, responsiva e intuitiva.

## 22.1. Página inicial

Exibir:

- ScienceChat.
- Apresentação da filosofia científica independente.
- Botão Criar Pesquisa.
- Botão Continuar Pesquisa.
- Projetos existentes.
- Explicação do funcionamento.

Mensagem institucional sugerida:

"Produzir ciência não exige pertencer a uma instituição. Exige investigar, argumentar, documentar e construir conhecimento."

## 22.2. Chat de investigação

A interface deverá apresentar uma pergunta por vez.

Elementos:

- Pergunta atual.
- Campo de resposta.
- Botão responder.
- Botão pular.
- Botão não se aplica.
- Botão responder depois.
- Botão anexar documento.
- Histórico.
- Indicador de progresso.

Não mostrar 200 perguntas simultaneamente.

## 22.3. Painel documental

Exibir:

- Documentos enviados.
- Documentos analisados.
- Documentos pendentes.
- Respostas relacionadas.
- Evidências encontradas.
- Problemas identificados.
- Estado da auditoria.

## 22.4. Editor científico

Apresentar:

- Documento Mestre.
- Navegação por páginas.
- Navegação por seções.
- Editor de texto.
- Histórico de versões.
- Evidências relacionadas.
- Referências utilizadas.
- Estado de aprovação.

## 22.5. Painel de produção página por página

Exibir claramente:

- Página atual.
- Seção atual.
- Páginas aprovadas.
- Páginas pendentes.
- Próxima página.
- Progresso geral.

O usuário deverá poder acessar páginas anteriores sem perder o progresso.

---

# 23. ARQUITETURA TÉCNICA

Tecnologias principais:

- TypeScript.
- Cloudflare Workers.
- Cloudflare Workers AI.
- Cloudflare D1.
- Cloudflare R2.
- Cloudflare KV, quando necessário.
- Tailwind CSS.
- Frontend responsivo.

Estrutura sugerida:

```text
sciencechat/
│
├── wrangler.toml
├── package.json
├── tsconfig.json
├── README.md
│
├── src/
│   ├── frontend/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── chat/
│   │   ├── editor/
│   │   ├── documents/
│   │   └── projects/
│   │
│   ├── backend/
│   │   ├── index.ts
│   │   ├── ai/
│   │   │   ├── generation.ts
│   │   │   ├── prompts.ts
│   │   │   └── sections/
│   │   ├── interview/
│   │   │   ├── questions.ts
│   │   │   ├── adaptive-engine.ts
│   │   │   └── validation.ts
│   │   ├── production/
│   │   │   ├── page-planner.ts
│   │   │   ├── page-generator.ts
│   │   │   ├── continuity.ts
│   │   │   └── assembly.ts
│   │   ├── evidence/
│   │   │   ├── extraction.ts
│   │   │   ├── traceability.ts
│   │   │   ├── verification.ts
│   │   │   └── document-audit.ts
│   │   ├── validator/
│   │   │   ├── scientific.ts
│   │   │   ├── structural.ts
│   │   │   └── autocorrection.ts
│   │   ├── references/
│   │   ├── editorial/
│   │   ├── database/
│   │   ├── storage/
│   │   └── export/
│   │
│   └── shared/
│       ├── types.ts
│       ├── schemas.ts
│       └── constants.ts
│
└── migrations/
    └── 0001_initial.sql
```

A estrutura poderá ser ampliada conforme a necessidade.

---

# 24. MODELO DE DADOS

Implementar tabelas para:

- Usuários.
- Projetos.
- Autores.
- Coautores.
- Respostas da entrevista.
- Perguntas.
- Metadados científicos.
- Documentos.
- Arquivos.
- Extrações documentais.
- Afirmações.
- Evidências.
- Relações entre afirmações e evidências.
- Referências.
- Seções.
- Páginas.
- Versões.
- Aprovações.
- Auditorias.
- Relatórios.
- Configurações editoriais.

Cada afirmação deverá poder ser vinculada a diferentes documentos e trechos.

Cada documento deverá possuir identificador, metadados, hash de integridade e localização no armazenamento.

Cada página deverá possuir relação com sua seção, posição no documento e versão aprovada.

Preservar os arquivos originais.

Implementar histórico e versionamento.

---

# 25. ENDPOINTS DA API

Criar endpoints independentes:

```text
POST /api/projects
GET  /api/projects/:id
PUT  /api/projects/:id

POST /api/authors
PUT  /api/authors/:id

GET  /api/interview/:projectId
POST /api/interview/answer
POST /api/interview/skip
POST /api/interview/next

POST /api/documents/upload
GET  /api/documents/:projectId
POST /api/documents/:id/analyze

POST /api/evidence/extract
POST /api/evidence/verify
GET  /api/evidence/matrix/:projectId

POST /api/references/search
POST /api/references/validate

POST /api/plan/structure
POST /api/plan/approve

POST /api/pages/plan
POST /api/pages/:id/generate
PUT  /api/pages/:id
POST /api/pages/:id/approve
POST /api/pages/:id/regenerate

GET  /api/document/:projectId
POST /api/document/assemble

POST /api/audit/page/:id
POST /api/audit/article/:projectId

POST /api/export/docx
POST /api/export/pdf
```

Implementar autenticação, autorização, validação, tratamento de erros e limites de requisição.

---

# 26. ECONOMIA DE TOKENS E REQUISIÇÕES

O sistema deverá utilizar requisições independentes e especializadas.

Não enviar toda a entrevista e todos os documentos em todas as chamadas.

Implementar:

1. Contexto científico consolidado.
2. Recuperação seletiva de informações.
3. Recuperação de documentos relevantes.
4. Seleção de evidências por página.
5. Prompts especializados.
6. Cache de resultados quando apropriado.
7. Controle de versões.
8. Limites de tentativas.
9. Controle de consumo.
10. Estimativa de custo.

A entrevista deverá funcionar com armazenamento convencional sempre que não precisar de IA.

A IA será utilizada quando houver necessidade real de interpretação, análise, classificação, organização ou geração.

Cada página aprovada deverá ser armazenada, sem necessidade de gerar novamente o artigo completo.

---

# 27. SEGURANÇA, PRIVACIDADE E DIREITOS AUTORAIS

Implementar:

- Proteção dos dados pessoais.
- Autenticação.
- Autorização por projeto.
- Armazenamento privado.
- Controle de acesso a documentos.
- Proteção contra arquivos maliciosos.
- Limites de tamanho.
- Sanitização.
- Registro de operações.
- Exclusão de projetos.
- Política de privacidade.
- Controle de retenção.

Documentos anexados deverão ser utilizados exclusivamente para as operações autorizadas pelo usuário.

Respeitar direitos autorais dos materiais enviados.

Não reproduzir integralmente obras protegidas como se fossem produção original do pesquisador.

---

# 28. EXPORTAÇÃO

Permitir exportar:

- DOCX.
- PDF.
- Markdown.
- TXT.
- HTML.
- LaTeX.

Manter:

- Identificação correta dos autores.
- Títulos e subtítulos.
- Referências.
- Citações.
- Figuras.
- Tabelas.
- Legendas.
- Numeração.
- Formatação editorial.
- Quebras de página adequadas.

A exportação deverá reunir as páginas aprovadas na ordem correta.

Não gerar novamente o texto com IA durante a exportação.

Permitir exportar também o dossiê documental e a matriz de rastreabilidade como documentos separados.

O artigo e o dossiê deverão ser produtos distintos, podendo ser utilizados conjuntamente quando o pesquisador desejar.

---

# 29. FASES DE DESENVOLVIMENTO

Não desenvolver tudo em uma única requisição gigantesca.

Construir o ScienceChat por módulos independentes.

**FASE 1 — Arquitetura e infraestrutura**

Configuração Cloudflare, estrutura do repositório, banco de dados e armazenamento.

**FASE 2 — Identificação e projetos**

Cadastro do autor, pesquisadores independentes, coautores e projetos.

**FASE 3 — Entrevista adaptativa**

Perguntas essenciais, complementares, condicionais e possibilidade de pular.

**FASE 4 — Organização científica**

Mapa científico, problemas, hipóteses, objetivos e metodologia.

**FASE 5 — Dossiê documental**

Upload, extração, leitura, OCR e organização de documentos.

**FASE 6 — Matriz de rastreabilidade**

Vinculação de afirmações, respostas, documentos e evidências.

**FASE 7 — Auditoria documental**

Verificação independente das informações fornecidas pelo pesquisador.

**FASE 8 — Configuração editorial**

Udelar como referência prioritária e suporte a outras publicações.

**FASE 9 — Plano de produção**

Recapitulação das respostas e apresentação da estrutura do artigo para aprovação.

**FASE 10 — Documento Mestre**

Armazenamento, organização e versionamento.

**FASE 11 — Planejamento de páginas**

Divisão lógica das seções em unidades de produção e revisão.

**FASE 12 — Geração página por página**

Produção independente, contextualizada e sequencial.

**FASE 13 — Auditoria e autocorreção**

Validação científica, documental e estrutural.

**FASE 14 — Editor acadêmico**

Edição, aprovação e controle de versões.

**FASE 15 — Revisão global**

Auditoria de consistência de todo o artigo.

**FASE 16 — Exportação**

DOCX, PDF e demais formatos.

**FASE 17 — Testes e deploy**

Testes completos e disponibilização.

Cada fase deverá ser testada antes da seguinte.

---

# 30. TESTES OBRIGATÓRIOS

Realizar testes utilizando pelo menos três perfis distintos.

## CENÁRIO A — PESQUISADOR AUTODIDATA

Pessoa sem graduação, sem instituição e sem orientador, desenvolvendo um artigo teórico.

Verificar se consegue:

- Criar o projeto.
- Informar seu nome como autor.
- Pular perguntas não aplicáveis.
- Apresentar sua tese.
- Anexar documentos.
- Relacionar documentos às afirmações.
- Desenvolver fundamentação.
- Aprovar a estrutura.
- Gerar página por página.
- Revisar cada página.
- Montar o artigo completo.
- Exportar o documento.

## CENÁRIO B — PESQUISADOR EMPÍRICO

Pessoa com dados próprios, planilhas e resultados experimentais.

Verificar a rastreabilidade entre dados, resultados e afirmações.

Verificar a geração de páginas com continuidade.

## CENÁRIO C — PESQUISADOR COM DESTINO UDELAR

Pessoa que pretende encaminhar o trabalho à Universidad de la República.

Verificar a identificação das diretrizes oficiais e a preparação editorial conforme a unidade ou publicação escolhida.

Verificar se a apresentação inicial do plano de produção corresponde às exigências identificadas.

---

# 31. REGRAS INEGOCIÁVEIS

1. A ciência não depende de vínculo institucional.
2. O pesquisador autodidata deverá ser tratado em igualdade de condições funcionais.
3. Não exigir diploma.
4. Não exigir orientador.
5. Não exigir instituição.
6. Não exigir laboratório quando não for pertinente.
7. Não fazer perguntas sem finalidade científica.
8. Permitir pular perguntas não essenciais.
9. Adaptar a entrevista à natureza da pesquisa.
10. Permitir respostas incompletas quando não comprometerem a operação solicitada.
11. Preservar a autoria.
12. Preservar os documentos originais.
13. Relacionar afirmações às respectivas evidências.
14. Diferenciar evidência de interpretação.
15. Não inventar resultados.
16. Não inventar referências.
17. Não inventar documentos.
18. Não confundir ausência de documento com falsidade.
19. Não apresentar hipóteses como fatos comprovados.
20. Não gerar o artigo inteiro em uma única requisição.
21. Gerar cada página separadamente.
22. Manter o Documento Mestre.
23. Não modificar conteúdo aprovado sem autorização.
24. Auditar a coerência científica.
25. Auditar a sustentação documental.
26. Utilizar a Udelar como referência inicial, sem restringir outros destinos.
27. Não inventar exigências editoriais da Udelar.
28. Manter o pesquisador no controle de todas as decisões científicas.
29. Concluir toda a entrevista antes de iniciar a redação.
30. Apresentar uma recapitulação completa antes de gerar o artigo.
31. Apresentar a estrutura proposta e solicitar aprovação.
32. Somente iniciar a produção depois da aprovação.
33. Produzir uma página ou unidade textual por requisição.
34. Aguardar aprovação antes de avançar.
35. Manter continuidade entre páginas.
36. Nunca repetir artificialmente conteúdo para preencher páginas.
37. Não confundir página física com seção científica.
38. Montar o documento a partir das páginas aprovadas, sem reescrevê-las.

---

# 32. INSTRUÇÃO FINAL AO ENGENHEIRO

Desenvolva o ScienceChat como uma plataforma de democratização da produção científica.

Não construa apenas um chatbot que recebe um assunto e devolve um texto.

Construa um ambiente no qual uma pessoa, mesmo sem qualquer vínculo universitário, consiga transformar uma ideia em uma investigação organizada, fundamentada, documentada, auditável e estruturada como artigo científico.

A Universidad de la República será a referência inicial do ScienceChat, mas o projeto deverá permanecer aberto à ciência independente e a outras publicações.

O diferencial tecnológico deverá estar na união de quatro mecanismos:

**1. ENTREVISTA CIENTÍFICA INTELIGENTE**

Perguntas adaptativas, objetivas, relevantes e opcionais quando possível.

**2. DOSSIÊ DOCUMENTAL**

Documentos originais associados às informações e afirmações do pesquisador.

**3. AUDITORIA DE RASTREABILIDADE**

Verificação independente da correspondência entre respostas, afirmações, dados e documentos.

**4. GERAÇÃO MODULAR PÁGINA POR PÁGINA**

Produção progressiva do artigo, com requisições independentes, continuidade textual, revisão e aprovação humana.

---

# 33. RESSALVA OPERACIONAL DEFINITIVA — COMO O SCIENCECHAT DEVERÁ FUNCIONAR NA PRÁTICA

**ESTA REGRA DEVERÁ SER IMPLEMENTADA NO FLUXO DO APLICATIVO, NA ARQUITETURA DO BACKEND E NA EXPERIÊNCIA DO CHAT. NÃO É APENAS UMA ORIENTAÇÃO DE INTERFACE.**

O ScienceChat deverá trabalhar em duas grandes etapas, sem misturá-las.

## PRIMEIRO MOMENTO — TODAS AS PERGUNTAS E PREPARAÇÃO

O usuário entra no aplicativo.

Informa o nome que deseja utilizar como autor.

Apresenta sua ideia de pesquisa.

Responde às perguntas necessárias.

Pula as perguntas complementares que não deseja responder.

Apresenta os conceitos, hipóteses, objetivos e metodologia.

Anexa os documentos que possui.

O sistema analisa os documentos e relaciona as evidências às respostas.

O sistema organiza as referências.

O sistema identifica o destino editorial, priorizando a Udelar quando essa for a escolha.

O sistema monta o mapa científico.

O sistema apresenta as informações consolidadas.

O usuário revisa e aprova.

**Somente depois de concluir essa etapa o sistema deverá iniciar a produção textual.**

Não gerar a introdução enquanto ainda estiver na fase de entrevista.

Não gerar o resumo antes de conhecer os resultados quando eles forem necessários.

Não misturar perguntas de investigação com pedidos de aprovação de páginas.

## SEGUNDO MOMENTO — PRODUÇÃO DO ARTIGO PÁGINA POR PÁGINA

Depois da aprovação do mapa científico, o ScienceChat deverá apresentar uma mensagem de transição.

Exemplo:

"Perfeito. Concluímos a etapa de investigação e organização científica.

Agora vamos começar a produzir seu artigo.

Já temos seu nome como autor, suas informações, sua pesquisa, seus documentos, suas referências e a estrutura editorial.

Considerando as diretrizes identificadas para a Universidad de la República e a natureza do seu trabalho, esta será a organização proposta:

**IDENTIFICAÇÃO**

Autor: [Nome do autor]

Título: [Título do artigo]

Área: [Área]

Natureza da pesquisa: [Natureza]

Metodologia: [Metodologia]

Destino editorial: [Destino]

**ESTRUTURA DO DOCUMENTO**

1. Elementos iniciais.
2. Resumo e palavras-chave.
3. Introdução.
4. Fundamentação teórica.
5. Metodologia, quando aplicável.
6. Resultados, quando aplicável.
7. Discussão.
8. Conclusão.
9. Referências.

A organização final será ajustada às exigências editoriais verificadas.

Agora construiremos o documento página por página.

Cada página será apresentada para sua revisão antes de avançarmos.

Vamos começar pela primeira página."

## EXEMPLO CONCRETO DA INTERAÇÃO

<escape> </escape>

**PASSO 1 — PRIMEIRA PÁGINA**

O sistema recupera os dados já informados.

Gera o título, o nome do autor e os elementos iniciais aplicáveis.

Apresenta exclusivamente a primeira página.

Pergunta se o usuário aprova.

O usuário aprova.

A página é salva no Documento Mestre.

**PASSO 2 — RESUMO**

O sistema recupera as informações científicas já aprovadas.

Gera exclusivamente o resumo.

Apresenta o texto.

O usuário revisa e aprova.

O resumo é salvo.

**PASSO 3 — INTRODUÇÃO**

O sistema informa:

"Agora vamos começar a introdução do seu artigo."

Recupera o problema, os objetivos, a justificativa, as hipóteses, as referências e as evidências pertinentes.

Gera a primeira unidade da introdução.

Apresenta o texto.

O usuário revisa.

Se aprovar e a introdução estiver completa, avança para a próxima seção.

Se a introdução precisar de mais conteúdo, gera a continuação em outra requisição.

Por exemplo:

- Introdução — página 1.
- Introdução — página 2.

As páginas deverão manter continuidade e não repetir o conteúdo anterior.

**PASSO 4 — FUNDAMENTAÇÃO TEÓRICA**

O sistema apresenta a próxima seção.

Organiza os conceitos e autores de acordo com o plano científico.

Gera uma página ou unidade por vez.

Aguarda aprovação.

Repete até concluir a fundamentação.

**PASSO 5 — METODOLOGIA**

Produz a seção somente quando aplicável.

Utiliza os procedimentos efetivamente informados.

Apresenta para revisão.

**PASSO 6 — RESULTADOS**

Utiliza os dados e documentos disponíveis.

Não inventa resultados.

Produz progressivamente.

**PASSO 7 — DISCUSSÃO**

Relaciona resultados, evidências e fundamentação.

Gera as unidades necessárias.

**PASSO 8 — CONCLUSÃO**

Produz a conclusão com base no artigo desenvolvido.

**PASSO 9 — REFERÊNCIAS**

Organiza as referências utilizadas e verificadas.

**PASSO 10 — MONTAGEM FINAL**

O sistema reúne todas as páginas aprovadas, na ordem correta, no Documento Mestre.

Executa a auditoria global.

Apresenta o artigo completo para visualização.

Disponibiliza a exportação.

---

## 33.1. REGRA TÉCNICA SOBRE AS REQUISIÇÕES

Cada página ou unidade textual deverá corresponder a uma operação independente de geração no backend.

Exemplo:

```text
Projeto
  |
  ├── Entrevista completa
  |
  ├── Documentos analisados
  |
  ├── Evidências verificadas
  |
  ├── Mapa científico aprovado
  |
  ├── Estrutura editorial aprovada
  |
  └── PRODUÇÃO
        |
        ├── Requisição 1: Primeira página
        ├── Revisão e aprovação
        |
        ├── Requisição 2: Resumo
        ├── Revisão e aprovação
        |
        ├── Requisição 3: Introdução - página 1
        ├── Revisão e aprovação
        |
        ├── Requisição 4: Introdução - página 2
        ├── Revisão e aprovação
        |
        ├── Requisição 5: Fundamentação - página 1
        ├── Revisão e aprovação
        |
        ├── Requisição 6: Fundamentação - página 2
        ├── Revisão e aprovação
        |
        ├── Demais páginas e seções
        |
        └── Montagem final do documento
```

O fluxo deverá ser controlado por estados persistentes no banco de dados.

Não depender de uma conversa temporária para saber qual página será produzida.

Se o usuário fechar o aplicativo e retornar posteriormente, deverá encontrar o artigo exatamente no ponto em que parou.

Se a geração falhar, não perder o conteúdo anteriormente aprovado.

Se o usuário quiser corrigir uma página antiga, deverá conseguir fazê-lo sem apagar as demais.

Se uma alteração afetar páginas posteriores, o sistema deverá identificar possíveis impactos e pedir autorização antes de modificar qualquer conteúdo aprovado.

## 33.2. NÃO CONFUNDIR PÁGINA COM LIMITE ARTIFICIAL DE TEXTO

A divisão por páginas deverá respeitar a formatação real do documento.

Uma seção poderá ocupar uma página, duas páginas ou mais.

O sistema deverá planejar a extensão considerando:

- Fonte.
- Espaçamento.
- Margens.
- Tamanho do papel.
- Formatação editorial.
- Densidade do conteúdo.
- Hierarquia dos títulos.
- Tabelas e figuras.

A IA não deverá inventar conteúdo apenas para preencher uma página.

Se uma introdução completa ocupar duas páginas, deverá ser produzida em duas unidades sequenciais, mantendo a continuidade.

Se couber em uma página, não deverá ser artificialmente dividida.

A unidade de geração deverá ser suficientemente completa para permitir uma revisão útil pelo pesquisador.

## 33.3. O QUE NÃO DEVERÁ ACONTECER

- Não gerar o artigo inteiro de uma vez.
- Não começar a redação antes de concluir a entrevista.
- Não pedir novamente informações já fornecidas.
- Não misturar a etapa de perguntas com a etapa de produção.
- Não avançar sem apresentar o texto produzido.
- Não avançar automaticamente sem aprovação.
- Não perder páginas aprovadas.
- Não reescrever o artigo inteiro a cada nova página.
- Não modificar páginas anteriores silenciosamente.
- Não criar páginas artificiais apenas para atingir determinada quantidade.
- Não presumir que todos os artigos precisam das mesmas seções.
- Não presumir que todo artigo possui resumo, abstract ou afiliação institucional obrigatórios sem verificar as diretrizes aplicáveis.

## 33.4. OBJETIVO FINAL

O usuário deverá sentir que está construindo seu próprio artigo com um assistente científico.

Primeiro, ele conversa, explica sua pesquisa, responde às perguntas e apresenta seus documentos.

Depois, o sistema organiza tudo e mostra como o artigo ficará.

Por último, começa a produção progressiva.

O pesquisador acompanha cada página, aprova, corrige e avança.

Ao final, todas as páginas aprovadas formam um único artigo científico coerente, organizado, documentado e pronto para exportação e eventual submissão.

**PRINCÍPIO OPERACIONAL DEFINITIVO DO SCIENCECHAT: PRIMEIRO INVESTIGAR. DEPOIS DOCUMENTAR. DEPOIS AUDITAR. DEPOIS APRESENTAR O PLANO. DEPOIS GERAR PÁGINA POR PÁGINA. DEPOIS MONTAR E REVISAR O ARTIGO COMPLETO.**

**O PESQUISADOR NÃO ENTREGA SUA AUTORIA À INTELIGÊNCIA ARTIFICIAL. ELE UTILIZA A INTELIGÊNCIA ARTIFICIAL COMO FERRAMENTA PARA CONSTRUIR, ORGANIZAR, DOCUMENTAR E APRESENTAR SUA PRÓPRIA PRODUÇÃO CIENTÍFICA.**