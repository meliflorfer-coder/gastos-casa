import { createClient } from '@supabase/supabase-js'

// Server-only client using service role key — never expose to browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)
