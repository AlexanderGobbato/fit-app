import { createClient } from '@supabase/supabase-js'

// Estas chaves virão do arquivo .env.local que você configurará depois
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'adicione-sua-url-aqui'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'adicione-sua-chave-aqui'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente silencioso para criar contas de alunos sem sobrescrever a sessão do professor logado
export const supabaseSilentAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'supabase-silent-key',
    persistSession: false,
    autoRefreshToken: false
  }
})
