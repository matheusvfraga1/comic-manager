import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FloppyDisk, Trash, UploadSimple } from '@phosphor-icons/react';
import { supabase, q, uploadFile, removeFiles } from '../lib/supabase';
import { useUser } from '../auth';
import { GENRES, AGE_RATINGS, CONTENT_TAGS } from '../lib/templates';
import { Back, ErrorBanner, Pills, StorageImg } from '../components/ui';

const EMPTY = { title: '', production_name: '', author: '', pages: '', logline: '', synopsis: '', genres: [], age_rating: 'Livre', content_tags: [], miro_url: '', cover_path: null };

// Serve tanto para criar (/novo) quanto para editar (/p/:id/editar).
export default function ProjectEdit() {
  const ctx = useOutletContext();
  const existing = ctx?.project;
  const user = useUser();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => existing ? { ...EMPTY, ...existing, pages: existing.pages ?? '' } : EMPTY);
  const [coverFile, setCoverFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) return setError(new Error('Dê um título ao projeto.'));
    setBusy(true); setError(null);
    try {
      const row = {
        title: form.title.trim(), production_name: form.production_name || null, author: form.author || null,
        pages: form.pages === '' ? null : +form.pages, logline: form.logline || null, synopsis: form.synopsis || null,
        genres: form.genres, age_rating: form.age_rating, content_tags: form.content_tags, miro_url: form.miro_url || null,
      };
      const saved = existing
        ? await q(supabase.from('projects').update(row).eq('id', existing.id).select().single())
        : await q(supabase.from('projects').insert(row).select().single());
      if (coverFile) {
        const path = await uploadFile(user.id, saved.id, coverFile, 'capa');
        await q(supabase.from('projects').update({ cover_path: path }).eq('id', saved.id));
        if (existing?.cover_path) await removeFiles([existing.cover_path]);
      }
      await ctx?.reload?.();
      navigate(`/p/${saved.id}`);
    } catch (e) { setError(e); setBusy(false); }
  }

  async function remove() {
    if (!confirm(`Apagar o projeto "${existing.title}" com todos os personagens, documentos e arquivos? Isso não pode ser desfeito.`)) return;
    setBusy(true);
    try {
      const assets = await q(supabase.from('assets').select('storage_path').eq('project_id', existing.id));
      const chars = await q(supabase.from('characters').select('image_path').eq('project_id', existing.id));
      const locs = await q(supabase.from('locations').select('image_path').eq('project_id', existing.id));
      await removeFiles([existing.cover_path, ...assets.map(a => a.storage_path), ...chars.map(c => c.image_path), ...locs.map(l => l.image_path)]);
      await q(supabase.from('projects').delete().eq('id', existing.id));
      navigate('/');
    } catch (e) { setError(e); setBusy(false); }
  }

  const coverPreview = coverFile ? URL.createObjectURL(coverFile) : null;

  return (
    <main>
      <Back to={existing ? `/p/${existing.id}` : '/'}>Cancelar</Back>
      <div className="page-header">
        <h2>{existing ? 'Editar projeto' : 'Novo projeto'}</h2>
        <div className="actions">
          {existing && <button className="btn-danger" onClick={remove} disabled={busy}><Trash /> Apagar</button>}
          <button className="btn-primary" onClick={save} disabled={busy}><FloppyDisk /> Salvar</button>
        </div>
      </div>
      <ErrorBanner error={error} />
      <div className="panel">
        <div className="row">
          <div style={{ flex: '0 0 160px' }}>
            <div className="project-cover-large" style={{ width: 160, marginBottom: 10 }}>
              {coverPreview ? <img src={coverPreview} alt="Capa" /> : <StorageImg path={form.cover_path} alt="Capa" fallback={<span>Capa</span>} />}
            </div>
            <label className="btn-secondary" style={{ width: 160 }}>
              <UploadSimple /> Capa
              <input type="file" hidden accept="image/*" onChange={e => setCoverFile(e.target.files[0] ?? null)} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div className="input-group"><label>Título</label><input type="text" value={form.title} onChange={e => set('title', e.target.value)} /></div>
            <div className="row">
              <div className="input-group"><label>Nome de produção</label><input type="text" value={form.production_name ?? ''} onChange={e => set('production_name', e.target.value)} /></div>
              <div className="input-group"><label>Autor (@instagram)</label><input type="text" value={form.author ?? ''} onChange={e => set('author', e.target.value)} /></div>
              <div className="input-group" style={{ maxWidth: 160 }}><label>Nº de páginas</label><input type="number" min="0" value={form.pages} onChange={e => set('pages', e.target.value)} /></div>
            </div>
            <div className="input-group"><label>Logline</label><input type="text" value={form.logline ?? ''} onChange={e => set('logline', e.target.value)} /></div>
            <div className="input-group"><label>Sinopse</label><textarea rows={5} value={form.synopsis ?? ''} onChange={e => set('synopsis', e.target.value)} /></div>
            <div className="input-group"><label>Quadro do Miro (link, opcional)</label><input type="url" placeholder="https://miro.com/app/board/..." value={form.miro_url ?? ''} onChange={e => set('miro_url', e.target.value)} /></div>
          </div>
        </div>
        <div className="input-group"><label>Gêneros</label><Pills options={GENRES} value={form.genres} onChange={v => set('genres', v)} /></div>
        <div className="input-group" style={{ marginTop: 16 }}><label>Classificação indicativa</label><Pills single options={AGE_RATINGS} value={form.age_rating} onChange={v => set('age_rating', v)} /></div>
        <div className="input-group" style={{ marginTop: 16 }}><label>Justificativas da classificação</label><Pills options={CONTENT_TAGS} value={form.content_tags} onChange={v => set('content_tags', v)} /></div>
      </div>
    </main>
  );
}
