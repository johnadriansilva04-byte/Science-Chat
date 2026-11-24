-- Chat da sala e entrada no meio da partida (espectador até a próxima rodada).
alter table stop_room_players add column joined_round integer not null default 0;

create table if not exists stop_room_messages (
  id         text primary key,
  room_id    text not null references stop_rooms(id) on delete cascade,
  user_id    text not null references users(id) on delete cascade,
  name       text not null,
  body       text not null,
  created_at text not null default (datetime('now'))
);

create index if not exists idx_stop_room_messages_room on stop_room_messages(room_id, created_at);
