import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, User, MapTrifold } from '@phosphor-icons/react';
import { supabase, q } from '../lib/supabase';
import { ENTITY_TYPES } from '../lib/entities';
import { cloneTemplate } from '../lib/templates';
import { useProject } from '../project';
import { ArchivedToggle, Back, ErrorBanner, Spinner, StorageImg } from '../components/ui';

export default function Entities() {
  const { type } = useParams();
  const cfg = ENTITY_TYPES[type];
  const { project, reload } = useProject();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRows(null);
    q(supabase.from(cfg.table).select('id,name,image_path,archived,' + cfg.extra).eq('project_id', project.id).order('position').order('name'))
      .then(setRows).catch(setError);
  }, [cfg, project.id]);

  async function create() {
    const name = prompt(`Nome do ${cfg.singular}:`);
    if (!name?.trim()) return;
    try {
      const row = await q(supabase.from(cfg.table).insert({ project_id: project.id, name: name.trim(), sheet: cloneTemplate(cfg.template) }).select('id').single());
      await reload();
      navigate(row.id);
    } catch (e) { setError(e); }
  }

  const archivedCount = rows?.filter(r => r.archived).length ?? 0;
  const visible = rows?.filter(r => showArchived || !r.archived);
  const Icon = cfg.round ? User : MapTrifold;

  return (
    <main>
      <Back to={`/p/${project.id}`}>{project.title}</Back>
      <div className="page-header">
        <h2>{cfg.title}</h2>
        <div className="actions">
          {archivedCount > 0 && <ArchivedToggle value={showArchived} onChange={setShowArchived} count={archivedCount} />}
          <button className="btn-primary" onClick={create}><Plus /> {cfg.novo}</button>
        </div>
      </div>
      <ErrorBanner error={error} />
      {!rows && <Spinner />}
      {cfg.round ? (
        <div className="character-grid">
          {visible?.map(r => (
            <Link key={r.id} className="char-card" to={r.id} style={{ opacity: r.archived ? 0.55 : 1 }}>
              <div className="char-avatar"><StorageImg path={r.image_path} alt={r.name} fallback={<Icon />} /></div>
              <h3 style={{ fontSize: '1rem' }}>{r.name}</h3>
              <small>{r.archived ? 'Arquivado' : r[cfg.extra]}</small>
            </Link>
          ))}
          <button className="char-card add-char" onClick={create}><div className="char-avatar"><Plus /></div><small>Adicionar</small></button>
        </div>
      ) : (
        <div className="projects-grid">
          {visible?.map(r => (
            <Link key={r.id} className="project-card" to={r.id} style={{ opacity: r.archived ? 0.55 : 1 }}>
              <div className="project-thumb wide"><StorageImg path={r.image_path} alt={r.name} fallback={<Icon />} /></div>
              <div className="project-info"><h3>{r.name}</h3><p>{r.archived ? 'Arquivado' : r[cfg.extra]}</p></div>
            </Link>
          ))}
        </div>
      )}
      {visible?.length === 0 && <div className="empty-state">Nenhum {cfg.singular} ainda.</div>}
    </main>
  );
}
