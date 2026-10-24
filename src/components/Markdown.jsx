import { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, MapTrifold } from '@phosphor-icons/react';

export const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Troca "@Nome" por um link para a ficha, quando o nome existe no projeto.
function linkMentions(md, entities, projectId) {
  const names = entities.filter(e => e.name).sort((a, b) => b.name.length - a.name.length);
  if (!names.length) return md;
  const re = new RegExp('@(' + names.map(e => escapeRe(e.name)).join('|') + ')', 'g');
  return md.replace(re, (m, name) => {
    const e = names.find(n => n.name === name);
    return `[@${name}](#/p/${projectId}/${e.type}/${e.id})`;
  });
}

const textOf = children => (Array.isArray(children) ? children.map(textOf).join('') : typeof children === 'string' ? children : children?.props ? textOf(children.props.children) : '');

const heading = Tag => ({ children }) => <Tag id={slugify(textOf(children))}>{children}</Tag>;

export function Markdown({ text, entities = [], projectId }) {
  const md = useMemo(() => linkMentions(text ?? '', entities, projectId), [text, entities, projectId]);
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        h1: heading('h1'), h2: heading('h2'), h3: heading('h3'), h4: heading('h4'),
        a: ({ href, children }) => href?.startsWith('#/')
          ? <a className="mention" href={href}>{children}</a>
          : <a href={href} target="_blank" rel="noreferrer">{children}</a>,
      }}>{md}</ReactMarkdown>
    </div>
  );
}

export function outlineOf(md) {
  return [...(md ?? '').matchAll(/^(#{1,3})\s+(.+)$/gm)].map(m => ({ level: m[1].length, text: m[2].trim(), id: slugify(m[2].trim()) }));
}

export function Outline({ text }) {
  const items = useMemo(() => outlineOf(text), [text]);
  if (!items.length) return null;
  return (
    <nav className="doc-outline">
      {items.map((h, i) => (
        <a key={i} className={'l' + h.level} title={h.text}
          onClick={e => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); }} href="#">{h.text}</a>
      ))}
    </nav>
  );
}

// Textarea com autocompletar de @personagem / @cenário.
export function MentionTextarea({ value, onChange, entities, className, ...rest }) {
  const ref = useRef(null);
  const [menu, setMenu] = useState(null); // { start, query }
  const [sel, setSel] = useState(0);

  const matches = menu
    ? entities.filter(e => !e.archived && e.name.toLowerCase().includes(menu.query.toLowerCase())).slice(0, 8)
    : [];

  function detect(text, caret) {
    const before = text.slice(0, caret);
    const at = before.lastIndexOf('@');
    if (at < 0 || (at > 0 && /\w/.test(before[at - 1]))) return setMenu(null);
    const query = before.slice(at + 1);
    if (query.length > 30 || /\n/.test(query)) return setMenu(null);
    setMenu({ start: at, query });
    setSel(0);
  }

  function pick(e) {
    const ta = ref.current;
    const caret = ta.selectionStart;
    const next = value.slice(0, menu.start) + '@' + e.name + ' ' + value.slice(caret);
    onChange(next);
    setMenu(null);
    const pos = menu.start + e.name.length + 2;
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(pos, pos); });
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea ref={ref} className={className} value={value} {...rest}
        onChange={e => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
        onKeyDown={e => {
          if (!menu || !matches.length) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % matches.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + matches.length) % matches.length); }
          else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[sel]); }
          else if (e.key === 'Escape') setMenu(null);
        }}
        onBlur={() => setTimeout(() => setMenu(null), 150)}
      />
      {menu && matches.length > 0 && (
        <div className="mention-menu" style={{ top: 8, right: 8 }}>
          {matches.map((e, i) => (
            <button type="button" key={e.id} className={i === sel ? 'sel' : ''} onMouseDown={ev => { ev.preventDefault(); pick(e); }}>
              {e.type === 'personagens' ? <User /> : <MapTrifold />} {e.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
