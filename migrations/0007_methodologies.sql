-- Metodologia como ENTIDADE PRÓPRIA, separada do artigo.
--
-- A metodologia nasce antes ou depois do artigo, tem chat e spec próprios e só
-- depois pode ser acoplada a um artigo (ou desacoplada). Por isso `articles`
-- ganha apenas uma referência opcional — nunca uma cópia do texto.
--
-- 1) `methodologies` guarda a spec (Markdown) e o status editorial: o artigo só
--    pode usar uma metodologia `approved`; a aprovação é um ato do pesquisador.
-- 2) `methodology_messages` é o chat de entrevista de método (mesmo formato de
--    `chat_messages`: `parts` em JSON).
-- 3) `methodology_documents` é o corpus/fontes da metodologia. Espelha
--    `documents`, mas o dono é a metodologia (o `documents` exige `article_id`),
--    então o pesquisador pode anexar fontes antes de existir artigo.

create table if not exists methodologies (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  title      text not null,
  content    text,
  status     text not null default 'draft',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists methodologies_user_idx on methodologies(user_id, updated_at);

create table if not exists methodology_messages (
  id             text primary key,
  methodology_id text not null references methodologies(id) on delete cascade,
  user_id        text not null references users(id) on delete cascade,
  role           text not null,
  parts          text not null,
  created_at     text not null default (datetime('now'))
);
create index if not exists methodology_messages_methodology_idx
  on methodology_messages(methodology_id, created_at);

create table if not exists methodology_documents (
  id             text primary key,
  methodology_id text not null references methodologies(id) on delete cascade,
  user_id        text not null references users(id) on delete cascade,
  seq            integer not null,
  filename       text not null,
  mime           text not null,
  size           integer not null,
  content        text,                     -- bytes em base64 (fallback D1)
  storage_key    text,                     -- chave no R2 quando disponível
  text_content   text,                     -- texto extraído (quando aplicável)
  note           text,
  created_at     text not null default (datetime('now')),
  unique (methodology_id, seq)
);
create index if not exists methodology_documents_methodology_idx
  on methodology_documents(methodology_id, seq);

-- Vínculo opcional e reversível: apagar a metodologia apenas desacopla o artigo.
alter table articles add column methodology_id text references methodologies(id) on delete set null;
create index if not exists articles_methodology_idx on articles(methodology_id);
