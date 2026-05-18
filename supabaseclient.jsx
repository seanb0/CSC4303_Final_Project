import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function createMockClient() {
	const api = {
		select: async () => ({ data: [], error: null }),
		eq() { return this },
		limit() { return this },
		single: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
	}
	return { from: () => api }
}

let supabase
if (!supabaseUrl || !supabaseAnonKey) {
	// Avoid throwing during module import when env vars are missing.
	// Components will receive an inert client returning empty results.
	// Helpful during local dev when VITE_* vars aren't set.
	// eslint-disable-next-line no-console
	console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set — using mock supabase client')
	supabase = createMockClient()
} else {
	supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
