-- Matriz de rastreabilidade, auditoria científica e configuração editorial.
--
-- 1) `claims` guarda cada afirmação relevante do pesquisador (extraída das
--    respostas da entrevista) com sua categoria científica e o estado da
--    verificação. O estado NUNCA é "falso" só porque falta documento: a
--    ausência de prova é registrada como "não localizada".
-- 2) `claim_evidence` liga uma afirmação a um documento do dossiê (Anexo N) com
--    o trecho/página e o grau de correspondência.
-- 3) `audits` guarda os relatórios de auditoria (página, artigo ou afirmação).
-- 4) `editorial_configs` guarda o destino editorial e as normas escolhidas por
--    artigo (Udelar como referência inicial, outras publicações ou independente).

create table if not exists claims (
  id             text primary key,
  article_id     text not null references articles(id) on delete cascade,
  user_id        text not null references users(id) on delete cascade,
  seq            integer not null,              -- numeração estável (Afirmação 1, 2, ...)
  text           text not null,                 -- texto da afirmação
  category       text not null default 'declaracao', -- categoria científica
  source_question text,                          -- pergunta da entrevista que a originou
  source_answer  text,                           -- resposta do pesquisador
  state          text not null default 'declarada',  -- estado da verificação
  limitations    text,                           -- limitações encontradas
  created_at     text not null default (datetime('now')),
  updated_at     text not null default (datetime('now')),
  unique (article_id, seq)
);
create index if not exists claims_article_idx on claims(article_id, seq);

create table if not exists claim_evidence (
  id          text primary key,
  claim_id    text not null references claims(id) on delete cascade,
  document_id text references documents(id) on delete cascade,
  location    text,                             -- página/linhas/trecho
  excerpt     text,                             -- evidência localizada
  match_degree text,                            -- direta | parcial | indireta
  state       text not null default 'nao_localizada',
  note        text,
  created_at  text not null default (datetime('now'))
);
create index if not exists claim_evidence_claim_idx on claim_evidence(claim_id);

create table if not exists audits (
  id          text primary key,
  article_id  text not null references articles(id) on delete cascade,
  user_id     text not null references users(id) on delete cascade,
  scope       text not null,                    -- claim | page | article
  scope_ref   text,                             -- id da afirmação / número da página
  report      text not null,                    -- relatório (Markdown)
  summary     text,                             -- resumo curto
  created_at  text not null default (datetime('now'))
);
create index if not exists audits_article_idx on audits(article_id, created_at desc);

create table if not exists editorial_configs (
  article_id      text primary key references articles(id) on delete cascade,
  user_id         text not null references users(id) on delete cascade,
  destination     text not null default 'independente', -- udelar | outra | independente
  unit            text,                          -- faculdade/instituto/departamento/revista
  standard        text not null default 'abnt',  -- abnt | apa | ieee | vancouver | chicago | udelar | propria
  language        text not null default 'pt',
  guidelines      text,                          -- instruções aos autores fornecidas pelo pesquisador
  notes           text,
  verified_at     text,                          -- quando as diretrizes foram conferidas
  created_at      text not null default (datetime('now')),
  updated_at      text not null default (datetime('now'))
);
