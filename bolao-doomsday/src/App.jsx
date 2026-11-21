import { useEffect, useMemo, useState } from 'react'
import { Heart, Skull, EnvelopeSimple, Camera, SignOut, Trophy, ListChecks, Eye, EyeSlash, FloppyDisk } from '@phosphor-icons/react'
import { CAST } from './cast.js'
import { supabase, configured } from './supabase.js'

const photo = (id, custom) => custom
  ? supabase.storage.from('cast').getPublicUrl(custom).data.publicUrl
  : `${import.meta.env.BASE_URL}cast/${id}.jpg?v=2`
const logo = `${import.meta.env.BASE_URL}logo.jpg`

function Login({ recovery, onDone }) {
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
      if (error) return setMsg(error.message)
      return onDone()
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
          <button type="button" className="eye" aria-label={show ? 'Ocultar senha' : 'Ver senha'} onClick={() => setShow(!show)}>{show ? <EyeSlash size={20} /> : <Eye size={20} />}</button>
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

function Bets({ session, config, admin }) {
  const uid = session.user.id
  const [picks, setPicks] = useState({})
  const [savedPicks, setSavedPicks] = useState({})
  const [status, setStatus] = useState('')
  const [custom, setCustom] = useState({})

  useEffect(() => {
    supabase.from('photos').select('character_id,path').then(({ data }) =>
      setCustom(Object.fromEntries((data ?? []).map((p) => [p.character_id, p.path]))))
  }, [])

  async function upload(id, file) {
    if (!file) return
    setStatus('Enviando foto...')
    const path = `${id}-${Date.now()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`
    const up = await supabase.storage.from('cast').upload(path, file, { contentType: file.type })
    if (up.error) return setStatus('Erro: ' + up.error.message)
    const row = await supabase.from('photos').upsert({ character_id: id, path, updated_at: new Date().toISOString() })
    if (row.error) return setStatus('Erro: ' + row.error.message)
    if (custom[id]) supabase.storage.from('cast').remove([custom[id]])
    setCustom((c) => ({ ...c, [id]: path }))
    setStatus('Foto atualizada.')
  }
  const locked = config && new Date() >= new Date(config.deadline)

  useEffect(() => {
    supabase.from('bets').select('character_id,outcome').eq('user_id', uid).then(({ data }) => {
      const p = {}
      ;(data ?? []).forEach((b) => (p[b.character_id] = b.outcome))
      setPicks(p)
      setSavedPicks(p)
    })
  }, [uid])

  const done = Object.keys(picks).length
  const saved = Object.keys(savedPicks).length > 0
  const dirty = JSON.stringify(Object.entries(picks).sort()) !== JSON.stringify(Object.entries(savedPicks).sort())
  const body = CAST.filter((c) => picks[c.id]).map((c) => `${picks[c.id] === 'vive' ? 'VIVE ' : 'MORRE'} - ${c.name} (${c.actor})`).join('\n')
  const mailto = `mailto:${session.user.email}?subject=${encodeURIComponent('Minha aposta - Bolão Doomsday')}&body=${encodeURIComponent(body)}`
  const set = (id, v) => !locked && setPicks((p) => {
    const n = { ...p }
    if (n[id] === v) delete n[id]
    else n[id] = v
    return n
  })

  async function save() {
    setStatus('Salvando...')
    // só mexe no que mudou, para não perder apostas se algo falhar no meio
    const changed = Object.keys(savedPicks).filter((id) => picks[id] !== savedPicks[id])
    if (changed.length) {
      const del = await supabase.from('bets').delete().eq('user_id', uid).in('character_id', changed)
      if (del.error) return setStatus('Erro: ' + del.error.message)
    }
    const rows = Object.entries(picks).filter(([id, v]) => savedPicks[id] !== v).map(([character_id, outcome]) => ({ user_id: uid, character_id, outcome }))
    if (rows.length) {
      const ins = await supabase.from('bets').insert(rows)
      if (ins.error) return setStatus('Erro: ' + ins.error.message + ' Tente salvar de novo.')
    }
    setSavedPicks({ ...picks })
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
            <div className="photo">
              <img src={photo(c.id, custom[c.id])} alt={c.name} loading="lazy" />
              {admin && (
                <label className="upload" title="Trocar foto">
                  <Camera size={20} weight="bold" />
                  <input type="file" accept="image/*" hidden onChange={(e) => { upload(c.id, e.target.files[0]); e.target.value = '' }} />
                </label>
              )}
            </div>
            <div className="info"><b>{c.name}</b><small>{c.actor}</small></div>
            <div className="btns">
              <button disabled={locked} className={picks[c.id] === 'vive' ? 'on live' : ''} onClick={() => set(c.id, 'vive')}><Heart size={18} weight="fill" /> Vive</button>
              <button disabled={locked} className={picks[c.id] === 'morre' ? 'on die' : ''} onClick={() => set(c.id, 'morre')}><Skull size={18} weight="fill" /> Morre</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bar">
        <span>{done}/{CAST.length} apostas {dirty ? '· não salvo' : saved ? '· salvo' : ''}</span>
        <span className="msg">{status}</span>
        {saved && !dirty && <a className="mail" href={mailto} title="Enviar cópia por e-mail"><EnvelopeSimple size={22} /> Cópia</a>}
        {!locked && <button className="primary" onClick={save} disabled={!dirty}><FloppyDisk size={18} weight="bold" /> Salvar</button>}
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
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (session) supabase.from('config').select('deadline').single().then(({ data }) => setConfig(data))
    if (session) supabase.from('admins').select('user_id').eq('user_id', session.user.id).then(({ data }) => setAdmin(Boolean(data?.length)))
  }, [session?.user?.id])

  if (!configured) return <div className="card login"><h1>Configure o Supabase</h1><p>Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.</p></div>
  if (session === undefined) return null
  if (!session || recovery) return <Login recovery={recovery} onDone={() => setRecovery(false)} />
  return (
    <div className="app">
      <header>
        <img src={logo} alt="" />
        <nav>
          <button className={tab === 'bets' ? 'on' : ''} onClick={() => setTab('bets')}><ListChecks size={18} /> Aposta</button>
          <button className={tab === 'rank' ? 'on' : ''} onClick={() => setTab('rank')}><Trophy size={18} /> Ranking</button>
        </nav>
        <button className="icon" title="Sair" aria-label="Sair" onClick={() => supabase.auth.signOut()}><SignOut size={22} /></button>
      </header>
      {tab === 'bets' ? <Bets session={session} config={config} admin={admin} /> : <Ranking config={config} />}
    </div>
  )
}
