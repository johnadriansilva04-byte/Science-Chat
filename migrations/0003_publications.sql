-- Área pública de artigos publicados ("Publicações").
--
-- Regra do produto: o autor só aparece aqui depois de submeter o artigo à
-- revisão e receber o parecer favorável. `status` controla o portão:
--   draft -> submitted -> in_review -> accepted -> published
-- Só registros com status = 'published' aparecem na listagem pública.

create table if not exists publications (
  id            text primary key,
  user_id       text not null references users(id) on delete cascade,
  article_id    text references articles(id) on delete set null,
  slug          text not null unique,
  title         text not null,
  abstract      text,
  keywords      text,
  language      text not null default 'pt',
  area          text,
  author_name   text not null,
  affiliation   text,
  orcid         text,
  content       text not null,
  status        text not null default 'draft',
  review_report text,
  review_notes  text,
  doi           text,
  submitted_at  text,
  reviewed_at   text,
  published_at  text,
  created_at    text not null default (datetime('now')),
  updated_at    text not null default (datetime('now'))
);

create index if not exists publications_status_idx on publications(status, published_at desc);
create index if not exists publications_user_idx on publications(user_id, updated_at desc);
