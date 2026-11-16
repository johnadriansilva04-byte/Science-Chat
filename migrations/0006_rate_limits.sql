-- Limite de requisições (fallback em D1 quando o binding KV não existe).
-- A coluna `key` é o escopo (ex.: "chat:<userId>"); `window_id` identifica a
-- janela alinhada atual, para a contagem reiniciar sozinha a cada janela.

create table if not exists rate_limits (
  key       text primary key,
  count     integer not null default 0,
  window_id integer not null
);
