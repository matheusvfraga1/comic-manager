import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen } from '@phosphor-icons/react';
import { supabase, q } from '../lib/supabase';
import { ErrorBanner, Spinner, StorageImg } from '../components/ui';

export default function Projects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    q(supabase.from('projects').select('id,title,pages,genres,cover_path').order('updated_at', { ascending: false }))
      .then(setProjects).catch(setError);
  }, []);

  return (
    <main>
      <div className="page-header">
        <h2>Meus projetos</h2>
        <div className="actions">
          <Link className="btn-primary" to="/novo"><Plus /> Novo projeto</Link>
        </div>
      </div>
      <ErrorBanner error={error} />
      {!projects && !error && <Spinner />}
      {projects?.length === 0 && (
        <div className="empty-state">
          <p>Nenhum projeto ainda.</p>
          <p className="small">Crie o primeiro em “Novo projeto”.</p>
        </div>
      )}
      <div className="projects-grid">
        {projects?.map(p => (
          <Link key={p.id} className="project-card" to={`/p/${p.id}`}>
            <div className="project-thumb"><StorageImg path={p.cover_path} alt={p.title} fallback={<BookOpen />} /></div>
            <div className="project-info">
              <h3>{p.title}</h3>
              <p>{[p.pages && `${p.pages} páginas`, p.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' • ')}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
