import { tool } from "ai";
import { z } from "zod";
import * as repo from "@/lib/cf/repo.server";
import { searchLiterature, formatHits } from "@/lib/research.server";
import { insertAnexoMarker } from "@/lib/anexo";
import { normalizeOrcid, isValidOrcid } from "@/lib/front-matter";
import { matchMethodologyReference, methodologyProtocolCode } from "@/lib/methodology";

export type ToolContext = { userId: string; articleId: string };

/** Nomes das ferramentas, para detecção de chamadas vazadas como texto. */
export const TOOL_NAMES = [
  "pesquisar_bases",
  "listar_anexos",
  "ler_anexo",
  "ler_todos_anexos",
  "atualizar_titulo",
  "definir_orcid",
  "editar_pagina",
  "acrescentar_na_pagina",
  "anexar_documento_em_pagina",
  "listar_metodologias",
  "usar_metodologia",
] as const;

/** Lê o texto de um anexo: usa o texto salvo ou tenta OCR/visão sob demanda. */
async function readAnexoText(
  ctx: ToolContext,
  doc: {
    id: string;
    seq: number;
    filename: string;
    mime: string;
    text_content?: string | null;
  },
  limit = 6000,
): Promise<string> {
  if (doc.text_content) {
    return `Anexo ${doc.seq} — ${doc.filename}:\n${doc.text_content.slice(0, limit)}`;
  }
  const {
    isImage,
    isPdf,
    IMAGE_DESCRIPTION_PROMPT,
    PDF_OCR_PROMPT,
    cleanImageDescription,
    mimeFromFilename,
  } = await import("@/lib/documents.server");
  if (isImage(doc.mime, doc.filename) || isPdf(doc.mime, doc.filename)) {
    try {
      const full = await repo.getDocument(ctx.userId, ctx.articleId, doc.id);
      const { readDocumentBytes, toBase64 } = await import("@/lib/cf/storage.server");
      const bytes = await readDocumentBytes(full?.storage_key ?? null, full?.content ?? null);
      if (bytes) {
        if (isPdf(doc.mime, doc.filename)) {
          const { describePdfImages } = await import("@/lib/documents.server");
          const text = await describePdfImages(bytes, PDF_OCR_PROMPT);
          if (text)
            return `Anexo ${doc.seq} — ${doc.filename} (PDF digitalizado, transcrito):\n${text.slice(0, limit)}`;
        } else {
          const { describeImage } = await import("@/lib/ai/gateway.server");
          const visionMime = doc.mime.startsWith("image/")
            ? doc.mime
            : (mimeFromFilename(doc.filename) ?? doc.mime);
          const described = await describeImage(
            toBase64(bytes),
            visionMime,
            IMAGE_DESCRIPTION_PROMPT,
          );
          const text = cleanImageDescription(described);
          if (text) return `Anexo ${doc.seq} — ${doc.filename} (imagem):\n${text.slice(0, limit)}`;
        }
      }
    } catch {
      return `Anexo ${doc.seq} (${doc.filename}) não tem texto legível e não consegui lê-lo agora (a IA pode estar em descanso). Tente de novo mais tarde.`;
    }
  }
  return `Anexo ${doc.seq} (${doc.filename}) não tem texto legível extraído.`;
}

/**
 * Ferramentas que dão ao Pracinha PODER REAL sobre o artigo: alterar o título e
 * editar/acrescentar texto nas páginas A4 (mesmo caminho do banco usado pela UI).
 * O efeito aparece na folha depois que a interface recarrega o artigo.
 */
export const REPEATED_SEARCH_NOTICE =
  "Esta consulta já foi feita nesta mesma mensagem. Os resultados estão acima — use-os e responda ao pesquisador agora, sem repetir a busca.";

/**
 * Envolve a busca de literatura com memória por requisição. O modelo repete a
 * MESMA consulta em passos consecutivos; cada repetição gasta um passo do
 * orçamento (MAX_STEPS=3) e uma chamada de rede, sobrando um passo só para a
 * resposta — que saía curta e sem a pergunta da entrevista. Na repetição
 * devolvemos um aviso curto em vez dos resultados: eles já estão no histórico, e
 * reenviá-los só reforça o loop.
 */
export function memoizeSearch(
  search: (consulta: string, limite: number) => Promise<string>,
): (consulta: string, limite: number) => Promise<string> {
  const seen = new Set<string>();
  return async (consulta, limite) => {
    const key = `${consulta.trim().toLowerCase()}|${limite}`;
    if (seen.has(key)) return REPEATED_SEARCH_NOTICE;
    const result = await search(consulta, limite);
    // Só memoriza o que deu certo: uma falha de rede precisa poder ser tentada
    // de novo no passo seguinte, em vez de virar aviso de "já busquei".
    seen.add(key);
    return result;
  };
}

export function buildTools(ctx: ToolContext) {
  const search = memoizeSearch(async (consulta, limite) => {
    const { hits, degraded } = await searchLiterature(consulta, limite);
    return formatHits(hits, degraded);
  });
  return {
    pesquisar_bases: tool({
      description:
        "Pesquisa literatura científica em bases públicas (OpenAlex/Crossref). Use quando o pesquisador pedir referências, 'o que existe sobre X' ou fatos verificáveis. Retorna títulos, autores, ano e DOI reais.",
      inputSchema: z.object({
        consulta: z.string().describe("Termos de busca (tema, autores, título)."),
        limite: z.coerce
          .number()
          .int()
          .min(1)
          .max(15)
          .optional()
          .describe("Máximo de resultados (padrão 8)."),
      }),
      execute: async ({ consulta, limite }) => search(consulta, limite ?? 8),
    }),

    listar_anexos: tool({
      description:
        "Lista os documentos primários (anexos) do artigo com a numeração estável (Anexo 1, 2, ...), nome, tipo e se há texto legível. Use para saber o que o pesquisador já anexou.",
      inputSchema: z.object({}),
      execute: async () => {
        const docs = await repo.listDocuments(ctx.userId, ctx.articleId);
        if (!docs.length) return "Nenhum anexo ainda.";
        return docs
          .map(
            (d) =>
              `Anexo ${d.seq}: ${d.filename} (${d.mime}, ${Math.round(d.size / 1024)} KB)${
                d.text_content ? "" : " — sem texto legível"
              }${d.note ? ` — obs.: ${d.note}` : ""}`,
          )
          .join("\n");
      },
    }),

    ler_anexo: tool({
      description:
        "Lê o conteúdo de um anexo pelo seu número (Anexo N). Para imagens (fotos, gráficos, digitalizações), usa o modelo de visão para descrever e transcrever o que aparece. Use para analisar o conteúdo e decidir onde ele se encaixa no artigo.",
      inputSchema: z.object({
        numero: z.coerce.number().int().min(1).describe("Número do anexo (Anexo 1 = número 1)."),
      }),
      execute: async ({ numero }) => {
        const docs = await repo.listDocuments(ctx.userId, ctx.articleId);
        const doc = docs.find((d) => d.seq === numero);
        if (!doc) return `Não existe Anexo ${numero}.`;
        return readAnexoText(ctx, doc);
      },
    }),

    ler_todos_anexos: tool({
      description:
        "Lê de uma vez o conteúdo de TODOS os anexos do artigo (Anexo 1, 2, …), transcrevendo imagens/PDFs digitalizados quando necessário. Use quando o pesquisador pedir para ler/olhar todos os documentos, ou quando precisar do quadro completo antes de diagnosticar.",
      inputSchema: z.object({}),
      execute: async () => {
        const docs = await repo.listDocuments(ctx.userId, ctx.articleId);
        if (!docs.length) return "Nenhum anexo ainda.";
        // Cada anexo recebe um trecho; o total é limitado para não estourar o contexto.
        const perDoc = Math.max(1500, Math.floor(16000 / docs.length));
        const parts: string[] = [];
        for (const doc of docs) {
          parts.push(await readAnexoText(ctx, doc, perDoc));
        }
        return parts.join("\n\n---\n\n");
      },
    }),

    listar_metodologias: tool({
      description:
        "Lista as metodologias próprias do pesquisador (título, código e se está aprovada). Use quando ele citar uma metodologia que você não conseguiu identificar.",
      inputSchema: z.object({}),
      execute: async () => {
        const rows = await repo.listMethodologies(ctx.userId);
        if (!rows.length) {
          return 'O pesquisador ainda não tem metodologia própria. Ela é criada na home, em "Criar metodologia", e serve para vários artigos.';
        }
        return rows
          .map(
            (m) =>
              `- ${m.title} (${m.status === "approved" ? "aprovada" : "rascunho"}) — ${methodologyProtocolCode(m.id)}`,
          )
          .join("\n");
      },
    }),

    usar_metodologia: tool({
      description:
        'Acopla ao artigo uma metodologia APROVADA do pesquisador, pelo título, por um trecho do título ou pelo código do protocolo. Use quando ele disser "use a metodologia X". A mesma metodologia pode ser usada em vários artigos.',
      inputSchema: z.object({
        metodologia: z
          .string()
          .min(1)
          .max(200)
          .describe("Título, trecho do título ou código (PROT-XXXXXX) da metodologia citada."),
      }),
      execute: async ({ metodologia }) => {
        const rows = await repo.listMethodologies(ctx.userId);
        const { match, candidates } = matchMethodologyReference(rows, metodologia);
        if (!match) {
          if (candidates.length) {
            return `Mais de uma metodologia casa com "${metodologia}": ${candidates
              .map((c) => c.title)
              .join("; ")}. Pergunte qual delas.`;
          }
          if (!rows.length) {
            return `Não encontrei "${metodologia}" e o pesquisador ainda não tem metodologia própria.`;
          }
          return `Não encontrei "${metodologia}". Metodologias do pesquisador: ${rows
            .map((r) => r.title)
            .join("; ")}.`;
        }
        if (match.status !== "approved") {
          return `A metodologia "${match.title}" ainda está em rascunho. Peça para aprovar a spec no caderno de método antes de acoplar.`;
        }
        await repo.setArticleMethodology(ctx.userId, ctx.articleId, match.id);
        return `Metodologia "${match.title}" acoplada a este artigo. As próximas páginas escritas já usam essa spec como lente; as páginas já aprovadas não mudam sozinhas — se quiser, reescreva a página de Metodologia.`;
      },
    }),

    atualizar_titulo: tool({
      description:
        "Altera o título do artigo no documento. Use quando o pesquisador pedir para mudar o título.",
      inputSchema: z.object({
        titulo: z.string().min(1).max(200).describe("Novo título do artigo."),
      }),
      execute: async ({ titulo }) => {
        await repo.updateArticle(ctx.userId, ctx.articleId, { title: titulo.trim() });
        return `Título atualizado para: ${titulo.trim()}`;
      },
    }),

    definir_orcid: tool({
      description:
        "Registra o ORCID do pesquisador na identificação do trabalho (folha de rosto). Use quando o pesquisador informar o ORCID dele. O identificador é pessoal e dispensa vínculo institucional.",
      inputSchema: z.object({
        orcid: z
          .string()
          .min(1)
          .describe("ORCID informado pelo pesquisador, ex.: 0000-0002-1825-0097."),
      }),
      execute: async ({ orcid }) => {
        const normalized = normalizeOrcid(orcid);
        if (!normalized) return "Não entendi o ORCID — informe no formato 0000-0000-0000-0000.";
        if (!isValidOrcid(normalized))
          return `O ORCID ${normalized} não passou na checagem do dígito verificador. Confira o número (o último dígito pode ser X) ou crie o seu em orcid.org/register.`;
        const existing = await repo.getEditorialConfig(ctx.userId, ctx.articleId);
        let document: Record<string, unknown> = {};
        if (existing?.layout_json) {
          try {
            const parsed = JSON.parse(existing.layout_json) as {
              document?: Record<string, unknown>;
            };
            document = parsed?.document ?? (parsed as Record<string, unknown>) ?? {};
          } catch {
            document = {};
          }
        }
        await repo.setArticleDocument(ctx.userId, ctx.articleId, {
          ...document,
          orcid: normalized,
        });
        return `ORCID ${normalized} registrado na identificação do trabalho (folha de rosto).`;
      },
    }),

    editar_pagina: tool({
      description:
        "Substitui TODO o conteúdo de uma página do artigo (em Markdown). Use para reescrever uma página inteira. Numere as páginas a partir de 1.",
      inputSchema: z.object({
        pagina: z.coerce.number().int().min(1).describe("Número da página a editar."),
        conteudo: z.string().min(1).describe("Novo conteúdo completo da página, em Markdown."),
      }),
      execute: async ({ pagina, conteudo }) => {
        await repo.upsertPage(ctx.userId, ctx.articleId, pagina, conteudo, "draft");
        return `Página ${pagina} reescrita (${conteudo.trim().split(/\s+/).length} palavras).`;
      },
    }),

    acrescentar_na_pagina: tool({
      description:
        "Acrescenta um texto ao final de uma página existente, sem apagar o conteúdo atual. Use para inserir um parágrafo, uma nota ou uma seção.",
      inputSchema: z.object({
        pagina: z.coerce.number().int().min(1).describe("Número da página."),
        texto: z.string().min(1).describe("Texto a acrescentar, em Markdown."),
      }),
      execute: async ({ pagina, texto }) => {
        const current = await repo.getPage(ctx.userId, ctx.articleId, pagina);
        const merged = current?.content
          ? `${current.content.trimEnd()}\n\n${texto.trim()}`
          : texto.trim();
        await repo.upsertPage(
          ctx.userId,
          ctx.articleId,
          pagina,
          merged,
          current?.status ?? "draft",
        );
        return `Conteúdo acrescentado à página ${pagina}.`;
      },
    }),

    anexar_documento_em_pagina: tool({
      description:
        "Referencia um anexo (documento primário) dentro de uma página do artigo, na posição pedida (ex.: após o 3º parágrafo). Insere um marcador citável como [Anexo 3]. Use depois de ler o anexo e decidir onde ele se encaixa.",
      inputSchema: z.object({
        pagina: z.coerce.number().int().min(1).describe("Página onde inserir a referência."),
        numero_anexo: z.coerce.number().int().min(1).describe("Número do anexo (Anexo N)."),
        posicao: z
          .string()
          .optional()
          .describe(
            "Posição em linguagem natural, ex.: 'após o parágrafo 3'. Padrão: fim da página.",
          ),
        legenda: z.string().optional().describe("Legenda opcional, ex.: 'Figura 1 — ...'."),
      }),
      execute: async ({ pagina, numero_anexo, posicao, legenda }) => {
        const docs = await repo.listDocuments(ctx.userId, ctx.articleId);
        const doc = docs.find((d) => d.seq === numero_anexo);
        if (!doc) return `Não existe Anexo ${numero_anexo}.`;
        const current = await repo.getPage(ctx.userId, ctx.articleId, pagina);
        const merged = insertAnexoMarker(current?.content ?? "", numero_anexo, posicao, legenda);
        await repo.upsertPage(
          ctx.userId,
          ctx.articleId,
          pagina,
          merged,
          current?.status ?? "draft",
        );
        return `Anexo ${numero_anexo} referenciado na página ${pagina}${posicao ? ` (${posicao})` : ""}.`;
      },
    }),
  };
}
