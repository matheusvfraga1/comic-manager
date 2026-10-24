import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, FileDoc, Info } from '@phosphor-icons/react';
import { supabase, q } from '../lib/supabase';
import { DOC_KINDS } from '../lib/templates';
import { htmlToMarkdown } from '../lib/importParse';
import { useProject } from '../project';
import { ArchivedToggle, Back, ErrorBanner, Spinner } from '../components/ui';

export const DOC_GROUPS = {
  roteiro: { title: 'Roteiro', kinds: ['roteiro', 'escaleto', 'beat_sheet', 'sinopse'] },
  lore: { title: 'Lore', kinds: ['lore'] },
  anotacoes: { title: 'Anotações e modelos', kinds: ['anotacao', 'modelo', 'planilha'] },
};

export default function Documents({ group }) {
  const cfg = DOC_GROUPS[group];
  const { project } = useProject();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDocs(null);
    q(supabase.from('documents').select('id,title,kind,archived,updated_at,source').eq('project_id', project.id).in('kind', cfg.kinds).order('position').order('title'))
      .then(setDocs).catch(setError);
  }, [cfg, project.id]);

  async function create(content = '', title) {
    title ??= prompt('Título do documento:');
    if (!title?.trim()) return;
    try {
      const doc = await q(supabase.from('documents').insert({ project_id: project.id, kind: cfg.kinds[0], title: title.trim(), content }).select('id').single());
      navigate(`/p/${project.id}/doc/${doc.id}${content ? '' : '?editar'}`);
    } catch (e) { setError(e); }
  }

  async function importDocx(file) {
    if (!file) return;
    setBusy(true);
    try {
      const mammoth = await import('mammoth/mammoth.browser');
      const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      await create(htmlToMarkdown(value), file.name.replace(/\.docx$/i, ''));
    } catch (e) { setError(e); }
    setBusy(false);
  }

  const archivedCount = docs?.filter(d => d.archived).length ?? 0;
  const visible = docs?.filter(d => showArchived || !d.archived);

  return (
    <main>
      <Back to={`/p/${project.id}`}>{project.title}</Back>
      <div className="page-header">
        <h2>{cfg.title}</h2>
        <div className="actions">
          {archivedCount > 0 && <ArchivedToggle value={showArchived} onChange={setShowArchived} count={archivedCount} />}
          <label className="btn-secondary"><FileDoc /> {busy ? 'Importando…' : 'Importar .docx'}
            <input type="file" hidden accept=".docx" disabled={busy} onChange={e => { importDocx(e.target.files[0]); e.target.value = ''; }} />
          </label>
          <button className="btn-primary" onClick={() => create()}><Plus /> Novo documento</button>
        </div>
      </div>
      <ErrorBanner error={error} />
      {group === 'roteiro' && (
        <div className="banner"><Info /><span>Dica: no editor, digite <code>@</code> para citar um personagem ou cenário. Na leitura, a citação vira um link para a ficha.</span></div>
      )}
      {group === 'lore' && project.miro_url && <MiroEmbed url={project.miro_url} />}
      {!docs && <Spinner />}
      <div className="list">
        {visible?.map(d => (
          <Link key={d.id} className="list-item" to={`/p/${project.id}/doc/${d.id}`} style={{ opacity: d.archived ? 0.55 : 1 }}>
            <FileText />
            <div className="grow">
              <strong>{d.title}</strong>
              <small>{DOC_KINDS[d.kind]}{d.archived ? ' • Arquivado' : ''} • atualizado em {new Date(d.updated_at).toLocaleDateString('pt-BR')}</small>
            </div>
          </Link>
        ))}
      </div>
      {visible?.length === 0 && <div className="empty-state">Nenhum documento ainda.</div>}
    </main>
  );
}

function MiroEmbed({ url }) {
  const m = url.match(/miro\.com\/app\/board\/([^/?#]+)/);
  if (!m) return <p className="muted" style={{ marginBottom: 16 }}>Quadro do Miro: <a href={url} target="_blank" rel="noreferrer">{url}</a></p>;
  return (
    <iframe title="Miro" src={`https://miro.com/app/live-embed/${m[1]}/?autoplay=yep`} allow="fullscreen; clipboard-read; clipboard-write"
      style={{ width: '100%', height: 480, border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20 }} />
  );
}
