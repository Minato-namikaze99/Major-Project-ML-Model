import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or API key is missing');
}

// Keep the Supabase client for other possible authentication uses
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Keep the interface for component compatibility
export interface AnomalyLog {
  LineId: number;
  logs: string;
  ip_address: string;
  date: string;
  time: string;
  log_type: string;
  auth_failures_last_1h: number;
  time_since_last_failure: number;
  is_root_attempt: boolean;
  unique_users_attempted: number;
  anomaly_detected: boolean;
  device_id?: string;
}

// All direct Supabase fetching functions have been removed since we now use the backend API
