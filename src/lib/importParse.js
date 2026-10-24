// Conversões usadas na importação: HTML (Google Docs / .docx) -> Markdown -> ficha estruturada.

export function htmlToMarkdown(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.querySelector('.doc-content') ?? doc.body;
  root.querySelectorAll('script,style').forEach(el => el.remove());
  const out = [];
  root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,table').forEach(el => {
    if (el.tagName !== 'TABLE' && el.closest('table')) return;
    if (el.tagName === 'TABLE') {
      out.push([...el.rows].map(r => '| ' + [...r.cells].map(c => cellText(c)).join(' | ') + ' |').join('\n'));
      return;
    }
    const text = el.textContent.trim();
    if (!text) return;
    if (/^H\d$/.test(el.tagName)) out.push('#'.repeat(+el.tagName[1]) + ' ' + text);
    else if (el.tagName === 'LI') out.push('- ' + text);
    else out.push(text);
  });
  return out.join('\n\n');
}

const cellText = c => c.textContent.trim().replace(/\s*\n\s*/g, ' / ').replace(/\|/g, '/');

export function csvToMarkdown(csv) {
  const rows = parseCsv(csv).filter(r => r.some(c => c.trim()));
  if (!rows.length) return '';
  const width = Math.max(...rows.map(r => r.length));
  const line = r => '| ' + Array.from({ length: width }, (_, i) => (r[i] ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ') + ' |';
  return [line(rows[0]), '|' + ' --- |'.repeat(width), ...rows.slice(1).map(line)].join('\n');
}

function parseCsv(text) {
  const rows = [[]];
  let cur = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { rows.at(-1).push(cur); cur = ''; }
    else if (ch === '\n') { rows.at(-1).push(cur); cur = ''; rows.push([]); }
    else if (ch !== '\r') cur += ch;
  }
  rows.at(-1).push(cur);
  return rows;
}

const isHeading = line =>
  /^#{1,6}\s/.test(line) ||
  (line.length <= 60 && /^[A-ZÀ-Ý0-9 /&().-]{4,}:?$/.test(line) && /[A-ZÀ-Ý]{3}/.test(line));

// Primeiro ":" fora de parênteses ("Apelido (ex.: quem criou?): Não" -> rótulo inteiro)
const topLevelColon = text => {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ':' && depth === 0) return i;
  }
  return -1;
};

const splitLabel = text => {
  const i = topLevelColon(text);
  if (i > 0 && i < 160) return { label: text.slice(0, i).trim(), value: text.slice(i + 1).trim() };
  const q = text.indexOf('?');
  if (q > 0) return { label: text.slice(0, q + 1).trim(), value: text.slice(q + 1).trim() };
  return null;
};

// Transforma o Markdown de uma ficha em { sheet, notes }.
// Tabelas viram campos (rótulo/valor); o texto corrido vai para as anotações.
export function markdownToSheet(md) {
  const sheet = [];
  const notes = [];
  let current = null;
  const sectionOf = name => {
    current = { section: name, items: [] };
    sheet.push(current);
    return current;
  };
  const add = item => (current ?? sectionOf('Ficha')).items.push(item);

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim()).filter(Boolean);
      if (!cells.length) continue;
      if (cells.length === 1 && !splitLabel(cells[0]) && cells[0].length <= 60) { sectionOf(cells[0]); continue; }
      const anyLabeled = cells.some(c => splitLabel(c));
      if (!anyLabeled) {
        for (let i = 0; i < cells.length; i += 2) add({ label: cells[i], value: cells[i + 1] ?? '' });
        continue;
      }
      for (const c of cells) add(splitLabel(c) ?? { label: c, value: '' });
      continue;
    }
    if (isHeading(line)) {
      const name = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      sectionOf(name.charAt(0) + name.slice(1).toLowerCase());
      notes.push(line.startsWith('#') ? line : '## ' + name);
      continue;
    }
    notes.push(line);
  }
  const filled = sheet.filter(s => s.items.length);
  // Sem nenhuma tabela, a ficha inteira fica como texto (formato livre).
  if (!filled.length) return { sheet: [], notes: md };
  const notesText = notes.filter((l, i) => !(l.startsWith('#') && (i === notes.length - 1 || notes[i + 1].startsWith('#')))).join('\n\n');
  return { sheet: filled, notes: notesText };
}

export function sectionBetween(md, heading) {
  const start = md.indexOf(heading);
  if (start < 0) return '';
  const rest = md.slice(start + heading.length);
  const end = rest.search(/\n#{1,3} /);
  return (end < 0 ? rest : rest.slice(0, end)).trim();
}
