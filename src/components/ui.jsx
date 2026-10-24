import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Warning, X, UploadSimple } from '@phosphor-icons/react';
import { signedUrl } from '../lib/supabase';

export const Spinner = () => <div className="spinner" />;

export function Back({ to, children = 'Voltar' }) {
  return <Link className="btn-back" to={to}><ArrowLeft /> {children}</Link>;
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return <div className="banner error"><Warning /><span>{error.message ?? String(error)}</span></div>;
}

export function Modal({ onClose, children, className = 'modal-content', style }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={className} style={style}>{children}</div>
    </div>
  );
}

export function ModalHeader({ title, onClose, children }) {
  return (
    <div className="modal-header">
      <h2>{title}</h2>
      <div className="actions">{children}<button className="icon-btn" onClick={onClose} aria-label="Fechar"><X /></button></div>
    </div>
  );
}

export function useSignedUrl(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    signedUrl(path).then(u => alive && setUrl(u));
    return () => { alive = false; };
  }, [path]);
  return url;
}

export function StorageImg({ path, alt = '', fallback = null, ...rest }) {
  const url = useSignedUrl(path);
  if (!path) return fallback;
  if (!url) return null;
  return <img src={url} alt={alt} loading="lazy" {...rest} />;
}

export function Dropzone({ onFiles, accept, multiple = true, label = 'Arraste arquivos aqui ou clique para enviar', busy }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <label
      className={'drag-drop-zone' + (over ? ' over' : '')}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (!busy) onFiles([...e.dataTransfer.files]); }}
    >
      <UploadSimple />
      <p>{busy ? 'Enviando…' : label}</p>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} disabled={busy}
        onChange={e => { onFiles([...e.target.files]); e.target.value = ''; }} />
    </label>
  );
}

export function ArchivedToggle({ value, onChange, count }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />
      Mostrar arquivados{count ? ` (${count})` : ''}
    </label>
  );
}

export function Pills({ options, value, onChange, single = false }) {
  const toggle = opt => {
    if (single) return onChange(opt);
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  return (
    <div className="pill-container">
      {options.map(opt => {
        const active = single ? value === opt : value.includes(opt);
        return <button type="button" key={opt} className={'pill' + (active ? ' active' : '')} onClick={() => toggle(opt)}>{opt}</button>;
      })}
    </div>
  );
}

export function formatBytes(n) {
  if (!n) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}
