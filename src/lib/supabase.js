import { createClient } from '@supabase/supabase-js';

// A chave anon é pública por natureza; a segurança vem das políticas RLS do banco.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://qgufblnxuuvhityracgq.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndWZibG54dXV2aGl0eXJhY2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjE1NDUsImV4cCI6MjEwODQzNzU0NX0.mmVAH3KdaCAXpDgwsO00xCcITBUjzJanXFRCcfbHn_E';

export const supabase = createClient(url, anonKey);
export const BUCKET = 'comic';

// Lança o erro do Supabase em vez de devolvê-lo, para usar com try/catch.
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}

const signedCache = new Map();
export async function signedUrl(path) {
  if (!path) return null;
  const hit = signedCache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  signedCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function safeName(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_');
}

export async function uploadFile(userId, projectId, file, folder = 'arquivos') {
  const path = `${userId}/${projectId}/${folder}/${Date.now()}_${safeName(file.name)}`;
  await q(supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined }));
  return path;
}

export async function removeFiles(paths) {
  const list = paths.filter(Boolean);
  if (list.length) await supabase.storage.from(BUCKET).remove(list);
}
