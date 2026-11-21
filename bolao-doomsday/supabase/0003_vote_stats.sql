-- Totais de votos por personagem, sem expor apostas individuais
create or replace function vote_stats() returns table (character_id text, vive int, morre int)
language sql stable security definer set search_path = public as $$
  select character_id, count(*) filter (where outcome = 'vive')::int, count(*) filter (where outcome = 'morre')::int
  from bets group by character_id
$$;
revoke all on function vote_stats() from public, anon;
grant execute on function vote_stats() to authenticated;
