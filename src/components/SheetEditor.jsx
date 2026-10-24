import { Plus, Trash, X } from '@phosphor-icons/react';

// Ficha em seções livres: [{ section, items: [{ label, value }] }]
export default function SheetEditor({ sheet, onChange, hideEmpty }) {
  const update = (si, fn) => onChange(sheet.map((s, i) => (i === si ? fn(s) : s)));
  const setItem = (si, ii, patch) => update(si, s => ({ ...s, items: s.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }));

  return (
    <div>
      {sheet.map((sec, si) => {
        const items = sec.items.map((it, ii) => [it, ii]).filter(([it]) => !hideEmpty || it.value.trim());
        if (hideEmpty && !items.length) return null;
        return (
          <fieldset key={si}>
            <legend>
              <input type="text" className="sheet-label" style={{ color: 'var(--accent)', fontSize: '1.05rem', width: `${Math.max(8, sec.section.length + 2)}ch` }}
                value={sec.section} onChange={e => update(si, s => ({ ...s, section: e.target.value }))} aria-label="Nome da seção" />
              <button type="button" className="icon-btn danger" title="Remover seção"
                onClick={() => confirm(`Remover a seção "${sec.section}"?`) && onChange(sheet.filter((_, i) => i !== si))}><Trash size={16} /></button>
            </legend>
            <div className="grid-2">
              {items.map(([it, ii]) => (
                <div className="input-group" key={ii}>
                  <div className="sheet-item">
                    <input type="text" className="sheet-label" value={it.label} placeholder="Campo" onChange={e => setItem(si, ii, { label: e.target.value })} />
                    <button type="button" className="icon-btn danger" title="Remover campo"
                      onClick={() => update(si, s => ({ ...s, items: s.items.filter((_, j) => j !== ii) }))}><X size={14} /></button>
                  </div>
                  <textarea rows={Math.min(8, Math.max(1, Math.ceil(it.value.length / 45)))} value={it.value}
                    onChange={e => setItem(si, ii, { value: e.target.value })} />
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary" onClick={() => update(si, s => ({ ...s, items: [...s.items, { label: '', value: '' }] }))}>
              <Plus /> Campo
            </button>
          </fieldset>
        );
      })}
      <button type="button" className="btn-secondary" onClick={() => onChange([...sheet, { section: 'Nova seção', items: [{ label: '', value: '' }] }])}>
        <Plus /> Seção
      </button>
    </div>
  );
}
