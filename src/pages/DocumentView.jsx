import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FloppyDisk, Trash, Archive, Eye, PencilSimple, DownloadSimple } from '@phosphor-icons/react';
import { supabase, q } from '../lib/supabase';
import { DOC_KINDS } from '../lib/templates';
import { useProject } from '../project';
import { Back, ErrorBanner, Spinner } from '../components/ui';
import { Markdown, MentionTextarea, Outline } from '../components/Markdown';
import { DOC_GROUPS } from './Documents';

const groupOf = kind => Object.entries(DOC_GROUPS).find(([, g]) => g.kinds.includes(kind))?.[0] ?? 'roteiro';

export default function DocumentView() {
  const { docId } = useParams();
  const [params] = useSearchParams();
  const { project, entities } = useProject();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [editing, setEditing] = useState(params.has('editar'));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    q(supabase.from('documents').select('*').eq('id', docId).single()).then(setDoc).catch(setError);
  }, [docId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = patch => { setDoc(d => ({ ...d, ...patch })); setDirty(true); };

  async function save(patch = {}) {
    setBusy(true); setError(null);
    try {
      const saved = await q(supabase.from('documents').update({ title: doc.title, kind: doc.kind, content: doc.content, archived: doc.archived, ...patch }).eq('id', doc.id).select().single());
      setDoc(saved); setDirty(false);
    } catch (e) { setError(e); }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Apagar o documento "${doc.title}"?`)) return;
    try {
      await q(supabase.from('documents').delete().eq('id', doc.id));
      navigate(`/p/${project.id}/${groupOf(doc.kind)}`);
    } catch (e) { setError(e); }
  }

  function exportMd() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([doc.content], { type: 'text/markdown;charset=utf-8' }));
    a.download = `${doc.title}.md`;
    a.click();
  }

  if (error && !doc) return <main><ErrorBanner error={error} /></main>;
  if (!doc) return <Spinner />;

  return (
    <main style={{ maxWidth: 1300 }}>
      <Back to={`/p/${project.id}/${groupOf(doc.kind)}`}>{DOC_GROUPS[groupOf(doc.kind)].title}</Back>
      <div className="page-header">
        <div style={{ flex: 1, minWidth: 240 }}>
          <input type="text" value={doc.title} onChange={e => set({ title: e.target.value })} style={{ fontSize: '1.3rem', fontWeight: 'bold' }} />
        </div>
        <div className="actions">
          <select value={doc.kind} onChange={e => set({ kind: e.target.value })} style={{ width: 'auto' }}>
            {Object.entries(DOC_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-secondary" onClick={() => setEditing(v => !v)}>{editing ? <><Eye /> Visualizar</> : <><PencilSimple /> Editar</>}</button>
          <button className="btn-primary" onClick={() => save()} disabled={busy || !dirty}><FloppyDisk /> {dirty ? 'Salvar' : 'Salvo'}</button>
          <button className="icon-btn" title="Baixar .md" onClick={exportMd}><DownloadSimple /></button>
          <button className="icon-btn" title={doc.archived ? 'Desarquivar' : 'Arquivar'} onClick={() => save({ archived: !doc.archived })}><Archive /></button>
          <button className="icon-btn danger" title="Apagar" onClick={remove}><Trash /></button>
        </div>
      </div>
      <ErrorBanner error={error} />
      {doc.archived && <div className="banner"><Archive /><span>Documento arquivado.{doc.source ? ` Origem: ${doc.source}` : ''}</span></div>}
      <div className="doc-layout">
        <Outline text={doc.content} />
        <div className="doc-body">
          {editing
            ? <MentionTextarea className="doc-editor" value={doc.content} onChange={content => set({ content })} entities={entities}
                placeholder={'# Ato 1\n\n## Cena 1\n\n[Cenário: @Mansão Silverman]\n\n@Adam entra na sala...'} />
            : doc.content ? <Markdown text={doc.content} entities={entities} projectId={project.id} /> : <p className="muted">Documento vazio. Clique em “Editar”.</p>}
        </div>
      </div>
    </main>
  );
}
