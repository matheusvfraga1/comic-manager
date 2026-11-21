-- Rode no SQL Editor do SEU projeto Supabase.
create table if not exists config (id int primary key default 1 check (id = 1), deadline timestamptz not null);
insert into config (deadline) values ('2026-12-17 23:59:00-03') on conflict do nothing;

create table if not exists profiles (id uuid primary key references auth.users on delete cascade, name text);
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into profiles (id, name) values (new.id, split_part(new.email, '@', 1)); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table if not exists bets (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  character_id text not null,
  outcome text not null check (outcome in ('vive','morre')),
  created_at timestamptz default now(),
  primary key (user_id, character_id)
);
-- gabarito: preencha pelo painel (Table Editor) depois do filme
create table if not exists results (character_id text primary key, outcome text not null check (outcome in ('vive','morre')));

alter table config enable row level security;
alter table profiles enable row level security;
alter table bets enable row level security;
alter table results enable row level security;

create policy "config le" on config for select to authenticated using (true);
create policy "profiles le" on profiles for select to authenticated using (true);
create policy "results le" on results for select to authenticated using (true);
-- cada um vê as próprias apostas; todas só depois do prazo
create policy "bets le" on bets for select to authenticated
  using (user_id = auth.uid() or now() >= (select deadline from config));
create policy "bets insere" on bets for insert to authenticated
  with check (user_id = auth.uid() and now() < (select deadline from config));
create policy "bets apaga" on bets for delete to authenticated
  using (user_id = auth.uid() and now() < (select deadline from config));
