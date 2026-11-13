-- Documentos primários (dossiê) anexados pelo pesquisador. O arquivo é guardado
-- em base64 no próprio D1 (R2 ainda não habilitado na conta); `seq` é a numeração
-- estável por artigo ("Anexo 1", "Anexo 2", ...) usada pela IA para citar/posicionar.

create table if not exists documents (
  id          text primary key,
  article_id  text not null references articles(id) on delete cascade,
  user_id     text not null references users(id) on delete cascade,
  seq         integer not null,
  filename    text not null,
  mime        text not null,
  size        integer not null,
  content     text not null,           -- bytes em base64
  text_content text,                   -- texto extraído (quando aplicável)
  note        text,                    -- observação do pesquisador
  created_at  text not null default (datetime('now')),
  unique (article_id, seq)
);
create index if not exists documents_article_idx on documents(article_id, seq);
