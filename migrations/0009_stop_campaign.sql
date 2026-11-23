-- Campanha do Stop científico: uma linha por fase jogada.
-- `stars` guarda o melhor resultado (0–3) e `best_score` a maior pontuação.
-- A fase seguinte só abre com pelo menos uma estrela na anterior, então o
-- progresso precisa sobreviver à sessão: fica no D1, por usuário.

create table if not exists stop_progress (
  user_id    text not null references users(id) on delete cascade,
  level_id   text not null,
  stars      integer not null default 0,
  best_score integer not null default 0,
  attempts   integer not null default 0,
  updated_at text not null default (datetime('now')),
  primary key (user_id, level_id)
);

create index if not exists idx_stop_progress_user on stop_progress(user_id);
