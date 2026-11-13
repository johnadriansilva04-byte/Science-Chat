// Gera o SQL de seed da primeira publicação da área pública ("Publicações").
//
// Lê o artigo em docs/publicacoes/sciencechat-artigo.md, extrai resumo e
// palavras-chave e produz um INSERT idempotente na tabela `publications`.
// Uso: node scripts/seed-publication.mjs > /tmp/seed.sql
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(here, "..", "docs", "publicacoes", "sciencechat-artigo.md"), "utf8");

// Reaproveita a mesma lógica da aplicação (src/lib/publication.ts).
const HEADING = /^(#{1,6})\s+(.+)$/gm;
function extractAbstract(text) {
  const headings = [...text.matchAll(HEADING)];
  for (let i = 0; i < headings.length; i++) {
    if (/^(resumo|abstract|resumen)\b/i.test(headings[i][2].trim())) {
      const start = headings[i].index + headings[i][0].length;
      const end = headings[i + 1]?.index ?? text.length;
      const body = text
        .slice(start, end)
        .replace(/\n\s*(?:\*\*)?\s*(?:palavras[- ]chave|keywords?|palabras clave)\b[\s\S]*$/i, "")
        .trim();
      if (body) return body.slice(0, 2000);
    }
  }
  return null;
}
function extractKeywords(text) {
  const m = text.match(
    /(?:\*\*)?\s*(?:palavras[- ]chave|keywords?|palabras clave)\s*(?:\*\*)?\s*[:\-]\s*(?:\*\*)?\s*(.+)/i,
  );
  return m
    ? m[1]
        .replace(/\*\*\s*$/, "")
        .trim()
        .replace(/\s*[.;]$/, "")
        .slice(0, 300)
    : null;
}

const q = (s) => (s === null || s === undefined ? "NULL" : `'${String(s).replace(/'/g, "''")}'`);

const id = "pub-sciencechat-0001";
const slug = "sciencechat-producao-cientifica-independente";
const title =
  "ScienceChat: uma plataforma de produção científica independente, documentada e auditável com inteligência artificial";
const author = "John Adrian";
const affiliation = "Pesquisador independente";
const area = "Ciência da Computação · Metodologia Científica";
const abstract = extractAbstract(md);
const keywords = extractKeywords(md);

const sql = `insert or replace into publications
  (id, user_id, article_id, slug, title, abstract, keywords, language, area,
   author_name, affiliation, orcid, content, status, review_report, review_notes, doi,
   submitted_at, reviewed_at, published_at, created_at, updated_at)
values (
  ${q(id)},
  (select id from users order by created_at limit 1),
  NULL,
  ${q(slug)},
  ${q(title)},
  ${q(abstract)},
  ${q(keywords)},
  'pt',
  ${q(area)},
  ${q(author)},
  ${q(affiliation)},
  NULL,
  ${q(md)},
  'published',
  ${q("Parecer favorável: artigo publicável, com ressalva registrada quanto à verificação das referências junto às bases científicas antes da submissão final.")},
  NULL,
  NULL,
  datetime('now', '-2 days'),
  datetime('now', '-1 day'),
  datetime('now'),
  datetime('now', '-2 days'),
  datetime('now')
);
`;

process.stdout.write(sql);
