// Importação única da HQ "A Maldição da Casa Silverman" (só no modo de desenvolvimento).
// Fontes: public/_import (gerado por scripts/prepare-import.mjs a partir do Drive local)
// e a tabela import_staging (textos dos Google Docs/Planilhas).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, q, BUCKET, safeName } from '../lib/supabase';
import { useUser } from '../auth';
import { htmlToMarkdown, markdownToSheet, csvToMarkdown, sectionBetween } from '../lib/importParse';
import { ErrorBanner } from '../components/ui';

const TITLE = 'A Maldição da Casa Silverman';

const DOCS = [
  // [nome no staging, tipo, título, arquivado]
  ['roteiro.md', 'roteiro', 'Roteiro', false],
  ['beat_sheet.md', 'beat_sheet', 'Beat sheet', true],
  ['loglines.md', 'sinopse', 'Loglines', true],
  ['roteiro_backup.md', 'roteiro', 'Roteiro (cópia de segurança)', true],
  ['lore.md', 'lore', 'Lore - A Maldição da Casa Silverman', false],
  ['leis_magia.md', 'lore', 'Leis da Magia', false],
  ['recinko.md', 'modelo', 'RECINKO - Modelo de roteiro', false],
  ['ficha_padrao.md', 'modelo', 'Ficha padrão de personagem', false],
  ['planejamento_silverlandia.csv', 'planilha', 'Planejamento Silverlândia', true],
  ['naming.csv', 'planilha', 'Naming', true],
  ['espiral_frank.csv', 'planilha', 'Espiral do tempo - Frank', true],
];

const GDOC_CHARACTERS = [
  ['adam.md', 'Adam', 'Protagonista'],
  ['ygritte.md', 'Ygritte', 'Protagonista'],
];

export default function Import() {
  const user = useUser();
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const say = msg => setLog(l => [...l, msg]);

  async function run() {
    setBusy(true); setError(null); setLog([]);
    try {
      const existing = await q(supabase.from('projects').select('id').eq('title', TITLE));
      if (existing.length && !confirm('O projeto já foi importado. Apagar a versão importada e importar de novo?')) { setBusy(false); return; }
      for (const p of existing) {
        const files = await supabase.storage.from(BUCKET).list(`${user.id}/${p.id}/import`, { limit: 1000 });
        await supabase.storage.from(BUCKET).remove((files.data ?? []).map(f => `${user.id}/${p.id}/import/${f.name}`));
        await q(supabase.from('projects').delete().eq('id', p.id));
        say('Versão anterior apagada.');
      }

      const staged = Object.fromEntries((await q(supabase.from('import_staging').select('name,body'))).map(r => [r.name, r.body]));
      if (!staged['roteiro.md']) throw new Error('Os textos dos Google Docs não estão no import_staging.');
      const manifest = await (await fetch(import.meta.env.BASE_URL + '_import/manifest.json')).json();
      say(`${Object.keys(staged).length} textos do Google Docs e ${manifest.length} arquivos do Drive encontrados.`);

      const roteiro = staged['roteiro.md'];
      const project = await q(supabase.from('projects').insert({
        title: TITLE,
        production_name: 'House of Mystery #01',
        author: 'Matheus Vargas',
        logline: staged['loglines.md']?.split('\n').find(l => l.trim())?.trim() ?? null,
        synopsis: sectionBetween(roteiro, '## Segunda Sinopse') || sectionBetween(roteiro, '## Primeira Sinopse') || null,
        genres: ['Terror', 'Sobrenatural', 'Mistério', 'Juvenil', 'Fantasia sombria'],
      }).select().single());
      say('Projeto criado.');

      const base = `${user.id}/${project.id}/import`;
      const upload = async item => {
        const blob = await (await fetch(import.meta.env.BASE_URL + '_import/files/' + item.file)).blob();
        const path = `${base}/${safeName(item.file)}`;
        await q(supabase.storage.from(BUCKET).upload(path, blob, { contentType: item.mime, upsert: true }));
        return path;
      };

      let pos = 0;
      for (const [name, kind, title, archived] of DOCS) {
        const body = staged[name];
        if (!body?.trim()) { say(`(vazio, ignorado) ${title}`); continue; }
        const content = name.endsWith('.csv') ? csvToMarkdown(body) : body;
        await q(supabase.from('documents').insert({ project_id: project.id, kind, title, content, archived, source: 'Google Drive', position: pos++ }));
        say(`Documento: ${title}`);
      }
      if (!staged['escaleto.md']?.trim()) say('(o Doc "4. ESCALETO" está vazio no Drive, não foi importado)');

      for (const [name, charName, role] of GDOC_CHARACTERS) {
        const { sheet, notes } = markdownToSheet(staged[name] ?? '');
        await q(supabase.from('characters').insert({ project_id: project.id, name: charName, role, sheet, notes, position: pos++ }));
        say(`Personagem: ${charName} (${sheet.reduce((n, s) => n + s.items.length, 0)} campos)`);
      }

      for (const item of manifest) {
        const path = await upload(item);
        if (item.type === 'cover') {
          await q(supabase.from('projects').update({ cover_path: path }).eq('id', project.id));
          say('Capa enviada.');
          continue;
        }
        if (item.type === 'character' || item.type === 'location') {
          const table = item.type === 'character' ? 'characters' : 'locations';
          const { sheet, notes } = markdownToSheet(htmlToMarkdown(item.html));
          const row = await q(supabase.from(table).insert({
            project_id: project.id, name: item.name, sheet, notes, archived: !!item.archived, position: pos++,
            ...(item.name === 'Frank' ? { role: 'Antagonista' } : {}),
          }).select('id').single());
          await q(supabase.from('assets').insert({
            project_id: project.id, kind: 'attachment', title: item.title, storage_path: path, mime_type: item.mime, size_bytes: item.size,
            archived: !!item.archived, [item.type === 'character' ? 'character_id' : 'location_id']: row.id,
          }));
          say(`${item.type === 'character' ? 'Personagem' : 'Cenário'}: ${item.name}${item.archived ? ' (arquivado)' : ''}`);
          continue;
        }
        if (item.type === 'document') {
          await q(supabase.from('documents').insert({ project_id: project.id, kind: item.kind, title: item.title, content: htmlToMarkdown(item.html), archived: !!item.archived, source: item.source }));
          await q(supabase.from('assets').insert({ project_id: project.id, kind: 'attachment', title: item.title, storage_path: path, mime_type: item.mime, size_bytes: item.size, archived: !!item.archived }));
          say(`Documento: ${item.title}`);
          continue;
        }
        await q(supabase.from('assets').insert({
          project_id: project.id, kind: item.type, title: item.title, storage_path: path,
          mime_type: item.mime, size_bytes: item.size, archived: !!item.archived, caption: `Origem: ${item.source}`,
        }));
        say(`Arquivo (${item.type}): ${item.title}`);
      }

      say('Concluído.');
      setDone(project.id);
    } catch (e) { setError(e); say('ERRO: ' + (e.message ?? e)); }
    setBusy(false);
  }

  async function clearStaging() {
    if (!confirm('Apagar os textos temporários da importação no banco?')) return;
    const { error } = await supabase.from('import_staging').delete().neq('name', '');
    if (error) setError(error); else say('Textos temporários apagados.');
  }

  return (
    <main>
      <h2>Importar HQ: {TITLE}</h2>
      <p className="muted" style={{ margin: '8px 0 20px' }}>Cria o projeto com roteiro, lore, personagens, cenários, capa, artes e referências vindos do Google Drive.</p>
      <ErrorBanner error={error} />
      <div className="actions" style={{ marginBottom: 20 }}>
        <button className="btn-primary" onClick={run} disabled={busy}>{busy ? 'Importando…' : 'Importar agora'}</button>
        {done && <Link className="btn-secondary" to={`/p/${done}`}>Abrir projeto</Link>}
        {done && <button className="btn-danger" onClick={clearStaging}>Apagar textos temporários</button>}
      </div>
      {log.length > 0 && <div className="log">{log.join('\n')}</div>}
    </main>
  );
}
