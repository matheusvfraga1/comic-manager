-- Personagens editáveis pelo admin (rode no SQL Editor do Supabase)
create table if not exists characters (
  id text primary key,
  name text not null,
  actor text not null default '',
  sort int not null default 0,
  created_at timestamptz default now()
);
alter table characters enable row level security;
drop policy if exists "characters le" on characters;
drop policy if exists "characters admin" on characters;
create policy "characters le" on characters for select to authenticated using (true);
create policy "characters admin" on characters for all to authenticated using (is_admin()) with check (is_admin());

insert into characters (id, name, actor, sort) values
  ('doom', 'Doctor Doom', 'Robert Downey Jr.', 10),
  ('thor', 'Thor', 'Chris Hemsworth', 20),
  ('hulk', 'Hulk', 'Mark Ruffalo', 30),
  ('loki', 'Loki', 'Tom Hiddleston', 40),
  ('steve', 'Steve Rogers', 'Chris Evans', 50),
  ('peggy', 'Peggy Carter', 'Hayley Atwell', 60),
  ('mobius', 'Mobius', 'Owen Wilson', 70),
  ('ob', 'O.B.', 'Ke Huy Quan', 80),
  ('casey', 'Casey', 'Eugene Cordero', 90),
  ('missminutes', 'Miss Minutes', 'Tara Strong (voz)', 100),
  ('sam', 'Capitão América (Sam Wilson)', 'Anthony Mackie', 110),
  ('bucky', 'Soldado Invernal (Bucky)', 'Sebastian Stan', 120),
  ('falcon', 'Falcão (Joaquin Torres)', 'Danny Ramirez', 130),
  ('walker', 'Agente Americano', 'Wyatt Russell', 140),
  ('antman', 'Homem-Formiga', 'Paul Rudd', 150),
  ('cassie', 'Cassie Lang', 'Kathryn Newton', 160),
  ('shuri', 'Shuri / Pantera Negra', 'Letitia Wright', 170),
  ('mbaku', 'M''Baku', 'Winston Duke', 180),
  ('namor', 'Namor', 'Tenoch Huerta', 190),
  ('namora', 'Namora', 'Mabel Cadena', 200),
  ('wanda', 'Feiticeira Escarlate', 'Elizabeth Olsen', 210),
  ('shangchi', 'Shang-Chi', 'Simu Liu', 220),
  ('yelena', 'Yelena Belova', 'Florence Pugh', 230),
  ('redguardian', 'Guardião Vermelho', 'David Harbour', 240),
  ('ghost', 'Fantasma', 'Hannah John-Kamen', 250),
  ('sentry', 'Sentinela (Bob Reynolds)', 'Lewis Pullman', 260),
  ('reed', 'Senhor Fantástico', 'Pedro Pascal', 270),
  ('sue', 'Mulher Invisível', 'Vanessa Kirby', 280),
  ('johnny', 'Tocha Humana', 'Joseph Quinn', 290),
  ('thing', 'Coisa', 'Ebon Moss-Bachrach', 300),
  ('xavier', 'Professor Xavier', 'Patrick Stewart', 310),
  ('magneto', 'Magneto', 'Ian McKellen', 320),
  ('beast', 'Fera', 'Kelsey Grammer', 330),
  ('cyclops', 'Ciclope', 'James Marsden', 340),
  ('nightcrawler', 'Noturno', 'Alan Cumming', 350),
  ('mystique', 'Mística', 'Rebecca Romijn', 360),
  ('gambit', 'Gambit', 'Channing Tatum', 370)
on conflict (id) do nothing;
