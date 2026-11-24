-- Regras de verdade: letra sorteada, partida de 10 rodadas, 10 pontos (5 se repetir).
alter table stop_rooms add column total_rounds integer not null default 10;
alter table stop_rooms add column letters_used text;
alter table stop_rooms add column settled_round integer not null default 0;
