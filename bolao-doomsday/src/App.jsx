import { useEffect, useMemo, useState } from 'react'
import { CAST } from './cast.js'
import { supabase, configured } from './supabase.js'

const photo = (id) => `${import.meta.env.BASE_URL}cast/${id}.jpg`
const logo = `${import.meta.env.BASE_URL}logo.jpg`

function Login() {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [mode, setMode] = useState('in')
  const [msg, setMsg] = useState('')
  async function submit(e) {
    e.preventDefault()
    setMsg('')
    const fn = mode === 'in' ? 'signInWithPassword' : 'signUp'
    const { error } = await supabase.auth[fn]({ email, password: pass })
    if (error) setMsg(error.message)
    else if (mode === 'up') setMsg('Conta criada. Se pedir, confirme no e-mail e entre.')
  }
  return (
    <form className="card login" onSubmit={submit}>
      <img src={logo} alt="Terra 616" className="logo" />
      <h1>Bolão Doomsday</h1>
      <p>Quem vive, quem morre?</p>
      <input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="senha (mín. 6)" minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} required />
      <button className="primary">{mode === 'in' ? 'Entrar' : 'Criar conta'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'Não tenho conta' : 'Já tenho conta'}
      </button>
      {msg && <p className="msg">{msg}</p>}
    </form>
  )
}

function Bets({ session, config }) {
  const uid = session.user.id
  const [picks, setPicks] = useState({})
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState('')
  const locked = config && new Date() >= new Date(config.deadline)

  useEffect(() => {
    supabase.from('bets').select('character_id,outcome').eq('user_id', uid).then(({ data }) => {
      const p = {}
      ;(data ?? []).forEach((b) => (p[b.character_id] = b.outcome))
      setPicks(p)
      setSaved(Object.keys(p).length > 0)
    })
  }, [uid])

  const done = Object.keys(picks).length
  const set = (id, v) => !locked && setPicks((p) => ({ ...p, [id]: p[id] === v ? undefined : v }))

  async function save() {
    setStatus('Salvando...')
    const rows = Object.entries(picks).filter(([, v]) => v).map(([character_id, outcome]) => ({ user_id: uid, character_id, outcome }))
    const del = await supabase.from('bets').delete().eq('user_id', uid)
    if (del.error) return setStatus(del.error.message)
    const ins = await supabase.from('bets').insert(rows)
    if (ins.error) return setStatus(ins.error.message)
    setSaved(true)
    const mail = await supabase.functions.invoke('send-bet-email')
    setStatus(mail.error ? 'Aposta salva. (E-mail não enviado: ' + mail.error.message + ')' : 'Aposta salva e cópia enviada para seu e-mail.')
  }

  return (
    <>
      <p className="hint">
        {locked ? 'Apostas encerradas.' : `Escolha quantos quiser. Prazo: ${new Date(config.deadline).toLocaleString('pt-BR')}.`} Personagens sem destino confirmado não contam.
      </p>
      <div className="grid">
        {CAST.map((c) => (
          <div key={c.id} className={`char ${picks[c.id] ?? ''}`}>
            <img src={photo(c.id)} alt={c.name} loading="lazy" />
            <div className="info"><b>{c.name}</b><small>{c.actor}</small></div>
            <div className="btns">
              <button disabled={locked} className={picks[c.id] === 'vive' ? 'on live' : ''} onClick={() => set(c.id, 'vive')}>❤ Vive</button>
              <button disabled={locked} className={picks[c.id] === 'morre' ? 'on die' : ''} onClick={() => set(c.id, 'morre')}>☠ Morre</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bar">
        <span>{done}/{CAST.length} apostas {saved && '· salvo'}</span>
        <span className="msg">{status}</span>
        {!locked && <button className="primary" onClick={save} disabled={!done}>Salvar aposta</button>}
      </div>
    </>
  )
}

function Ranking({ config }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    (async () => {
      const [b, r] = await Promise.all([
        supabase.from('bets').select('user_id,character_id,outcome'),
        supabase.from('results').select('character_id,outcome'),
      ])
      const res = Object.fromEntries((r.data ?? []).map((x) => [x.character_id, x.outcome]))
      const by = {}
      ;(b.data ?? []).forEach((x) => {
        const u = (by[x.user_id] ??= { hit: 0, valid: 0 })
        if (res[x.character_id]) { u.valid++; if (res[x.character_id] === x.outcome) u.hit++ }
      })
      const names = await supabase.from('profiles').select('id,name')
      const nm = Object.fromEntries((names.data ?? []).map((p) => [p.id, p.name]))
      setRows(Object.entries(by).map(([id, u]) => ({ name: nm[id] ?? 'anônimo', ...u, pct: u.valid ? (u.hit / u.valid) * 100 : 0 })).sort((a, b) => b.pct - a.pct))
    })()
  }, [])
  const open = config && new Date() >= new Date(config.deadline)
  if (!open) return <p className="hint">O ranking aparece depois do fim das apostas.</p>
  if (!rows) return <p className="hint">Carregando...</p>
  return (
    <table className="rank">
      <thead><tr><th>#</th><th>Jogador</th><th>Acertos</th><th>%</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.name}</td><td>{r.hit}/{r.valid}</td><td>{r.pct.toFixed(0)}%</td></tr>)}</tbody>
    </table>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [config, setConfig] = useState(null)
  const [tab, setTab] = useState('bets')
  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session) supabase.from('config').select('deadline').single().then(({ data }) => setConfig(data))
  }, [session])

  if (!configured) return <div className="card login"><h1>Configure o Supabase</h1><p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p></div>
  if (session === undefined) return null
  if (!session) return <Login />
  return (
    <div className="app">
      <header>
        <img src={logo} alt="" />
        <nav>
          <button className={tab === 'bets' ? 'on' : ''} onClick={() => setTab('bets')}>Minha aposta</button>
          <button className={tab === 'rank' ? 'on' : ''} onClick={() => setTab('rank')}>Ranking</button>
        </nav>
        <button className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>
      {tab === 'bets' ? <Bets session={session} config={config} /> : <Ranking config={config} />}
    </div>
  )
}
