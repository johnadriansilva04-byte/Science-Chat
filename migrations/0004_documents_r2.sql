-- Documentos primários (dossiê). O arquivo bruto vai para o R2 quando o binding
-- `FILES` está disponível (`storage_key` guarda a chave no bucket). Enquanto o R2
-- não estiver habilitado na conta, `content` mantém os bytes em base64 no D1
-- (fallback). Por isso `content` passa a ser opcional.
--
-- SQLite não permite remover NOT NULL com ALTER, então reconstruímos a tabela.

create table documents_new (
  id           text primary key,
  article_id   text not null references articles(id) on delete cascade,
  user_id      text not null references users(id) on delete cascade,
  seq          integer not null,
  filename     text not null,
  mime         text not null,
  size         integer not null,
  content      text,                    -- bytes em base64 (só no fallback D1)
  storage_key  text,                    -- chave no R2 quando o arquivo está lá
  text_content text,                    -- texto extraído (quando aplicável)
  note         text,                    -- observação do pesquisador
  created_at   text not null default (datetime('now')),
  unique (article_id, seq)
);

insert into documents_new (id, article_id, user_id, seq, filename, mime, size, content, storage_key, text_content, note, created_at)
  select id, article_id, user_id, seq, filename, mime, size, content, null, text_content, note, created_at from documents;

drop table documents;
alter table documents_new rename to documents;
create index if not exists documents_article_idx on documents(article_id, seq);
