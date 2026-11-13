import { tool } from "ai";
import { z } from "zod";
import * as repo from "@/lib/cf/repo.server";
import { searchLiterature, formatHits } from "@/lib/research.server";
import { insertAnexoMarker } from "@/lib/anexo";

export type ToolContext = { userId: string; articleId: string };

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
        "Lê o texto extraído de um anexo pelo seu número (Anexo N). Use para analisar o conteúdo do documento e decidir onde ele se encaixa no artigo.",
      inputSchema: z.object({
        numero: z.number().int().min(1).describe("Número do anexo (Anexo 1 = número 1)."),
      }),
      execute: async ({ numero }) => {
        const docs = await repo.listDocuments(ctx.userId, ctx.articleId);
        const doc = docs.find((d) => d.seq === numero);
        if (!doc) return `Não existe Anexo ${numero}.`;
        if (!doc.text_content) {
          return `Anexo ${numero} (${doc.filename}) não tem texto legível extraído (talvez seja imagem/PDF digitalizado).`;
        }
        return `Anexo ${numero} — ${doc.filename}:\n${doc.text_content.slice(0, 6000)}`;
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
