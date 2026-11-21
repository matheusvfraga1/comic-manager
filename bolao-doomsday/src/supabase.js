import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://gxfhwbnhbikcprznhpfs.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_YF76jruOk8pYs1jyvz4oBA_v0zZeJ0q'
export const configured = Boolean(url && key)
export const supabase = configured ? createClient(url, key) : null
