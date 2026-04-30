import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lagwjkblzmgxavvgwvkl.supabase.co'
const supabaseKey = 'sb_publishable_N5b-9sfOS5ivwCYlgRV-5w__nlZNikp'

export const supabase = createClient(supabaseUrl, supabaseKey)