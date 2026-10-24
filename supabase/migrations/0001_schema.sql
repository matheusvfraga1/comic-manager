-- Comic Manager: esquema inicial
-- Cada usuário só enxerga os próprios projetos (RLS por owner).

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  production_name text,
  author text,
  pages int,
  synopsis text,
  logline text,
  genres text[] not null default '{}',
  age_rating text not null default 'Livre',
  content_tags text[] not null default '{}',
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fichas: personagens e cenários compartilham o formato
-- sheet = [{ "section": "Aparência física", "items": [{ "label": "Altura", "value": "1,80m" }] }]
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  name text not null,
  role text,
  summary text,
  image_path text,
  sheet jsonb not null default '[]',
  archived boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  name text not null,
  kind text,
  summary text,
  image_path text,
  sheet jsonb not null default '[]',
  archived boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Textos longos em Markdown: roteiro, escaleto, lore, beat sheet, anotações...
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  kind text not null check (kind in ('roteiro','escaleto','lore','beat_sheet','sinopse','modelo','anotacao','planilha')),
  title text not null,
  content text not null default '',
  source text,
  archived boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Arquivos no Storage: páginas (por estágio), artes conceituais, referências, anexos
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  kind text not null check (kind in ('page','concept','reference','attachment')),
  title text not null,
  caption text,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  page_number int,
  stage text check (stage in ('storyboard','lapis','arte_final','cinzas','cor','letreiramento')),
  character_id uuid references public.characters on delete set null,
  location_id uuid references public.locations on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets on delete cascade,
  author uuid not null default auth.uid() references auth.users on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index on public.characters (project_id);
create index on public.locations (project_id);
create index on public.documents (project_id);
create index on public.assets (project_id);
create index on public.comments (asset_id);

-- updated_at automático
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger touch before update on public.characters for each row execute function public.touch_updated_at();
create trigger touch before update on public.locations for each row execute function public.touch_updated_at();
create trigger touch before update on public.documents for each row execute function public.touch_updated_at();

-- RLS
create function public.owns_project(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = pid and owner = auth.uid())
$$;

alter table public.projects enable row level security;
alter table public.characters enable row level security;
alter table public.locations enable row level security;
alter table public.documents enable row level security;
alter table public.assets enable row level security;
alter table public.comments enable row level security;

create policy "dono" on public.projects for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy "dono" on public.characters for all to authenticated
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "dono" on public.locations for all to authenticated
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "dono" on public.documents for all to authenticated
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "dono" on public.assets for all to authenticated
  using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "dono" on public.comments for all to authenticated
  using (exists (select 1 from public.assets a where a.id = asset_id and public.owns_project(a.project_id)))
  with check (author = auth.uid());

-- Storage: bucket privado; caminho = <user_id>/<project_id>/<arquivo>
insert into storage.buckets (id, name, public) values ('comic', 'comic', false);

create policy "comic dono le" on storage.objects for select to authenticated
  using (bucket_id = 'comic' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "comic dono grava" on storage.objects for insert to authenticated
  with check (bucket_id = 'comic' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "comic dono altera" on storage.objects for update to authenticated
  using (bucket_id = 'comic' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "comic dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'comic' and (storage.foldername(name))[1] = auth.uid()::text);
