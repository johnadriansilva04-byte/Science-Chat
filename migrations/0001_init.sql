-- ScienceChat — schema D1 (Cloudflare, SQLite).
-- Diferente do Postgres: sem RLS. A posse (user_id) é verificada no código do Worker.

create table if not exists users (
  id            text primary key,
  email         text not null unique,
  password_hash text not null,
  password_salt text not null,
  display_name  text,
  created_at    text not null default (datetime('now'))
);

create table if not exists sessions (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  expires_at text not null,
  created_at text not null default (datetime('now'))
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists articles (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  title      text not null default 'Novo artigo',
  phase      text not null default 'interview',
  plan       text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);
create index if not exists articles_user_idx on articles(user_id, updated_at);

create table if not exists chat_messages (
  id         text primary key,
  article_id text not null references articles(id) on delete cascade,
  user_id    text not null references users(id) on delete cascade,
  role       text not null,
  parts      text not null,
  created_at text not null default (datetime('now'))
);
create index if not exists chat_messages_article_idx on chat_messages(article_id, created_at);

create table if not exists article_pages (
  id          text primary key,
  article_id  text not null references articles(id) on delete cascade,
  user_id     text not null references users(id) on delete cascade,
  page_number integer not null,
  content     text not null,
  status      text not null default 'draft',
  created_at  text not null default (datetime('now')),
  unique (article_id, page_number)
);
create index if not exists article_pages_article_idx on article_pages(article_id, page_number);
