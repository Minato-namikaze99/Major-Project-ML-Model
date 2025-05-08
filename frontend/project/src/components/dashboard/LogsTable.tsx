import React, { useState, useMemo } from 'react';
import { AlertCircle, Loader2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { AnomalyLog } from '../../services/supabase';

interface LogsTableProps {
  anomalyLogs: AnomalyLog[];
  loading: boolean;
  error: string | null;
}

function parseLogLine(line: string) {
  const regex = /^(\w+\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(.+?):\s+(.+)$/;
  const m = regex.exec(line);
  if (!m) return { time: '', component: '', content: line };
  return { time: m[1], component: m[2], content: m[3] };
}

const LogsTable: React.FC<LogsTableProps> = ({ anomalyLogs, loading, error }) => {
  const [page, setPage] = useState(1);
  const [hoveredLog, setHoveredLog] = useState<AnomalyLog | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const perPage = 15;

  const sorted = useMemo(
    () => [...anomalyLogs].sort((a, b) => a.LineId - b.LineId),
    [anomalyLogs]
  );

  const totalPages = Math.ceil(sorted.length / perPage);
  const pageSlice = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSendEmail = async (logId: number) => {
    setSendingEmail(logId);
    try {
      // TODO: Implement email sending functionality
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      console.log(`Sending warning email for log ID: ${logId}`);
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSendingEmail(null);
    }
  };

  // Empty state
  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center p-4 bg-gray-900 rounded-lg text-white shadow-lg">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-400 h-8 w-8" />
          <span className="mt-4 text-lg font-medium">Loading logs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center p-8 rounded-lg bg-gray-900 text-white shadow-lg">
        <AlertCircle className="text-red-400 h-12 w-12" />
        <p className="mt-4 text-lg font-medium">Error loading logs</p>
        <p className="mt-2 text-gray-400 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center p-8 bg-gray-900 rounded-lg text-white shadow-lg">
        <AlertCircle className="text-gray-400 h-12 w-12" />
        <p className="mt-4 text-lg font-medium">No log data available</p>
        <p className="mt-2 text-gray-400">No logs have been found for this query</p>
      </div>
    );
  }

  // Main table render
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border border-gray-700 shadow-lg">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800 sticky top-0 z-10">
              <tr>
                {['Line ID', 'Time', 'Component', 'Content', 'Device ID', 'Status', 'Actions'].map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {pageSlice.map(log => {
                const { time, component, content } = parseLogLine(log.logs);
                const isAnomaly = log.anomaly_detected;

                return (
                  <tr 
                    key={log.LineId}
                    onMouseEnter={() => setHoveredLog(log)}
                    onMouseLeave={() => setHoveredLog(null)}
                    className={`relative transition-colors hover:bg-gray-800 cursor-pointer ${isAnomaly ? 'bg-red-900/10' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm whitespace-nowrap">{log.LineId}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300">{time}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-800 rounded-md text-gray-300">{component}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">{content}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300">-</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      {isAnomaly ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-red-900/30 text-red-400">
                          <AlertTriangle className="w-4 h-4 mr-1.5" />Anomaly
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-green-900/30 text-green-400">
                          <CheckCircle className="w-4 h-4 mr-1.5" />Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <button
                        onClick={() => handleSendEmail(log.LineId)}
                        disabled={!isAnomaly || sendingEmail === log.LineId}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingEmail === log.LineId ? (
                          <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="-ml-1 mr-2 h-4 w-4" />
                            Send Warning Email
                          </>
                        )}
                      </button>
                    </td>

                    {/* Tooltip/popup */}
                    {hoveredLog === log && (
                      <div className="absolute z-20 right-8 top-0 mt-12 w-72 transform transition-all">
                        <div className="bg-gray-800 border border-gray-700 text-white p-4 rounded-lg shadow-xl text-sm">
                          <div className="font-semibold mb-2 text-gray-300">Log Details</div>
                          <div className="grid grid-cols-2 gap-1">
                            <div className="text-gray-400">IP:</div>
                            <div className="text-white">{log.ip_address}</div>
                            
                            <div className="text-gray-400">Date:</div>
                            <div className="text-white">{log.date}</div>
                            
                            <div className="text-gray-400">Time:</div>
                            <div className="text-white">{log.time}</div>
                            
                            <div className="text-gray-400">Log Type:</div>
                            <div className="text-white">{log.log_type}</div>
                            
                            <div className="text-gray-400">Auth Failures (1h):</div>
                            <div className="text-white">{log.auth_failures_last_1h}</div>
                            
                            <div className="text-gray-400">Since Last Failure:</div>
                            <div className="text-white">{log.time_since_last_failure}s</div>
                            
                            <div className="text-gray-400">Root Attempt:</div>
                            <div className={log.is_root_attempt ? 'text-red-400' : 'text-green-400'}>
                              {log.is_root_attempt ? 'Yes' : 'No'}
                            </div>
                            
                            <div className="text-gray-400">Unique Users:</div>
                            <div className="text-white">{log.unique_users_attempted}</div>
                            
                            <div className="text-gray-400">Anomaly:</div>
                            <div className={log.anomaly_detected ? 'text-red-400' : 'text-green-400'}>
                              {log.anomaly_detected ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md bg-gray-900 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md bg-gray-900 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  Showing <span className="font-medium">{(page - 1) * perPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * perPage, sorted.length)}</span> of{' '}
                  <span className="font-medium">{sorted.length}</span> results
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-md border border-gray-700 bg-gray-900 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">First</span>
                  <ChevronLeft className="h-4 w-4" />|
                </button>
                
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-md border border-gray-700 bg-gray-900 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {/* Page number indicator */}
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-700 bg-gray-800 text-sm font-medium text-gray-300">
                  {page} / {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-md border border-gray-700 bg-gray-900 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-md border border-gray-700 bg-gray-900 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Last</span>
                  |<ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTable;