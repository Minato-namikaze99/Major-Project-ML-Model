// components/dashboard/StatsCounters.tsx
import { useEffect, useState } from 'react';
import { AnomalyLog } from '../../services/supabase';
import { ShieldAlert, FileText, Clock, Activity } from 'lucide-react';

interface StatsCountersProps {
  logs: AnomalyLog[];
  totalLogsCount: number;
}

const StatsCounters = ({ logs, totalLogsCount }: StatsCountersProps) => {
  const [counters, setCounters] =
    useState({ total: 0, anomalies: 0, lastTs: '', anomalyRate: 0 });

  useEffect(() => {
    const anomalies = logs.filter(l => l.anomaly_detected).length;
    const last = logs.length
      ? `${logs[logs.length-1].date} ${logs[logs.length-1].time}`
      : 'No logs available';
    const anomalyRate = logs.length ? (anomalies / logs.length) * 100 : 0;

    setCounters({ 
      total: totalLogsCount, 
      anomalies, 
      lastTs: last,
      anomalyRate: parseFloat(anomalyRate.toFixed(2))
    });
  }, [logs, totalLogsCount]);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl bg-white p-5 shadow-lg transition-transform hover:translate-y-1 dark:bg-gray-800 dark:border dark:border-gray-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-bl-full"></div>
        <div className="flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 shadow-inner">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Logs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {counters.total.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          All system logs in database
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-lg transition-transform hover:translate-y-1 dark:bg-gray-800 dark:border dark:border-gray-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-bl-full"></div>
        <div className="flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 shadow-inner">
            <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Anomalies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {counters.anomalies.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Detected anomalous events
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-lg transition-transform hover:translate-y-1 dark:bg-gray-800 dark:border dark:border-gray-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-bl-full"></div>
        <div className="flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40 shadow-inner">
            <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Anomaly Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {counters.anomalyRate}%
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Percentage of anomalous logs
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-lg transition-transform hover:translate-y-1 dark:bg-gray-800 dark:border dark:border-gray-700 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-bl-full"></div>
        <div className="flex items-center">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 shadow-inner">
            <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Log</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {counters.lastTs}
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Most recent log timestamp
        </div>
      </div>
    </div>
  );
};

export default StatsCounters;