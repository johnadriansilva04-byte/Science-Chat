-- Idioma do artigo (pt por padrão). Usado pela IA e pelos rótulos editoriais.

alter table articles add column language text not null default 'pt';
