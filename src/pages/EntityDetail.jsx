import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FloppyDisk, Trash, UploadSimple, Archive, User, MapTrifold, Eye, PencilSimple, ListPlus } from '@phosphor-icons/react';
import { supabase, q, uploadFile, removeFiles } from '../lib/supabase';
import { ENTITY_TYPES } from '../lib/entities';
import { cloneTemplate } from '../lib/templates';
import { useUser } from '../auth';
import { useProject } from '../project';
import { Back, ErrorBanner, Spinner, StorageImg } from '../components/ui';
import SheetEditor from '../components/SheetEditor';
import { Markdown, MentionTextarea } from '../components/Markdown';
import AssetList from '../components/AssetList';

export default function EntityDetail() {
  const { type, entityId } = useParams();
  const cfg = ENTITY_TYPES[type];
  const { project, entities, reload } = useProject();
  const user = useUser();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [tab, setTab] = useState('ficha');
  const [editNotes, setEditNotes] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRow(null);
    q(supabase.from(cfg.table).select('*').eq('id', entityId).single())
      .then(r => { setRow(r); setTab(r.sheet.length || !r.notes ? 'ficha' : 'notas'); setHideEmpty(r.sheet.some(s => s.items.some(i => i.value))); })
      .catch(setError);
  }, [cfg, entityId]);

  const set = patch => { setRow(r => ({ ...r, ...patch })); setDirty(true); };

  async function save(patch = {}) {
    setBusy(true); setError(null);
    try {
      const data = { name: row.name, summary: row.summary, sheet: row.sheet, notes: row.notes, archived: row.archived, [cfg.extra]: row[cfg.extra], ...patch };
      const saved = await q(supabase.from(cfg.table).update(data).eq('id', row.id).select().single());
      setRow(saved); setDirty(false);
      await reload();
    } catch (e) { setError(e); }
    setBusy(false);
  }

  async function changeImage(file) {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadFile(user.id, project.id, file, type);
      await q(supabase.from(cfg.table).update({ image_path: path }).eq('id', row.id));
      await removeFiles([row.image_path]);
      setRow(r => ({ ...r, image_path: path }));
    } catch (e) { setError(e); }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Apagar "${row.name}"? Os arquivos ligados a ele continuam no projeto.`)) return;
    try {
      await removeFiles([row.image_path]);
      await q(supabase.from(cfg.table).delete().eq('id', row.id));
      await reload();
      navigate('..', { relative: 'path' });
    } catch (e) { setError(e); }
  }

  if (error && !row) return <main><ErrorBanner error={error} /></main>;
  if (!row) return <Spinner />;
  const Icon = cfg.round ? User : MapTrifold;

  return (
    <main>
      <Back to={`/p/${project.id}/${type}`}>{cfg.title}</Back>
      <ErrorBanner error={error} />
      <div className="project-header-info">
        <div style={{ textAlign: 'center' }}>
          <div className="char-avatar" style={{ width: 150, height: 150, borderRadius: cfg.round ? '50%' : 10, marginBottom: 10 }}>
            <StorageImg path={row.image_path} alt={row.name} fallback={<Icon />} />
          </div>
          <label className="btn-secondary small"><UploadSimple /> Imagem
            <input type="file" hidden accept="image/*" onChange={e => changeImage(e.target.files[0])} />
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="input-group"><label>Nome</label><input type="text" value={row.name} onChange={e => set({ name: e.target.value })} /></div>
          <div className="input-group"><label>{cfg.extraLabel}</label><input type="text" value={row[cfg.extra] ?? ''} onChange={e => set({ [cfg.extra]: e.target.value })} /></div>
          <div className="input-group"><label>Resumo</label><textarea rows={2} value={row.summary ?? ''} onChange={e => set({ summary: e.target.value })} /></div>
          <div className="actions">
            <button className="btn-primary" onClick={() => save()} disabled={busy || !dirty}><FloppyDisk /> {dirty ? 'Salvar' : 'Salvo'}</button>
            <button className="btn-secondary" onClick={() => save({ archived: !row.archived })} disabled={busy}><Archive /> {row.archived ? 'Desarquivar' : 'Arquivar'}</button>
            <button className="btn-danger" onClick={remove} disabled={busy}><Trash /> Apagar</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'ficha' ? ' active' : '')} onClick={() => setTab('ficha')}>Ficha</button>
        <button className={'tab' + (tab === 'notas' ? ' active' : '')} onClick={() => setTab('notas')}>Texto / anotações</button>
        <button className={'tab' + (tab === 'arquivos' ? ' active' : '')} onClick={() => setTab('arquivos')}>Arquivos</button>
      </div>

      {tab === 'ficha' && (
        <>
          <div className="actions" style={{ marginBottom: 16 }}>
            <label className="toggle"><input type="checkbox" checked={hideEmpty} onChange={e => setHideEmpty(e.target.checked)} /> Esconder campos vazios</label>
            <button className="btn-secondary small" onClick={() => set({ sheet: [...row.sheet, ...cloneTemplate(cfg.template)] })}><ListPlus /> Adicionar modelo padrão</button>
          </div>
          {row.sheet.length === 0
            ? <div className="empty-state">Ficha vazia. {row.notes ? 'O conteúdo deste item está na aba “Texto / anotações”.' : 'Use “Adicionar modelo padrão” para começar.'}</div>
            : <SheetEditor sheet={row.sheet} onChange={sheet => set({ sheet })} hideEmpty={hideEmpty} />}
        </>
      )}

      {tab === 'notas' && (
        <div className="doc-body">
          <div className="actions" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn-secondary small" onClick={() => setEditNotes(v => !v)}>{editNotes ? <><Eye /> Visualizar</> : <><PencilSimple /> Editar</>}</button>
          </div>
          {editNotes
            ? <MentionTextarea className="doc-editor" value={row.notes ?? ''} onChange={notes => set({ notes })} entities={entities} placeholder="Texto livre em Markdown. Use @ para citar personagens e cenários." />
            : row.notes ? <Markdown text={row.notes} entities={entities} projectId={project.id} /> : <p className="muted">Sem anotações.</p>}
        </div>
      )}

      {tab === 'arquivos' && <AssetList filter={{ [cfg.fk]: row.id }} defaults={{ kind: 'attachment', [cfg.fk]: row.id }} />}
    </main>
  );
}
