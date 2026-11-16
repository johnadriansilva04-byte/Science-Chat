-- Revisão por pares COMPROVADA pelo autor (não é o sistema que revisa).
--
-- A plataforma não faz revisão por pares: quem revisa são as revistas e as
-- universidades onde o pesquisador publica. O autor sobe o comprovante (carta
-- de aceite, DOI ou registro) e o artigo passa a aparecer na seção "Revisados
-- por pares" do mural. Sem comprovante, o artigo continua no mural, mas na
-- seção "Ainda não revisados".
--
-- `review_status`: 'nao_revisado' (padrão) | 'revisado'.
-- O identificador (DOI ou registro do aceite) fica na coluna `doi`, já usada
-- na citação; `review_proof_key` guarda o comprovante no R2.

alter table publications add column review_status text not null default 'nao_revisado';
alter table publications add column review_proof_key text;
alter table publications add column review_proof_filename text;
alter table publications add column review_proof_mime text;
alter table publications add column review_claimed_at text;

create index if not exists publications_review_idx on publications(review_status, published_at desc);
