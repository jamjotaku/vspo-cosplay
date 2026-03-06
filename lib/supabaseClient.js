// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// 監督のSupabaseプロジェクトから取得したURLとAnon Keyを入れてください
const supabaseUrl = 'https://wvobplspyjdywkocpdnb.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_2xzF9yobx08PdKLGK8uncA_MheDuWZ9'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
