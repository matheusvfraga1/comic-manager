-- Nome de cada participante (aparece no ranking). Rode no SQL Editor do Supabase.
drop policy if exists "profiles edita proprio" on profiles;
create policy "profiles edita proprio" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles cria proprio" on profiles;
create policy "profiles cria proprio" on profiles for insert to authenticated
  with check (id = auth.uid());

-- novos cadastros já entram com o nome digitado
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)));
  return new;
end $$;
