import { useCallback, useEffect, useState } from 'react';
import { Outlet, useOutletContext, useParams } from 'react-router-dom';
import { supabase, q } from './lib/supabase';
import { ErrorBanner, Spinner } from './components/ui';

// Carrega o projeto e a lista de personagens/cenários (usada nas menções com @).
export function ProjectLayout() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [entities, setEntities] = useState([]);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [p, chars, locs] = await Promise.all([
        q(supabase.from('projects').select('*').eq('id', projectId).single()),
        q(supabase.from('characters').select('id,name,archived').eq('project_id', projectId)),
        q(supabase.from('locations').select('id,name,archived').eq('project_id', projectId)),
      ]);
      setProject(p);
      setEntities([
        ...chars.map(c => ({ ...c, type: 'personagens' })),
        ...locs.map(l => ({ ...l, type: 'cenarios' })),
      ]);
    } catch (e) { setError(e); }
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  if (error) return <main><ErrorBanner error={error} /></main>;
  if (!project) return <Spinner />;
  return <Outlet context={{ project, entities, reload }} />;
}

export const useProject = () => useOutletContext();
