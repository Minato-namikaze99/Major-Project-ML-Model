import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or API key is missing');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

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
}

// Fetch all anomaly logs
export const fetchLogs = async (): Promise<AnomalyLog[]> => {
  let allLogs: AnomalyLog[] = [];
  let from = 0;
  let to = 999; // First range, 0-999

  while (true) {
    const { data, error, count } = await supabase
      .from('anomaly_logs')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('LineId', { ascending: true });

    if (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allLogs = [...allLogs, ...data]; // Append the new data
    }

    // If we've fetched all available logs, break the loop
    if (allLogs.length >= (count ?? 0)) {
      break;
    }

    // Update the range for the next request
    from = to + 1;
    to = to + 1000; // Next range
  }

  console.log(`Fetched total logs: ${allLogs.length}`);
  return allLogs;
};


// Count total anomaly logs
export const countTotalLogs = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('anomaly_logs')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting logs:', error);
    throw error;
  }
  return count || 0;
};

// Filter anomaly logs in-memory
export const filterLogs = async (
  logType?: string,
  isAnomaly?: boolean,
  searchTerm?: string
): Promise<AnomalyLog[]> => {
  const allLogs = await fetchLogs();
  let filtered = allLogs;

  if (logType) filtered = filtered.filter(l => l.log_type === logType);
  if (isAnomaly !== undefined) filtered = filtered.filter(l => l.anomaly_detected === isAnomaly);
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(l => l.logs.toLowerCase().includes(term));
  }

  return filtered;
};

// Download anomaly logs as CSV
export const downloadLogsAsCSV = (logs: AnomalyLog[]) => {
  const headers = [
    'LineId','logs','ip_address','date','time','log_type',
    'auth_failures_last_1h','time_since_last_failure','is_root_attempt',
    'unique_users_attempted','anomaly_detected'
  ];

  const csvContent = [
    headers.join(','),
    ...logs.map(l => [
      l.LineId,
      `"${l.logs.replace(/"/g, '""')}"`,
      l.ip_address,
      l.date,
      l.time,
      l.log_type,
      l.auth_failures_last_1h,
      l.time_since_last_failure,
      l.is_root_attempt,
      l.unique_users_attempted,
      l.anomaly_detected
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'anomaly_logs.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
