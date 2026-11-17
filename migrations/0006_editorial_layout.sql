-- Identificação do trabalho (capa/folha de rosto ABNT) na configuração editorial.
-- Guarda um JSON com autor, instituição, cidade, ano e a nota de natureza, usado
-- pelos elementos pré-textuais na montagem e na exportação.

alter table editorial_configs add column layout_json text;
