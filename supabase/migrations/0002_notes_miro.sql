-- Texto livre das fichas (fichas em formato corrido) e link do quadro do Miro na Lore
alter table public.characters add column notes text;
alter table public.locations add column notes text;
alter table public.projects add column miro_url text;
