-- Stop com amigos: salas, jogadores e rodadas simultâneas.
create table if not exists stop_rooms (
  id          text primary key,
  code        text not null unique,
  host_id     text not null references users(id) on delete cascade,
  status      text not null default 'lobby',
  round       integer not null default 0,
  letter      text,
  seconds     integer not null default 90,
  categories  text,
  auto        integer not null default 1,
  deadline_at text,
  created_at  text not null default (datetime('now')),
  updated_at  text not null default (datetime('now'))
);

create index if not exists idx_stop_rooms_code on stop_rooms(code);

create table if not exists stop_room_players (
  room_id         text not null references stop_rooms(id) on delete cascade,
  user_id         text not null references users(id) on delete cascade,
  name            text not null,
  total           integer not null default 0,
  played          integer not null default 0,
  submitted_round integer,
  answers         text,
  verdicts        text,
  round_score     integer,
  joined_at       text not null default (datetime('now')),
  primary key (room_id, user_id)
);
