import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ENTITY_TYPES } from './lib/entities';
import { SignOut } from '@phosphor-icons/react';
import { supabase } from './lib/supabase';
import { AuthProvider, useSession } from './auth';
import { ProjectLayout } from './project';
import { Modal, ModalHeader, Spinner, ErrorBanner } from './components/ui';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectDashboard from './pages/ProjectDashboard';
import ProjectEdit from './pages/ProjectEdit';
import Entities from './pages/Entities';
import EntityDetail from './pages/EntityDetail';
import Documents from './pages/Documents';
import DocumentView from './pages/DocumentView';
import Pages from './pages/Pages';
import Gallery from './pages/Gallery';

// A importação da HQ só existe rodando localmente (npm run dev).
const Import = import.meta.env.DEV ? lazy(() => import('./pages/Import')) : null;

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AuthProvider>
  );
}

function Shell() {
  const session = useSession();
  if (session === undefined) return <Spinner />;
  if (!session) return <Login />;
  const name = session.user.email.split('@')[0];

  return (
    <>
      <header className="topbar">
        <Link className="logo" to="/">Comic Manager</Link>
        <div className="user-menu">
          <span className="muted small">{session.user.email}</span>
          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=bb86fc&color=000`} alt="" />
          <button className="icon-btn" title="Sair" onClick={() => supabase.auth.signOut()}><SignOut /></button>
        </div>
      </header>
      <PasswordRecovery />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<Projects />} />
          <Route path="/novo" element={<ProjectEdit />} />
          {Import && <Route path="/importar" element={<Import />} />}
          <Route path="/p/:projectId" element={<ProjectLayout />}>
            <Route index element={<ProjectDashboard />} />
            <Route path="editar" element={<ProjectEdit />} />
            <Route path="roteiro" element={<Documents group="roteiro" />} />
            <Route path="lore" element={<Documents group="lore" />} />
            <Route path="anotacoes" element={<Documents group="anotacoes" />} />
            <Route path="doc/:docId" element={<DocumentView />} />
            <Route path="paginas" element={<Pages />} />
            <Route path="artes" element={<Gallery name="artes" />} />
            <Route path="referencias" element={<Gallery name="referencias" />} />
            <Route path=":type" element={<TypeGuard><Entities /></TypeGuard>} />
            <Route path=":type/:entityId" element={<TypeGuard><EntityDetail /></TypeGuard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function TypeGuard({ children }) {
  const { type } = useParams();
  return ENTITY_TYPES[type] ? children : <Navigate to=".." replace />;
}

// Quando a pessoa chega pelo link de "Esqueci a senha".
function PasswordRecovery() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => event === 'PASSWORD_RECOVERY' && setOpen(true));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!open) return null;
  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error); else setOpen(false);
  }
  return (
    <Modal onClose={() => setOpen(false)} style={{ maxWidth: 420 }}>
      <ModalHeader title="Nova senha" onClose={() => setOpen(false)} />
      <ErrorBanner error={error} />
      <form onSubmit={save}>
        <div className="input-group"><label>Nova senha</label><input type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></div>
        <button className="btn-primary">Salvar senha</button>
      </form>
    </Modal>
  );
}
