import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeSlash, Trash, BookOpen } from '@phosphor-icons/react';
import { supabase, q, uploadFile, removeFiles } from '../lib/supabase';
import { STAGES } from '../lib/templates';
import { useUser } from '../auth';
import { useProject } from '../project';
import { Back, Dropzone, ErrorBanner, Modal, ModalHeader, Spinner, StorageImg } from '../components/ui';

const stageLabel = id => STAGES.find(s => s.id === id)?.label ?? id;
const bestStage = layers => [...STAGES].reverse().find(s => layers[s.id])?.id;

export default function Pages() {
  const { project } = useProject();
  const user = useUser();
  const [rows, setRows] = useState(null);
  const [stage, setStage] = useState('lapis');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() =>
    q(supabase.from('assets').select('*').eq('project_id', project.id).eq('kind', 'page').order('page_number'))
      .then(setRows).catch(setError), [project.id]);
  useEffect(() => { load(); }, [load]);

  // { [page_number]: { [stage]: asset } }
  const pages = useMemo(() => {
    const map = {};
    for (const a of rows ?? []) (map[a.page_number] ??= {})[a.stage] = a;
    return Object.entries(map).map(([n, layers]) => ({ n: +n, layers })).sort((a, b) => a.n - b.n);
  }, [rows]);

  async function upload(files) {
    setBusy(true); setError(null);
    try {
      let next = (pages.at(-1)?.n ?? 0) + 1;
      // Ordena pelo nome para que "pag_01, pag_02..." entrem na sequência certa.
      for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
        const num = +(file.name.match(/(\d+)(?!.*\d)/)?.[1] ?? next++);
        const old = rows.find(r => r.page_number === num && r.stage === stage);
        const path = await uploadFile(user.id, project.id, file, 'paginas');
        if (old) {
          await q(supabase.from('assets').update({ storage_path: path, size_bytes: file.size, mime_type: file.type }).eq('id', old.id));
          await removeFiles([old.storage_path]);
        } else {
          await q(supabase.from('assets').insert({
            project_id: project.id, kind: 'page', stage, page_number: num, title: `Página ${String(num).padStart(2, '0')}`,
            storage_path: path, mime_type: file.type, size_bytes: file.size,
          }));
        }
      }
      await load();
    } catch (e) { setError(e); }
    setBusy(false);
  }

  return (
    <main>
      <Back to={`/p/${project.id}`}>{project.title}</Back>
      <div className="page-header">
        <h2>Páginas da HQ</h2>
        <span className="muted small">{pages.length} página(s)</span>
      </div>
      <ErrorBanner error={error} />
      {!rows && <Spinner />}
      {rows && !pages.length && <div className="empty-state" style={{ marginBottom: 20 }}><BookOpen size={40} /><p>Nenhuma página enviada ainda.</p></div>}
      <div className="projects-grid" style={{ marginBottom: 28 }}>
        {pages.map(p => {
          const top = bestStage(p.layers);
          return (
            <div key={p.n} className="project-card" onClick={() => setOpen(p.n)}>
              <div className="project-thumb"><StorageImg path={p.layers[top]?.storage_path} alt={`Página ${p.n}`} /></div>
              <div className="project-info" style={{ textAlign: 'center' }}>
                <h3>Página {String(p.n).padStart(2, '0')}</h3>
                <p>{STAGES.filter(s => p.layers[s.id]).map(s => s.label).join(' • ')}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="panel">
        <div className="input-group">
          <label>Enviar páginas no estágio</label>
          <div className="pill-container">
            {STAGES.map(s => <button key={s.id} type="button" className={'pill' + (stage === s.id ? ' active' : '')} onClick={() => setStage(s.id)}>{s.label}</button>)}
          </div>
        </div>
        <Dropzone onFiles={upload} busy={busy} accept="image/*"
          label={`Arraste as páginas (${stageLabel(stage)}). O número da página vem do nome do arquivo, ex.: pag_07.png`} />
      </div>
      {open != null && <PageModal page={pages.find(p => p.n === open)} onClose={() => setOpen(null)} onChanged={load} />}
    </main>
  );
}

function PageModal({ page, onClose, onChanged }) {
  const [visible, setVisible] = useState(() => ({ [bestStage(page?.layers ?? {})]: true }));
  if (!page) return null;
  const layers = STAGES.filter(s => page.layers[s.id]);

  async function removeLayer(a) {
    if (!confirm(`Apagar o estágio ${stageLabel(a.stage)} da página ${page.n}?`)) return;
    await removeFiles([a.storage_path]);
    await supabase.from('assets').delete().eq('id', a.id);
    await onChanged();
    if (layers.length === 1) onClose();
  }

  return (
    <Modal onClose={onClose} className="page-editor-layout">
      <div className="page-canvas">
        <div className="stack">
          {layers.filter(s => visible[s.id]).map((s, i) => (
            <StorageImg key={s.id} path={page.layers[s.id].storage_path} alt={s.label} style={{ opacity: i === 0 ? 1 : 0.6 }} />
          ))}
        </div>
      </div>
      <div className="page-layers">
        <ModalHeader title={`Página ${String(page.n).padStart(2, '0')}`} onClose={onClose} />
        <h3 className="muted small" style={{ textTransform: 'uppercase', marginBottom: 12 }}>Estágios / camadas</h3>
        {STAGES.map(s => {
          const a = page.layers[s.id];
          return (
            <div key={s.id} className={'layer-pill' + (visible[s.id] ? ' active' : '') + (a ? '' : ' empty')}
              onClick={() => a && setVisible(v => ({ ...v, [s.id]: !v[s.id] }))}>
              <div className="layer-thumb" style={{ background: s.color }} />
              <span style={{ flex: 1 }}>{s.label}{a ? '' : ' (vazio)'}</span>
              {a && (visible[s.id] ? <Eye /> : <EyeSlash />)}
              {a && <button className="icon-btn danger" onClick={e => { e.stopPropagation(); removeLayer(a); }}><Trash size={16} /></button>}
            </div>
          );
        })}
        <p className="muted small" style={{ marginTop: 12 }}>Clique nos estágios para sobrepor as camadas e comparar.</p>
      </div>
    </Modal>
  );
}
