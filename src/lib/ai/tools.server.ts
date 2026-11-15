import { tool } from "ai";
import { z } from "zod";
import * as repo from "@/lib/cf/repo.server";
import { searchLiterature, formatHits } from "@/lib/research.server";
import { insertAnexoMarker } from "@/lib/anexo";

export type ToolContext = { userId: string; articleId: string };

/** Nomes das ferramentas, para detecção de chamadas vazadas como texto. */
export const TOOL_NAMES = [
  "pesquisar_bases",
  "listar_anexos",
  "ler_anexo",
  "atualizar_titulo",
  "editar_pagina",
  "acrescentar_na_pagina",
  "anexar_documento_em_pagina",
] as const;

/**
 * Ferramentas que dão ao Pracinha PODER REAL sobre o artigo: alterar o título e
 * editar/acrescentar texto nas páginas A4 (mesmo caminho do banco usado pela UI).
 * O efeito aparece na folha depois que a interface recarrega o artigo.
 */
export function buildTools(ctx: ToolContext) {
  return {
    pesquisar_bases: tool({
      description:
        "Pesquisa literatura científica em bases públicas (OpenAlex/Crossref). Use quando o pesquisador pedir referências, 'o que existe sobre X' ou fatos verificáveis. Retorna títulos, autores, ano e DOI reais.",
      inputSchema: z.object({
        consulta: z.string().describe("Termos de busca (tema, autores, título)."),
        limite: z
          .number()
          .int()
          .min(1)
          .max(15)
          .optional()
          .describe("Máximo de resultados (padrão 8)."),
      }),
      execute: async ({ consulta, limite }) => {
        const hits = await searchLiterature(consulta, limite ?? 8);
        return formatHits(hits);
      },
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
        numero: z.number().int().min(1).describe("Número do anexo (Anexo 1 = número 1)."),
      }),
      execute: async ({ numero }) => {
        const docs = await repo.listDocuments(ctx.userId, ctx.articleId);
        const doc = docs.find((d) => d.seq === numero);
        if (!doc) return `Não existe Anexo ${numero}.`;
        if (doc.text_content) {
          return `Anexo ${numero} — ${doc.filename}:\n${doc.text_content.slice(0, 6000)}`;
        }
        // Sem texto extraído: se for imagem ou PDF digitalizado, tenta a visão
        // sob demanda (ex.: anexado quando a cota de IA estava esgotada).
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
                  return `Anexo ${numero} — ${doc.filename} (PDF digitalizado, transcrito):\n${text.slice(0, 6000)}`;
              } else {
                const { describeImage } = await import("@/lib/ai/gateway.server");
                // O MIME guardado pode ser genérico (ex.: application/octet-stream);
                // o modelo de visão precisa de um image/* — derivamos da extensão.
                const visionMime = doc.mime.startsWith("image/")
                  ? doc.mime
                  : (mimeFromFilename(doc.filename) ?? doc.mime);
                const described = await describeImage(
                  toBase64(bytes),
                  visionMime,
                  IMAGE_DESCRIPTION_PROMPT,
                );
                const text = cleanImageDescription(described);
                if (text)
                  return `Anexo ${numero} — ${doc.filename} (imagem):\n${text.slice(0, 6000)}`;
              }
            }
          } catch {
            return `Anexo ${numero} (${doc.filename}) não tem texto legível e não consegui lê-lo agora (a IA pode estar em descanso). Tente de novo mais tarde.`;
          }
        }
        return `Anexo ${numero} (${doc.filename}) não tem texto legível extraído.`;
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

    editar_pagina: tool({
      description:
        "Substitui TODO o conteúdo de uma página do artigo (em Markdown). Use para reescrever uma página inteira. Numere as páginas a partir de 1.",
      inputSchema: z.object({
        pagina: z.number().int().min(1).describe("Número da página a editar."),
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
        pagina: z.number().int().min(1).describe("Número da página."),
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
        pagina: z.number().int().min(1).describe("Página onde inserir a referência."),
        numero_anexo: z.number().int().min(1).describe("Número do anexo (Anexo N)."),
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
