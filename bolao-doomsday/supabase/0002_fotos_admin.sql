-- Fotos customizadas (só admin envia)
create table if not exists admins (user_id uuid primary key references auth.users on delete cascade);
create table if not exists photos (character_id text primary key, path text not null, updated_at timestamptz default now());
alter table admins enable row level security;
alter table photos enable row level security;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from admins where user_id = auth.uid()) $$;
create policy "admins le proprio" on admins for select to authenticated using (user_id = auth.uid());
create policy "photos le" on photos for select to authenticated using (true);
create policy "photos admin" on photos for all to authenticated using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public) values ('cast', 'cast', true) on conflict (id) do nothing;
create policy "cast admin insere" on storage.objects for insert to authenticated with check (bucket_id = 'cast' and is_admin());
create policy "cast admin altera" on storage.objects for update to authenticated using (bucket_id = 'cast' and is_admin());
create policy "cast admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'cast' and is_admin());
