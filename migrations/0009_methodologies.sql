-- Metodologias do pesquisador aplicáveis à produção do artigo.
--
-- Uma metodologia é DADO, não código: o pesquisador define o nome, a fórmula
-- (por exemplo "A + B¹/B₂ = D"), a legenda de cada símbolo e as instruções de
-- estrutura. O texto da fórmula nunca fica preso a um modelo fixo — a IA recebe
-- a fórmula + a legenda como contexto e obedece.
--
-- `article_id` registra o artigo em que a metodologia foi criada (nullable:
-- uma metodologia pode nascer antes do artigo ou ser reutilizada em vários).
-- A aplicação ATIVA fica em `articles.methodology_id`, para que a mesma
-- metodologia possa servir a mais de um artigo sem ser movida de lugar.

create table if not exists methodologies (
  id             text primary key,
  user_id        text not null references users(id) on delete cascade,
  article_id     text references articles(id) on delete set null,
  name           text not null,
  description    text,
  formula        text not null,
  legend         text,                          -- JSON: [{ "symbol": "A", "meaning": "..." }]
  structure_hint text,                          -- como as seções devem ser organizadas
  created_at     text not null default (datetime('now')),
  updated_at     text not null default (datetime('now'))
);
create index if not exists methodologies_user_idx on methodologies(user_id, updated_at desc);

-- Metodologia ativa do artigo (aplicada pelo botão "Aplicar metodologia").
-- on delete set null: apagar a metodologia não apaga o artigo.
alter table articles add column methodology_id text references methodologies(id) on delete set null;
