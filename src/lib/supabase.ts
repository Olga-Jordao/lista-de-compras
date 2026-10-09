import { createClient } from '@supabase/supabase-js'

// Endereço e chave pública do projeto "Lista de Compras" no Supabase. A chave
// pública pode estar no código: os dados estão protegidos pelas regras da base de
// dados, que só deixam cada pessoa ver os seus registos.
const URL_SUPABASE = 'https://hqriuqulxvqqwtapiqed.supabase.co'
const CHAVE_PUBLICA = 'sb_publishable_W6s5ZVmcYUIWUWX1qFEksg_ePn4_SFT'

export const supabase = createClient(URL_SUPABASE, CHAVE_PUBLICA, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
