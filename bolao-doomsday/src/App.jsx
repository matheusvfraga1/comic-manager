import { useEffect, useMemo, useState } from 'react'
import { CAST } from './cast.js'
import { supabase, configured } from './supabase.js'

const photo = (id) => `${import.meta.env.BASE_URL}cast/${id}.jpg`
const logo = `${import.meta.env.BASE_URL}logo.jpg`

function Login({ recovery }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState(recovery ? 'new' : 'in')
  const [msg, setMsg] = useState('')
  async function submit(e) {
    e.preventDefault()
    setMsg('')
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
      return setMsg(error ? error.message : 'Enviamos um link para seu e-mail. Abra-o para criar nova senha.')
    }
    if (mode === 'new') {
      const { error } = await supabase.auth.updateUser({ password: pass })
      return setMsg(error ? error.message : 'Senha alterada!')
    }
    if (mode === 'up') {
      const { data, error } = await supabase.auth.signUp({ email, password: pass })
      if (error) return setMsg(error.message)
      if (data.session) return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) setMsg(error.message === 'Email not confirmed' ? 'Confirme o e-mail (veja sua caixa de entrada) e entre.' : error.message)
  }
  const titles = { in: 'Entrar', up: 'Criar conta', forgot: 'Enviar link', new: 'Salvar nova senha' }
  return (
    <form className="card login" onSubmit={submit}>
      <img src={logo} alt="Terra 616" className="logo" />
      <h1>Bolão Doomsday</h1>
      <p>Quem vive, quem morre?</p>
      {mode !== 'new' && <input type="email" placeholder="e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />}
      {mode !== 'forgot' && (
        <div className="passwrap">
          <input type={show ? 'text' : 'password'} placeholder={mode === 'new' ? 'nova senha (mín. 6)' : 'senha (mín. 6)'} minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} required />
          <button type="button" className="eye" onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Ver'}</button>
        </div>
      )}
      <button className="primary">{titles[mode]}</button>
      {mode === 'in' && <button type="button" className="link" onClick={() => setMode('forgot')}>Esqueci minha senha</button>}
      {mode !== 'new' && (
        <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Não tenho conta' : 'Voltar para entrar'}
        </button>
      )}
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
  const body = CAST.filter((c) => picks[c.id]).map((c) => `${picks[c.id] === 'vive' ? 'VIVE ' : 'MORRE'} - ${c.name} (${c.actor})`).join('\n')
  const mailto = `mailto:${session.user.email}?subject=${encodeURIComponent('Minha aposta - Bolão Doomsday')}&body=${encodeURIComponent(body)}`
  const set = (id, v) => !locked && setPicks((p) => ({ ...p, [id]: p[id] === v ? undefined : v }))

  async function save() {
    setStatus('Salvando...')
    const rows = Object.entries(picks).filter(([, v]) => v).map(([character_id, outcome]) => ({ user_id: uid, character_id, outcome }))
    const del = await supabase.from('bets').delete().eq('user_id', uid)
    if (del.error) return setStatus(del.error.message)
    const ins = await supabase.from('bets').insert(rows)
    if (ins.error) return setStatus(ins.error.message)
    setSaved(true)
    setStatus('Aposta salva. Use "Enviar cópia por e-mail" abaixo.')
  }

  return (
    <>
      <p className="hint">
        {locked ? 'Apostas encerradas.' : `Escolha quantos quiser.${config ? ` Prazo: ${new Date(config.deadline).toLocaleString('pt-BR')}.` : ''}`} Personagens sem destino confirmado não contam.
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
        {saved && <a className="mail" href={mailto}>✉ Enviar cópia por e-mail</a>}
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
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session) supabase.from('config').select('deadline').single().then(({ data }) => setConfig(data))
  }, [session])

  if (!configured) return <div className="card login"><h1>Configure o Supabase</h1><p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p></div>
  if (session === undefined) return null
  if (!session || recovery) return <Login recovery={recovery} />
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
