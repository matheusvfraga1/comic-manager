import { useCallback, useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import {
  Heart, Skull, EnvelopeSimple, Camera, SignOut, Trophy, ListChecks, Eye, EyeSlash,
  FloppyDisk, X, Check, MagnifyingGlassMinus, MagnifyingGlassPlus, Clock, LockSimple, Medal,
  Plus, Trash, UserCircle, PencilSimple,
} from '@phosphor-icons/react'
import { CAST } from './cast.js'
import { supabase, configured } from './supabase.js'

const STATIC = new Set(CAST.map((c) => c.id))
const photo = (id, custom) => custom
  ? supabase.storage.from('cast').getPublicUrl(custom).data.publicUrl
  : STATIC.has(id) ? `${import.meta.env.BASE_URL}cast/${id}.jpg?v=2` : null
const readLS = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem armazenamento */ } }
const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'p'
const logo = `${import.meta.env.BASE_URL}logo.jpg`

/* ---------- utilidades ---------- */

function useToast() {
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast || toast.sticky) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])
  const show = useCallback((text, kind = 'ok', sticky = false) => setToast({ text, kind, sticky, k: Date.now() }), [])
  const node = toast && <div key={toast.k} className={`toast ${toast.kind}`} role="status">{toast.text}</div>
  return [show, node]
}

function VoteBar({ vive, morre }) {
  const total = vive + morre
  if (!total) return null
  const pv = Math.round((vive / total) * 100)
  return (
    <div className="votebar" title={`${vive} vive · ${morre} morre`} aria-label={`${pv}% acham que vive, ${100 - pv}% que morre`}>
      <div className="vb-track"><div className="vb-live" style={{ width: `${pv}%` }} /></div>
      <div className="vb-labels"><span>{pv}%</span><span>{100 - pv}%</span></div>
    </div>
  )
}

// true depois do prazo; atualiza sozinho quando o prazo chega com a página aberta
function useClosed(deadline) {
  const [now, setNow] = useState(Date.now())
  const end = deadline ? new Date(deadline).getTime() : null
  useEffect(() => {
    if (end == null || now >= end) return
    const t = setTimeout(() => setNow(Date.now()), Math.min(end - now + 50, 2 ** 31 - 1))
    return () => clearTimeout(t)
  }, [end, now])
  return end != null && now >= end
}

function Countdown({ deadline }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, new Date(deadline) - now)
  const p = (n) => String(n).padStart(2, '0')
  const parts = [[Math.floor(ms / 864e5), 'd'], [Math.floor(ms / 36e5) % 24, 'h'], [Math.floor(ms / 6e4) % 60, 'min'], [Math.floor(ms / 1e3) % 60, 's']]
  return (
    <span className="countdown" role="timer" aria-label="Tempo até o fim das apostas">
      {parts.map(([n, u]) => <span key={u}><b>{u === 'd' ? n : p(n)}</b><small>{u}</small></span>)}
    </span>
  )
}

async function cropToBlob(src, area) {
  const img = await new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src })
  const c = document.createElement('canvas')
  c.width = 600; c.height = 800
  c.getContext('2d').drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 600, 800)
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88))
}

/* ---------- login ---------- */

function Login({ recovery, onDone }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [mode, setMode] = useState(recovery ? 'new' : 'in')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(''); setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
        return setMsg(error ? traduz(error.message) : 'Link enviado. Abra seu e-mail para criar uma nova senha.')
      }
      if (mode === 'new') {
        const { error } = await supabase.auth.updateUser({ password: pass })
        return error ? setMsg(traduz(error.message)) : onDone()
      }
      if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name: name.trim() } } })
        if (error) return setMsg(traduz(error.message))
        if (data.session) return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
      if (error) setMsg(traduz(error.message))
    } finally { setBusy(false) }
  }

  const titles = { in: 'Entrar', up: 'Criar conta', forgot: 'Enviar link', new: 'Salvar nova senha' }
  return (
    <main className="login">
      <form className="panel" onSubmit={submit}>
        <img src={logo} alt="Terra 616" className="logo" />
        <h1>Bolão Doomsday</h1>
        <p className="sub">{mode === 'forgot' ? 'Informe seu e-mail para redefinir a senha.' : mode === 'new' ? 'Escolha uma nova senha.' : 'Quem vive, quem morre?'}</p>
        {mode === 'up' && (
          <label className="field"><span>Seu nome (aparece no ranking)</span>
            <input type="text" autoComplete="name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        {mode !== 'new' && (
          <label className="field"><span>E-mail</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        )}
        {mode !== 'forgot' && (
          <label className="field"><span>{mode === 'new' ? 'Nova senha' : 'Senha'}</span>
            <div className="passwrap">
              <input type={show ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} required />
              <button type="button" className="icon eye" aria-label={show ? 'Ocultar senha' : 'Ver senha'} onClick={() => setShow(!show)}>
                {show ? <EyeSlash size={22} /> : <Eye size={22} />}
              </button>
            </div>
          </label>
        )}
        {msg && <p className="msg" role="alert">{msg}</p>}
        <button className="primary block" disabled={busy}>{busy ? 'Aguarde…' : titles[mode]}</button>
        <div className="links">
          {mode === 'in' && <button type="button" className="link" onClick={() => { setMode('forgot'); setMsg('') }}>Esqueci minha senha</button>}
          {mode !== 'new' && (
            <button type="button" className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
              {mode === 'in' ? 'Criar conta' : 'Já tenho conta'}
            </button>
          )}
        </div>
      </form>
    </main>
  )
}

function traduz(m) {
  const t = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'User already registered': 'Este e-mail já tem conta. Use "Já tenho conta".',
    'email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    'Password should be at least 6 characters.': 'A senha precisa de pelo menos 6 caracteres.',
  }
  return t[m] ?? m
}

/* ---------- recorte de foto ---------- */

function CropModal({ file, onCancel, onDone }) {
  const [src] = useState(() => URL.createObjectURL(file))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => () => URL.revokeObjectURL(src), [src])
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCancel()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onCancel])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Recortar foto">
      <div className="cropbox">
        <Cropper image={src} crop={crop} zoom={zoom} aspect={3 / 4} maxZoom={5}
          onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
      </div>
      <div className="croptools">
        <MagnifyingGlassMinus size={22} aria-hidden />
        <input type="range" min={1} max={5} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} aria-label="Zoom" />
        <MagnifyingGlassPlus size={22} aria-hidden />
      </div>
      <div className="cropactions">
        <button className="ghost" onClick={onCancel} disabled={busy}><X size={20} weight="bold" /> Cancelar</button>
        <button className="primary" disabled={!area || busy} onClick={async () => { setBusy(true); await onDone(await cropToBlob(src, area)) }}>
          <Check size={20} weight="bold" /> {busy ? 'Enviando…' : 'Usar foto'}
        </button>
      </div>
    </div>
  )
}

/* ---------- nome do participante ---------- */

function NameModal({ initial, required, onCancel, onSave }) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  return (
    <div className="modal center" role="dialog" aria-modal="true" aria-label="Seu nome">
      <form className="panel" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSave(name.trim()); setBusy(false) }}>
        <h1>Seu nome</h1>
        <p className="sub">É assim que você aparece no ranking.</p>
        <label className="field"><span>Nome</span>
          <input type="text" autoComplete="name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <div className={required ? '' : 'cropactions bare'}>
          {!required && <button type="button" className="ghost" onClick={onCancel} disabled={busy}><X size={20} weight="bold" /> Cancelar</button>}
          <button className={`primary ${required ? 'block' : ''}`} disabled={busy || !name.trim()}><Check size={20} weight="bold" /> {busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------- novo personagem ---------- */

function AddModal({ onCancel, onSave }) {
  const [name, setName] = useState('')
  const [actor, setActor] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onCancel()
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onCancel])
  return (
    <div className="modal center" role="dialog" aria-modal="true" aria-label="Novo personagem">
      <form className="panel" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await onSave(name.trim(), actor.trim()); setBusy(false) }}>
        <h1>Novo personagem</h1>
        <label className="field"><span>Personagem</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label className="field"><span>Ator / atriz</span>
          <input type="text" value={actor} onChange={(e) => setActor(e.target.value)} />
        </label>
        <div className="cropactions bare">
          <button type="button" className="ghost" onClick={onCancel} disabled={busy}><X size={20} weight="bold" /> Cancelar</button>
          <button className="primary" disabled={busy || !name.trim()}><Check size={20} weight="bold" /> {busy ? 'Salvando…' : 'Adicionar'}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------- apostas ---------- */

function Bets({ session, config, locked, admin: isAdmin, editing, toast }) {
  const admin = isAdmin && editing
  const uid = session.user.id
  const [picks, setPicks] = useState({})
  const [savedPicks, setSavedPicks] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [custom, setCustom] = useState(() => readLS('photos'))
  const [cast, setCast] = useState(() => readLS('cast') ?? CAST)
  const [adding, setAdding] = useState(false)
  const [cropping, setCropping] = useState(null)
  const [stats, setStats] = useState({})

  useEffect(() => {
    supabase.from('bets').select('character_id,outcome').eq('user_id', uid).then(({ data, error }) => {
      if (error) toast('Não foi possível carregar sua aposta.', 'err')
      const p = Object.fromEntries((data ?? []).map((b) => [b.character_id, b.outcome]))
      setPicks(p); setSavedPicks(p); setLoaded(true)
    })
    loadStats()
    supabase.from('characters').select('id,name,actor,sort').order('sort').then(({ data, error }) => {
      if (error || !data?.length) return // tabela ainda não criada: usa a lista fixa
      setCast(data); writeLS('cast', data)
    })
    supabase.from('photos').select('character_id,path').then(({ data, error }) => {
      if (error) return setCustom((c) => c ?? {})
      const m = Object.fromEntries((data ?? []).map((p) => [p.character_id, p.path]))
      setCustom(m); writeLS('photos', m)
    })
  }, [uid, toast])

  async function loadStats() {
    const { data } = await supabase.rpc('vote_stats')
    setStats(Object.fromEntries((data ?? []).map((r) => [r.character_id, r])))
  }

  const mine = cast.filter((c) => picks[c.id])
  const done = mine.length
  const saved = cast.some((c) => savedPicks[c.id])
  const dirty = JSON.stringify(Object.entries(picks).sort()) !== JSON.stringify(Object.entries(savedPicks).sort())
  const lives = mine.filter((c) => picks[c.id] === 'vive').length

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (id, v) => !locked && setPicks((p) => {
    const n = { ...p }
    if (n[id] === v) delete n[id]
    else n[id] = v
    return n
  })

  async function save() {
    setSaving(true)
    try {
      const changed = Object.keys(savedPicks).filter((id) => picks[id] !== savedPicks[id])
      if (changed.length) {
        const del = await supabase.from('bets').delete().eq('user_id', uid).in('character_id', changed)
        if (del.error) return toast('Erro ao salvar: ' + del.error.message, 'err')
      }
      const rows = Object.entries(picks).filter(([id, v]) => savedPicks[id] !== v).map(([character_id, outcome]) => ({ user_id: uid, character_id, outcome }))
      if (rows.length) {
        const ins = await supabase.from('bets').insert(rows)
        if (ins.error) return toast('Erro ao salvar. Tente de novo.', 'err')
      }
      setSavedPicks({ ...picks })
      loadStats()
      toast('Aposta salva.')
    } finally { setSaving(false) }
  }

  async function upload(id, blob) {
    const path = `${id}-${Date.now()}.jpg`
    const up = await supabase.storage.from('cast').upload(path, blob, { contentType: 'image/jpeg' })
    if (up.error) { setCropping(null); return toast('Erro no envio: ' + up.error.message, 'err') }
    const row = await supabase.from('photos').upsert({ character_id: id, path, updated_at: new Date().toISOString() })
    if (row.error) { setCropping(null); return toast('Erro: ' + row.error.message, 'err') }
    if (custom?.[id]) supabase.storage.from('cast').remove([custom[id]])
    setCustom((c) => { const m = { ...c, [id]: path }; writeLS('photos', m); return m })
    setCropping(null)
    toast('Foto atualizada.')
  }

  async function addChar(name, actor) {
    const id = `${slug(name)}-${Date.now().toString(36)}`
    const sort = Math.max(0, ...cast.map((c) => c.sort ?? 0)) + 10
    const { data, error } = await supabase.from('characters').insert({ id, name, actor, sort }).select('id,name,actor,sort').single()
    if (error) return toast(/characters/.test(error.message) ? 'Rode o SQL 0004_personagens.sql no Supabase primeiro.' : 'Erro: ' + error.message, 'err')
    setCast((l) => { const n = [...l, data]; writeLS('cast', n); return n })
    setAdding(false)
    toast('Adicionado. Use a câmera para pôr a foto.')
  }

  async function removeChar(c) {
    if (!confirm(`Remover ${c.name} do bolão?`)) return
    const { data, error } = await supabase.from('characters').delete().eq('id', c.id).select('id')
    if (error || !data?.length) return toast(error ? 'Erro: ' + error.message : 'Rode o SQL 0004_personagens.sql no Supabase primeiro.', 'err')
    if (custom?.[c.id]) {
      supabase.from('photos').delete().eq('character_id', c.id).then(() => {})
      supabase.storage.from('cast').remove([custom[c.id]])
    }
    setCast((l) => { const n = l.filter((x) => x.id !== c.id); writeLS('cast', n); return n })
    toast(`${c.name} removido.`)
  }

  const body = cast.filter((c) => savedPicks[c.id]).map((c) => `${savedPicks[c.id] === 'vive' ? 'VIVE ' : 'MORRE'} - ${c.name} (${c.actor})`).join('\n')
  const mailto = `mailto:${session.user.email}?subject=${encodeURIComponent('Minha aposta - Bolão Doomsday')}&body=${encodeURIComponent(body)}`

  return (
    <>
      <div className={`banner ${locked ? 'locked' : ''}`}>
        {locked
          ? <><LockSimple size={20} weight="bold" /> Apostas encerradas.</>
          : <><Clock size={20} weight="bold" /> {config ? <>Fecha em <Countdown deadline={config.deadline} /></> : 'Carregando prazo…'}</>}
        <span className="rule">Marque quantos quiser. Personagens sem destino confirmado não contam.</span>
      </div>

      <div className="grid" aria-busy={!loaded}>
        {cast.map((c) => {
          const v = picks[c.id]
          const src = custom && photo(c.id, custom[c.id])
          return (
            <article key={c.id} className={`char ${v ?? ''}`}>
              <div className="photo">
                {src ? <img src={src} alt="" loading="lazy" /> : custom && <UserCircle className="nophoto" size={72} weight="thin" aria-hidden />}
                {v && <span className={`badge ${v}`} aria-hidden>{v === 'vive' ? <Heart size={18} weight="fill" /> : <Skull size={18} weight="fill" />}</span>}
                {stats[c.id] && <VoteBar {...stats[c.id]} />}
                {admin && (
                  <label className="upload" title="Trocar foto" aria-label={`Trocar foto de ${c.name}`}>
                    <Camera size={22} weight="bold" />
                    <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) setCropping({ id: c.id, file: f }) }} />
                  </label>
                )}
                {admin && !locked && (
                  <button className="remove" title="Remover personagem" aria-label={`Remover ${c.name}`} onClick={() => removeChar(c)}>
                    <Trash size={20} weight="bold" />
                  </button>
                )}
              </div>
              <div className="info"><h3>{c.name}</h3><small>{c.actor}</small></div>
              <div className="btns" role="group" aria-label={`Destino de ${c.name}`}>
                <button disabled={locked} aria-pressed={v === 'vive'} className="live" onClick={() => set(c.id, 'vive')}>
                  <Heart size={20} weight={v === 'vive' ? 'fill' : 'regular'} /> Vive
                </button>
                <button disabled={locked} aria-pressed={v === 'morre'} className="die" onClick={() => set(c.id, 'morre')}>
                  <Skull size={20} weight={v === 'morre' ? 'fill' : 'regular'} /> Morre
                </button>
              </div>
            </article>
          )
        })}
        {admin && !locked && (
          <button className="char addchar" onClick={() => setAdding(true)}>
            <Plus size={40} weight="bold" /> Adicionar personagem
          </button>
        )}
      </div>

      <footer className="bar">
        <div className="progress">
          <div className="count"><b>{done}</b>/{cast.length}
            <span className="split"><Heart size={14} weight="fill" className="g" /> {lives} <Skull size={14} weight="fill" className="r" /> {done - lives}</span>
          </div>
          <div className="track"><div style={{ width: `${cast.length ? (done / cast.length) * 100 : 0}%` }} /></div>
          <small className={dirty ? 'warn' : ''}>{dirty ? 'Alterações não salvas' : saved ? 'Tudo salvo' : 'Nenhuma aposta ainda'}</small>
        </div>
        {saved && !dirty && <a className="icon mail" href={mailto} title="Enviar cópia por e-mail" aria-label="Enviar cópia por e-mail"><EnvelopeSimple size={24} /></a>}
        {!locked && <button className="primary" onClick={save} disabled={!dirty || saving}><FloppyDisk size={20} weight="bold" /> {saving ? 'Salvando…' : 'Salvar'}</button>}
      </footer>

      {adding && <AddModal onCancel={() => setAdding(false)} onSave={addChar} />}
      {cropping && <CropModal file={cropping.file} onCancel={() => setCropping(null)} onDone={(blob) => upload(cropping.id, blob)} />}
    </>
  )
}

/* ---------- ranking ---------- */

function Ranking({ config, open, uid }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!open) return
    (async () => {
      const [b, r, n] = await Promise.all([
        supabase.from('bets').select('user_id,character_id,outcome'),
        supabase.from('results').select('character_id,outcome'),
        supabase.from('profiles').select('id,name'),
      ])
      const res = Object.fromEntries((r.data ?? []).map((x) => [x.character_id, x.outcome]))
      const nm = Object.fromEntries((n.data ?? []).map((p) => [p.id, p.name]))
      const by = {}
      ;(b.data ?? []).forEach((x) => {
        const u = (by[x.user_id] ??= { hit: 0, valid: 0 })
        if (res[x.character_id]) { u.valid++; if (res[x.character_id] === x.outcome) u.hit++ }
      })
      const list = Object.entries(by)
        .map(([id, u]) => ({ id, name: nm[id] ?? 'anônimo', ...u, pct: u.valid ? (u.hit / u.valid) * 100 : 0 }))
        .sort((a, b) => b.pct - a.pct || b.hit - a.hit)
      list.forEach((x, i) => { x.pos = i && x.pct === list[i - 1].pct && x.hit === list[i - 1].hit ? list[i - 1].pos : i + 1 })
      setRows({ list, resolved: Object.keys(res).length })
    })()
  }, [open])

  if (!config) return <p className="empty">Carregando…</p>
  if (!open) return <p className="empty"><LockSimple size={28} /><br />O ranking abre quando as apostas fecharem.</p>
  if (!rows) return <p className="empty">Carregando…</p>
  if (!rows.resolved) return <p className="empty"><Clock size={28} /><br />Aguardando o resultado do filme.</p>
  const medal = ['#f5c542', '#c0c7cf', '#cd7f32']
  return (
    <ol className="rank">
      {rows.list.map((r) => (
        <li key={r.id} className={r.id === uid ? 'me' : ''}>
          <span className="pos">{r.pos <= 3 ? <Medal size={24} weight="fill" color={medal[r.pos - 1]} /> : r.pos}</span>
          <span className="who">{r.name}{r.id === uid && <small> (você)</small>}</span>
          <span className="hits">{r.hit}/{r.valid}</span>
          <b className="pct">{r.pct.toFixed(0)}%</b>
        </li>
      ))}
    </ol>
  )
}

/* ---------- app ---------- */

export default function App() {
  const [session, setSession] = useState(undefined)
  const [config, setConfig] = useState(null)
  const [tab, setTab] = useState('bets')
  const [recovery, setRecovery] = useState(false)
  const [admin, setAdmin] = useState(false)
  const [name, setName] = useState(null)
  const [editName, setEditName] = useState(false)
  const [editing, setEditing] = useState(false)
  const [toast, toastNode] = useToast()
  const uid = session?.user?.id
  const closed = useClosed(config?.deadline)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((e, s) => { setSession(s); if (e === 'PASSWORD_RECOVERY') setRecovery(true) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!uid) return
    supabase.from('config').select('deadline').single().then(({ data }) => setConfig(data))
    supabase.from('admins').select('user_id').eq('user_id', uid).then(({ data }) => setAdmin(Boolean(data?.length)))
    supabase.from('profiles').select('name').eq('id', uid).maybeSingle().then(({ data }) => {
      const meta = session.user.user_metadata?.name
      setName(meta ?? data?.name ?? '')
      if (meta && meta !== data?.name) supabase.from('profiles').upsert({ id: uid, name: meta }).then(() => {})
    })
  }, [uid])

  async function saveName(n) {
    const { error } = await supabase.auth.updateUser({ data: { name: n } })
    if (error) return toast('Não foi possível salvar o nome.', 'err')
    await supabase.from('profiles').upsert({ id: uid, name: n })
    setName(n); setEditName(false)
    toast('Nome salvo.')
  }
  // quem entrou antes de existir o campo de nome precisa escolher um
  const needName = session && name !== null && !session.user.user_metadata?.name

  if (!configured) return <main className="login"><div className="panel"><h1>Configure o Supabase</h1></div></main>
  if (session === undefined) return <div className="splash"><img src={logo} alt="" /></div>
  if (!session || recovery) return <Login recovery={recovery} onDone={() => setRecovery(false)} />
  return (
    <div className="app">
      <header className="top">
        <img src={logo} alt="Terra 616" />
        <nav className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'bets'} onClick={() => setTab('bets')}><ListChecks size={20} /> Aposta</button>
          <button role="tab" aria-selected={tab === 'rank'} onClick={() => setTab('rank')}><Trophy size={20} /> Ranking</button>
        </nav>
        {admin && tab === 'bets' && (
          <button className={`icon edit ${editing ? 'on' : ''}`} aria-pressed={editing} title={editing ? 'Sair da edição' : 'Editar personagens'} aria-label={editing ? 'Sair da edição' : 'Editar personagens'} onClick={() => setEditing(!editing)}>
            {editing ? <Check size={24} weight="bold" /> : <PencilSimple size={24} />}
          </button>
        )}
        <button className="icon me" title="Seu nome" aria-label={`Seu nome: ${name ?? ''}`} onClick={() => setEditName(true)}><UserCircle size={26} /></button>
        <button className="icon" title="Sair" aria-label="Sair" onClick={() => supabase.auth.signOut()}><SignOut size={24} /></button>
      </header>
      {tab === 'bets' ? <Bets session={session} config={config} locked={closed} admin={admin} editing={editing} toast={toast} /> : <Ranking config={config} open={closed} uid={uid} />}
      {(needName || editName) && (
        <NameModal
          initial={session.user.user_metadata?.name ?? (name && name !== session.user.email.split('@')[0] ? name : '')}
          required={needName}
          onCancel={() => setEditName(false)}
          onSave={saveName}
        />
      )}
      {toastNode}
    </div>
  )
}
