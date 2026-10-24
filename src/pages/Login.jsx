import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ErrorBanner } from '../components/ui';

export default function Login() {
  const [mode, setMode] = useState('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');

  const redirectTo = window.location.origin + window.location.pathname;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo('');
    try {
      if (mode === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'criar') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (!data.session) setInfo('Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setInfo('Se o e-mail existir, você vai receber um link para redefinir a senha.');
      }
    } catch (err) { setError(err); }
    setBusy(false);
  }

  return (
    <main className="auth-box">
      <h1>Comic Manager</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Organize seus quadrinhos: roteiro, personagens, cenários, lore e páginas.</p>
      <form className="panel" onSubmit={submit}>
        <div className="tabs">
          {[['entrar', 'Entrar'], ['criar', 'Criar conta'], ['senha', 'Esqueci a senha']].map(([id, label]) => (
            <button type="button" key={id} className={'tab' + (mode === id ? ' active' : '')} onClick={() => setMode(id)}>{label}</button>
          ))}
        </div>
        <ErrorBanner error={error} />
        {info && <div className="banner">{info}</div>}
        <div className="input-group"><label>E-mail</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
        {mode !== 'senha' && (
          <div className="input-group"><label>Senha</label><input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} /></div>
        )}
        <button className="btn-primary" style={{ width: '100%' }} disabled={busy}>
          {mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : 'Enviar link'}
        </button>
      </form>
    </main>
  );
}
