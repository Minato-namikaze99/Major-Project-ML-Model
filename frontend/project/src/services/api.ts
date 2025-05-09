import { AnomalyLog } from './supabase';

export interface BackendLog {
  logs: string;
  ip_address: string;
  log_date: string;
  log_time: string;
  log_type: string;
  anomaly_detected: string; // "Yes" or "No"
  device_id: string;
}

export interface SuspiciousIP {
  ip_addresses: string;
  device_id: string;
}

export async function fetchAdminLogsSummary(admin_id: string, device_id?: string) {
  const params = new URLSearchParams();
  params.append('admin_id', admin_id);
  if (device_id) params.append('device_id', device_id);
  
  // Use relative path that will be proxied by Vite
  const res = await fetch(`/admin/logs_summary?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json() as Promise<{ logs: BackendLog[]; suspicious_ip: SuspiciousIP[] }>;
}

export async function sendWarningEmail(deviceId: string, logLine: string) {
  // Convert parameters to URL search params (query parameters)
  const params = new URLSearchParams();
  params.append('device_id', deviceId);
  params.append('log_line', logLine);
  
  const response = await fetch(`/send_warning?${params.toString()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to send warning email');
  }
  
  return response.json();
}

// Download logs as CSV file
export function downloadLogsAsCSV(logs: AnomalyLog[]) {
  const headers = [
    'LineId','logs','ip_address','date','time','log_type',
    'auth_failures_last_1h','time_since_last_failure','is_root_attempt',
    'unique_users_attempted','anomaly_detected','device_id'
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
      l.anomaly_detected,
      l.device_id || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'logs.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 