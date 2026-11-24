import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/cf/auth-middleware";
import { base64ToBytes } from "@/lib/base64";
import {
  cleanMethodologyReply,
  methodologyLinkError,
  methodologySectionText,
  METHODOLOGY_STATUS,
} from "@/lib/methodology";
import * as repo from "@/lib/cf/repo.server";

type Part = { type: string; text?: string };

export type MethodologyMessageView = { id: string; role: string; parts: Part[] };

export type MethodologyDocumentView = {
  id: string;
  seq: number;
  filename: string;
  mime: string;
  size: number;
  note: string | null;
  hasText: boolean;
  created_at: string;
};

export type MethodologyListItem = {
  id: string;
  title: string;
  status: string;
  hasSpec: boolean;
  updated_at: string;
};

function parseParts(raw: string): Part[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Part[]) : [];
  } catch {
    return [{ type: "text", text: raw }];
  }
}

function partsText(parts: Part[]): string {
  return parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

/** Transcrição do chat de método, no formato que o modelo entende. */
async function loadTranscript(userId: string, methodologyId: string): Promise<string> {
  const msgs = await repo.listMethodologyMessages(userId, methodologyId);
  return msgs
    .map(
      (m, i) =>
        `[${i + 1}] ${m.role === "user" ? "pesquisador" : "assistente"}: ${partsText(parseParts(m.parts))}`,
    )
    .join("\n");
}

/**
 * Corpus anexado à metodologia. A IA só pode citar o que está aqui: a spec
 * proíbe inventar dados, então os anexos entram com a numeração estável.
 */
async function corpusBlock(userId: string, methodologyId: string): Promise<string> {
  const docs = await repo.listMethodologyDocuments(userId, methodologyId);
  if (!docs.length) return "";
  return `DOCUMENTOS ANEXADOS À METODOLOGIA (numeração estável):\n${docs
    .map(
      (d) =>
        `Anexo ${d.seq}: ${d.filename}${d.note ? ` — ${d.note}` : ""}${
          d.text_content ? `\nTrecho: ${d.text_content.slice(0, 600)}` : "\n(sem texto extraído)"
        }`,
    )
    .join(
      "\n",
    )}\nCite os anexos pelo número (ex.: [Anexo 2]). Nunca cite anexo que não esteja nesta lista.`;
}

export const listMyMethodologies = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .handler(async ({ context }) => {
    const rows = await repo.listMethodologies(context.user.id);
    return rows.map(
      (r) =>
        ({
          id: r.id,
          title: r.title,
          status: r.status,
          hasSpec: Boolean(r.content?.trim()),
          updated_at: r.updated_at,
        }) as MethodologyListItem,
    );
  });

export const createMethodology = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { title?: string; seed?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    const title = data.title?.trim() || data.seed?.trim() || undefined;
    const methodology = await repo.createMethodology(context.user.id, title);
    // A semente NÃO é gravada aqui: o workspace a envia como primeira mensagem
    // (com `?seed=`), e assim a IA já responde no primeiro turno. Gravar antes
    // deixaria um turno do pesquisador sem resposta até ele reenviar.
    return { id: methodology.id };
  });

export const getMethodologyWorkspace = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string }) => d)
  .handler(async ({ data, context }) => {
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");
    const [messages, documents, articles] = await Promise.all([
      repo.listMethodologyMessages(context.user.id, data.methodologyId),
      repo.listMethodologyDocuments(context.user.id, data.methodologyId),
      repo.listArticlesByMethodology(context.user.id, data.methodologyId),
    ]);
    return {
      methodology: {
        id: methodology.id,
        title: methodology.title,
        content: methodology.content,
        status: methodology.status,
        created_at: methodology.created_at,
        updated_at: methodology.updated_at,
      },
      messages: messages.map(
        (m) => ({ id: m.id, role: m.role, parts: parseParts(m.parts) }) as MethodologyMessageView,
      ),
      documents: documents.map(
        (d) =>
          ({
            id: d.id,
            seq: d.seq,
            filename: d.filename,
            mime: d.mime,
            size: d.size,
            note: d.note,
            hasText: Boolean(d.text_content),
            created_at: d.created_at,
          }) as MethodologyDocumentView,
      ),
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        phase: a.phase,
        updated_at: a.updated_at,
      })),
    };
  });

/**
 * Um turno da entrevista de método. Persiste a fala do pesquisador, chama a IA
 * com o prompt de método e persiste a resposta. Usa o modelo leve: é diálogo
 * curto e guiado, como a entrevista do artigo.
 */
export const sendMethodologyMessage = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string; text: string }) => d)
  .handler(async ({ data, context }) => {
    const text = data.text.trim().slice(0, 4000);
    if (!text) throw new Error("Escreva uma observação antes de enviar");
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");

    await repo.addMethodologyMessage(context.user.id, data.methodologyId, "user", [
      { type: "text", text },
    ]);

    const { generateFinalText, interviewModelId } = await import("@/lib/ai/gateway.server");
    const { METHODOLOGY_INTERVIEW_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const [transcript, corpus] = await Promise.all([
      loadTranscript(context.user.id, data.methodologyId),
      corpusBlock(context.user.id, data.methodologyId),
    ]);
    const prompt = [
      `METODOLOGIA EM CONSTRUÇÃO: ${methodology.title}`,
      corpus,
      `ENTREVISTA DE MÉTODO:\n${transcript}`,
      "Responda ao pesquisador e faça a próxima pergunta de método.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await generateFinalText(
      prompt,
      METHODOLOGY_INTERVIEW_INSTRUCTIONS,
      700,
      interviewModelId(),
    );
    const reply = cleanMethodologyReply(raw);
    if (!reply) throw new Error("A IA não retornou texto. Tente novamente.");
    await repo.addMethodologyMessage(context.user.id, data.methodologyId, "assistant", [
      { type: "text", text: reply },
    ]);
    return { reply };
  });

/**
 * Consolida a entrevista em spec (Markdown, sete seções fixas) e salva como
 * rascunho. Aprovar é um ato separado do pesquisador.
 */
export const generateMethodologySpec = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string; feedback?: string }) => d)
  .handler(async ({ data, context }) => {
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");
    const [transcript, corpus] = await Promise.all([
      loadTranscript(context.user.id, data.methodologyId),
      corpusBlock(context.user.id, data.methodologyId),
    ]);
    if (!transcript.trim()) throw new Error("Converse com o Pracinha antes de gerar a spec");

    const { generateFinalText } = await import("@/lib/ai/gateway.server");
    const { METHODOLOGY_INSTRUCTIONS } = await import("@/lib/ai/prompts");
    const feedback = data.feedback?.trim();
    const prompt = [
      `METODOLOGIA: ${methodology.title}`,
      corpus,
      `ENTREVISTA DE MÉTODO:\n${transcript}`,
      methodology.content && feedback
        ? `SPEC ANTERIOR:\n${methodology.content}\n\nAJUSTE PEDIDO PELO PESQUISADOR: ${feedback}\n\nReescreva a spec aplicando o ajuste, mantendo as sete seções.`
        : "Escreva a spec de metodologia.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const content = await generateFinalText(prompt, METHODOLOGY_INSTRUCTIONS);
    await repo.updateMethodology(context.user.id, data.methodologyId, {
      content,
      status: METHODOLOGY_STATUS.draft,
    });
    return { ok: true, content };
  });

export const saveMethodologySpec = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string; content: string; title?: string }) => d)
  .handler(async ({ data, context }) => {
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");
    // Editar uma spec aprovada a devolve para rascunho: o artigo acoplado não
    // pode continuar consumindo um texto que já não é o aprovado.
    const status =
      methodology.status === METHODOLOGY_STATUS.approved
        ? METHODOLOGY_STATUS.draft
        : methodology.status;
    const title = data.title?.trim().slice(0, 200);
    await repo.updateMethodology(context.user.id, data.methodologyId, {
      content: data.content,
      status,
      ...(title ? { title } : {}),
    });
    return { ok: true, status };
  });

export const approveMethodologySpec = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string }) => d)
  .handler(async ({ data, context }) => {
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");
    if (!methodology.content?.trim()) throw new Error("Gere ou escreva a spec antes de aprovar");
    if (methodology.status !== METHODOLOGY_STATUS.draft) {
      throw new Error("Só uma metodologia em rascunho pode ser aprovada");
    }
    await repo.setMethodologyStatus(
      context.user.id,
      data.methodologyId,
      METHODOLOGY_STATUS.approved,
    );
    return { ok: true };
  });

/**
 * Acopla (ou desacopla, com `methodologyId: null`) uma metodologia a um artigo.
 * Valida posse do artigo, posse da metodologia e status aprovado.
 */
export const linkMethodologyToArticle = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string; methodologyId: string | null }) => d)
  .handler(async ({ data, context }) => {
    const article = await repo.getArticle(context.user.id, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");
    if (data.methodologyId === null) {
      await repo.setArticleMethodology(context.user.id, data.articleId, null);
      return { ok: true };
    }
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    const error = methodologyLinkError(methodology, context.user.id);
    if (error) throw new Error(error);
    await repo.setArticleMethodology(context.user.id, data.articleId, data.methodologyId);
    return { ok: true };
  });

/**
 * Cria a metodologia já a partir de um artigo existente: a seção de Metodologia
 * do artigo vira a primeira observação da entrevista. Serve para quem escreveu
 * o método à mão e agora quer a entidade separada, sem reescrever nada.
 */
export const createMethodologyFromArticle = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");

    const pages = await repo.listPages(userId, data.articleId);
    const section = pages
      .map((page) => methodologySectionText(page.content ?? ""))
      .find((text): text is string => Boolean(text));
    if (!section) throw new Error("Este artigo ainda não tem uma seção Metodologia escrita");

    const methodology = await repo.createMethodology(userId, article.title.trim().slice(0, 120));
    await repo.addMethodologyMessage(userId, methodology.id, "user", [
      {
        type: "text",
        text: `Seção Metodologia que eu já escrevi no artigo "${article.title}" — é minha redação original, use como base:\n\n${section}`,
      },
    ]);
    return { id: methodology.id };
  });

/**
 * Traz para a entrevista de método a seção de Metodologia que o pesquisador já
 * escreveu em um artigo. É a redação original dele: a spec passa a ser reescrita
 * a partir dela, em vez de nascer do zero.
 */
export const importMethodologyFromArticle = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string; articleId: string }) => d)
  .handler(async ({ data, context }) => {
    const userId = context.user.id;
    const methodology = await repo.getMethodology(userId, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");
    const article = await repo.getArticle(userId, data.articleId);
    if (!article) throw new Error("Artigo não encontrado");

    const pages = await repo.listPages(userId, data.articleId);
    const section = pages
      .map((page) => methodologySectionText(page.content ?? ""))
      .find((text): text is string => Boolean(text));
    if (!section) throw new Error("Este artigo ainda não tem uma seção Metodologia escrita");

    await repo.addMethodologyMessage(userId, data.methodologyId, "user", [
      {
        type: "text",
        text: `Seção Metodologia que eu já escrevi no artigo "${article.title}" — importada como minha redação original, para a spec não inventar outro método:\n\n${section}`,
      },
    ]);
    return { ok: true, chars: section.length, title: article.title };
  });

export const uploadMethodologyDocument = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    (d: { methodologyId: string; filename: string; mime: string; base64: string; note?: string }) =>
      d,
  )
  .handler(async ({ data, context }) => {
    const { extractText } = await import("@/lib/documents.server");
    const { putDocumentBytes, documentKey, toBase64 } = await import("@/lib/cf/storage.server");
    const { newId } = await import("@/lib/cf/auth.server");
    const methodology = await repo.getMethodology(context.user.id, data.methodologyId);
    if (!methodology) throw new Error("Metodologia não encontrada");
    const bytes = base64ToBytes(data.base64);
    const MAX = 8 * 1024 * 1024;
    if (bytes.length === 0) throw new Error("Arquivo vazio");
    if (bytes.length > MAX) throw new Error("Arquivo maior que 8 MB");
    const mime = data.mime || "application/octet-stream";
    // Só a camada de texto: OCR de imagem/PDF digitalizado continua exclusivo do
    // dossiê do artigo. Anexo sem texto é aceito (o corpus vale pelo documento).
    const textContent = await extractText(data.filename, data.mime, data.base64);
    const id = newId();
    const storageKey = await putDocumentBytes(
      documentKey(`methodology/${data.methodologyId}`, id),
      bytes,
      mime,
    );
    const doc = await repo.addMethodologyDocument(context.user.id, data.methodologyId, {
      id,
      filename: data.filename.slice(0, 200),
      mime,
      size: bytes.length,
      content: storageKey ? null : toBase64(bytes),
      storageKey,
      textContent,
      note: data.note?.slice(0, 500) ?? null,
    });
    return {
      id: doc.id,
      seq: doc.seq,
      filename: doc.filename,
      mime: doc.mime,
      size: doc.size,
      note: doc.note,
      hasText: Boolean(textContent),
      created_at: doc.created_at,
    } as MethodologyDocumentView;
  });

export const deleteMethodologyDocument = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((d: { methodologyId: string; documentId: string }) => d)
  .handler(async ({ data, context }) => {
    const { deleteDocumentBytes } = await import("@/lib/cf/storage.server");
    const doc = await repo.getMethodologyDocument(
      context.user.id,
      data.methodologyId,
      data.documentId,
    );
    if (doc?.storage_key) await deleteDocumentBytes(doc.storage_key);
    await repo.deleteMethodologyDocument(context.user.id, data.methodologyId, data.documentId);
    return { ok: true };
  });
