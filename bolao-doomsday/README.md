# Bolão Doomsday · Terra 616
React + Supabase. Login, tabela do elenco com fotos, Vive/Morre, aposta salva por conta + cópia por e-mail, ranking por % de acerto.

1. Crie um projeto Supabase **pessoal** e rode `supabase/schema.sql`.
2. `cp .env.example .env` e preencha URL + anon key.
3. E-mail: `supabase functions deploy send-bet-email` e defina secrets `SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM`.
4. `npm install && npm run dev`. Gabarito: preencher tabela `results` após o filme.
