// Envia ao usuário logado uma cópia das apostas. Secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user?.email) return new Response('unauthorized', { status: 401, headers: cors })
  const { data: bets } = await supa.from('bets').select('character_id,outcome').order('character_id')
  const lines = (bets ?? []).map((b) => `${b.outcome === 'vive' ? '❤ Vive ' : '☠ Morre'}  ${b.character_id}`).join('\n')
  const t = nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST'), port: Number(Deno.env.get('SMTP_PORT') ?? 587),
    auth: { user: Deno.env.get('SMTP_USER'), pass: Deno.env.get('SMTP_PASS') },
  })
  await t.sendMail({
    from: Deno.env.get('SMTP_FROM') ?? Deno.env.get('SMTP_USER'), to: user.email,
    subject: 'Sua aposta - Bolão Doomsday (Terra 616)',
    text: `Sua aposta registrada:\n\n${lines}\n\nBoa sorte!`,
  })
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
})
