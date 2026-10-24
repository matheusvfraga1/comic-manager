import { useCallback, useEffect, useState } from 'react';
import { FilePdf, FileDoc, File, DownloadSimple, Trash, Archive, PaperPlaneTilt } from '@phosphor-icons/react';
import { supabase, q, uploadFile, removeFiles, signedUrl } from '../lib/supabase';
import { useUser } from '../auth';
import { useProject } from '../project';
import { ArchivedToggle, Dropzone, ErrorBanner, Modal, ModalHeader, Spinner, StorageImg, formatBytes, useSignedUrl } from './ui';

const isImage = a => a.mime_type?.startsWith('image/');
const FileIcon = ({ a }) => (a.mime_type === 'application/pdf' ? <FilePdf /> : a.mime_type?.includes('word') ? <FileDoc /> : <File />);

// Lista de arquivos do projeto: imagens em grade, outros arquivos em lista.
// filter: colunas para filtrar (kinds = lista de tipos); defaults: valores para os novos uploads.
export default function AssetList({ filter, defaults, kindForFile, accept, uploadLabel }) {
  const { project } = useProject();
  const user = useUser();
  const [rows, setRows] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const filterKey = JSON.stringify(filter);
  const load = useCallback(async () => {
    const { kinds, ...eq } = JSON.parse(filterKey);
    let query = supabase.from('assets').select('*').eq('project_id', project.id).order('created_at');
    if (kinds) query = query.in('kind', kinds);
    for (const [k, v] of Object.entries(eq)) query = query.eq(k, v);
    try { setRows(await q(query)); } catch (e) { setError(e); }
  }, [filterKey, project.id]);

  useEffect(() => { load(); }, [load]);

  async function upload(files) {
    setBusy(true); setError(null);
    try {
      for (const file of files) {
        const path = await uploadFile(user.id, project.id, file, 'arquivos');
        await q(supabase.from('assets').insert({
          project_id: project.id, title: file.name.replace(/\.[^.]+$/, ''), storage_path: path,
          mime_type: file.type || null, size_bytes: file.size, ...defaults,
          kind: kindForFile ? kindForFile(file) : defaults.kind,
        }));
      }
      await load();
    } catch (e) { setError(e); }
    setBusy(false);
  }

  async function download(a) {
    const url = await signedUrl(a.storage_path);
    if (url) window.open(url, '_blank', 'noopener');
  }

  async function update(a, patch) {
    try {
      await q(supabase.from('assets').update(patch).eq('id', a.id));
      setRows(rs => rs.map(r => (r.id === a.id ? { ...r, ...patch } : r)));
      setOpen(o => (o?.id === a.id ? { ...o, ...patch } : o));
    } catch (e) { setError(e); }
  }

  async function remove(a) {
    if (!confirm(`Apagar "${a.title}"?`)) return;
    try {
      await removeFiles([a.storage_path]);
      await q(supabase.from('assets').delete().eq('id', a.id));
      setRows(rs => rs.filter(r => r.id !== a.id));
      setOpen(null);
    } catch (e) { setError(e); }
  }

  const archivedCount = rows?.filter(r => r.archived).length ?? 0;
  const visible = rows?.filter(r => showArchived || !r.archived) ?? [];
  const images = visible.filter(isImage);
  const others = visible.filter(a => !isImage(a));

  return (
    <div>
      <ErrorBanner error={error} />
      <div className="actions" style={{ marginBottom: 16, justifyContent: 'flex-end' }}>
        {archivedCount > 0 && <ArchivedToggle value={showArchived} onChange={setShowArchived} count={archivedCount} />}
      </div>
      {!rows && <Spinner />}
      {images.length > 0 && (
        <div className="projects-grid" style={{ marginBottom: 24 }}>
          {images.map(a => (
            <div key={a.id} className="project-card" onClick={() => setOpen(a)} style={{ opacity: a.archived ? 0.55 : 1 }}>
              <div className="project-thumb square"><StorageImg path={a.storage_path} alt={a.title} /></div>
              <div className="project-info"><h3 style={{ fontSize: '0.9rem' }}>{a.title}</h3>{a.archived && <p>Arquivado</p>}</div>
            </div>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="list" style={{ marginBottom: 24 }}>
          {others.map(a => (
            <div key={a.id} className="list-item" style={{ opacity: a.archived ? 0.55 : 1 }}>
              <FileIcon a={a} />
              <div className="grow"><strong>{a.title}</strong><small>{[formatBytes(a.size_bytes), a.archived && 'Arquivado'].filter(Boolean).join(' • ')}</small></div>
              <button className="icon-btn" title="Abrir / baixar" onClick={() => download(a)}><DownloadSimple /></button>
              <button className="icon-btn" title={a.archived ? 'Desarquivar' : 'Arquivar'} onClick={() => update(a, { archived: !a.archived })}><Archive /></button>
              <button className="icon-btn danger" title="Apagar" onClick={() => remove(a)}><Trash /></button>
            </div>
          ))}
        </div>
      )}
      {rows && !visible.length && <div className="empty-state" style={{ marginBottom: 20 }}>Nada por aqui ainda.</div>}
      <Dropzone onFiles={upload} busy={busy} accept={accept} label={uploadLabel} />
      {open && <ImageViewer asset={open} onClose={() => setOpen(null)} onUpdate={p => update(open, p)} onRemove={() => remove(open)} />}
    </div>
  );
}

function ImageViewer({ asset, onClose, onUpdate, onRemove }) {
  const url = useSignedUrl(asset.storage_path);
  const user = useUser();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [title, setTitle] = useState(asset.title);

  useEffect(() => {
    supabase.from('comments').select('*').eq('asset_id', asset.id).order('created_at').then(({ data }) => setComments(data ?? []));
  }, [asset.id]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const { data } = await supabase.from('comments').insert({ asset_id: asset.id, body: text.trim() }).select().single();
    if (data) setComments(c => [...c, data]);
    setText('');
  }

  return (
    <Modal onClose={onClose} className="page-editor-layout ig-wrap">
      <div className="ig-image-area">{url ? <img src={url} alt={asset.title} /> : <Spinner />}</div>
      <div className="ig-sidebar">
        <div className="ig-header" style={{ justifyContent: 'space-between' }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title !== asset.title && onUpdate({ title })} />
          <ModalHeader onClose={onClose} />
        </div>
        <div className="ig-comments">
          {asset.caption && <p>{asset.caption}</p>}
          {comments.map(c => (
            <div key={c.id}>
              <strong>{c.author === user?.id ? 'Você' : 'Colaborador'}</strong> {c.body}
              <br /><small className="muted">{new Date(c.created_at).toLocaleString('pt-BR')}</small>
            </div>
          ))}
          {!comments.length && !asset.caption && <p className="muted">Sem comentários.</p>}
        </div>
        <div className="ig-actions">
          <form onSubmit={send} className="row" style={{ flexDirection: 'row' }}>
            <input type="text" placeholder="Comentar…" value={text} onChange={e => setText(e.target.value)} />
            <button className="icon-btn" title="Enviar"><PaperPlaneTilt /></button>
          </form>
          <div className="actions">
            {url && <a className="btn-secondary small" href={url} target="_blank" rel="noreferrer"><DownloadSimple /> Original</a>}
            <button className="btn-secondary small" onClick={() => onUpdate({ archived: !asset.archived })}><Archive /> {asset.archived ? 'Desarquivar' : 'Arquivar'}</button>
            <button className="btn-danger small" onClick={onRemove}><Trash /></button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
