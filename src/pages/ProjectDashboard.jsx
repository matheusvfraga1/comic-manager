import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapTrifold, FileText, Brain, BookOpen, PaintBrush, PencilSimple, Paperclip, Image } from '@phosphor-icons/react';
import { useProject } from '../project';
import { supabase } from '../lib/supabase';
import { Back, StorageImg } from '../components/ui';

const count = async (table, projectId, extra = q => q) => {
  const { count } = await extra(supabase.from(table).select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('archived', false));
  return count ?? 0;
};

export default function ProjectDashboard() {
  const { project: p } = useProject();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.all([
      count('characters', p.id),
      count('locations', p.id),
      count('documents', p.id, q => q.in('kind', ['roteiro', 'escaleto', 'beat_sheet', 'sinopse'])),
      count('documents', p.id, q => q.eq('kind', 'lore')),
      count('assets', p.id, q => q.eq('kind', 'page')),
      count('assets', p.id, q => q.eq('kind', 'concept')),
      count('assets', p.id, q => q.in('kind', ['reference', 'attachment'])),
      count('documents', p.id, q => q.in('kind', ['anotacao', 'modelo', 'planilha'])),
    ]).then(([chars, locs, script, lore, pages, concept, refs, notes]) => setCounts({ chars, locs, script, lore, pages, concept, refs, notes }));
  }, [p.id]);

  const modules = [
    ['personagens', Users, 'Personagens', counts.chars],
    ['cenarios', MapTrifold, 'Mapas e cenários', counts.locs],
    ['roteiro', FileText, 'Roteiro', counts.script],
    ['lore', Brain, 'Lore', counts.lore],
    ['paginas', BookOpen, 'Páginas', counts.pages],
    ['artes', PaintBrush, 'Artes conceituais', counts.concept],
    ['referencias', Image, 'Referências e anexos', counts.refs],
    ['anotacoes', Paperclip, 'Anotações e modelos', counts.notes],
  ];

  return (
    <main>
      <Back to="/">Meus projetos</Back>
      <div className="project-header-info">
        <div className="project-cover-large"><StorageImg path={p.cover_path} alt="Capa" fallback={<span>Capa</span>} /></div>
        <div className="project-details" style={{ minWidth: 0 }}>
          <div className="title-row">
            <h2>{p.title}</h2>
            <Link className="icon-btn" to="editar" title="Editar projeto"><PencilSimple /></Link>
          </div>
          {p.production_name && <p><strong>Nome de produção:</strong> {p.production_name}</p>}
          <p><strong>Autor:</strong> {p.author || '—'}</p>
          <p><strong>Páginas:</strong> {p.pages || '—'}</p>
          <p><strong>Gêneros:</strong> {p.genres.length ? p.genres.join(', ') : 'Nenhum'}</p>
          <p><strong>Classificação indicativa:</strong> {p.age_rating}{p.content_tags.length ? ` (${p.content_tags.join(', ')})` : ''}</p>
          {p.logline && <p><strong>Logline:</strong> {p.logline}</p>}
          {p.synopsis && <p className="synopsis">{p.synopsis}</p>}
        </div>
      </div>
      <div className="modules-grid">
        {modules.map(([to, Icon, label, n]) => (
          <Link key={to} className="module-btn" to={to}>
            <Icon /><span>{label}</span><small>{n ?? '…'}</small>
          </Link>
        ))}
      </div>
    </main>
  );
}
