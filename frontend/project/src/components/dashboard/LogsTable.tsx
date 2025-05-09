import React, { useState, useMemo } from 'react';
import { AlertCircle, Loader2, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Mail, X } from 'lucide-react';
import { AnomalyLog } from '../../services/supabase';
import { sendWarningEmail } from '../../services/api';

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
  const [selectedLog, setSelectedLog] = useState<AnomalyLog | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const [emailStatus, setEmailStatus] = useState<{id: number, status: 'success' | 'error', message: string} | null>(null);
  const perPage = 15;

  const sorted = useMemo(
    () => [...anomalyLogs].sort((a, b) => a.LineId - b.LineId),
    [anomalyLogs]
  );

  const totalPages = Math.ceil(sorted.length / perPage);
  const pageSlice = sorted.slice((page - 1) * perPage, page * perPage);

  const handleSelectLog = (log: AnomalyLog) => {
    // Toggle selection - if already selected, deselect it
    setSelectedLog(prev => prev?.LineId === log.LineId ? null : log);
  };

  const handleCloseDetails = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setSelectedLog(null);
  };

  const handleSendEmail = async (logId: number, log: AnomalyLog) => {
    if (!log.device_id) {
      setEmailStatus({
        id: logId,
        status: 'error',
        message: 'Cannot send email: Missing device ID'
      });
      return;
    }

    setSendingEmail(logId);
    setEmailStatus(null);
    
    try {
      console.log(`Sending warning email for log ID: ${logId}, Device ID: ${log.device_id}, Log: ${log.logs}`);
      const result = await sendWarningEmail(log.device_id, log.logs);
      console.log('Email sent successfully:', result);
      
      setEmailStatus({
        id: logId,
        status: 'success',
        message: 'Warning email sent successfully'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus({
        id: logId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to send email'
      });
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
      {emailStatus && (
        <div className={`mb-4 p-3 rounded-lg text-white ${emailStatus.status === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <p className="text-sm font-medium">
            {emailStatus.status === 'success' ? '✓ ' : '✗ '}
            {emailStatus.message}
          </p>
        </div>
      )}
    
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
                const isSelected = selectedLog?.LineId === log.LineId;

                return (
                  <tr 
                    key={log.LineId}
                    onClick={() => handleSelectLog(log)}
                    className={`relative transition-colors hover:bg-gray-800 cursor-pointer ${isAnomaly ? 'bg-red-900/10' : ''} ${isSelected ? 'bg-blue-900/20 ring-1 ring-blue-500' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm whitespace-nowrap">{log.LineId}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300">{time}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-800 rounded-md text-gray-300">{component}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-md truncate">{content}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300">{log.device_id || '-'}</td>
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
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleSendEmail(log.LineId, log);
                        }}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Details popup */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-gray-800 border border-gray-700 text-white p-6 rounded-lg shadow-xl max-w-xl w-full m-4 relative">
              <button 
                onClick={handleCloseDetails}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 text-blue-400">Log Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-gray-400 font-medium">Log ID:</div>
                <div className="text-white">{selectedLog.LineId}</div>
                
                <div className="text-gray-400 font-medium">IP Address:</div>
                <div className="text-white font-mono">{selectedLog.ip_address}</div>
                
                <div className="text-gray-400 font-medium">Date:</div>
                <div className="text-white">{selectedLog.date}</div>
                
                <div className="text-gray-400 font-medium">Time:</div>
                <div className="text-white">{selectedLog.time}</div>
                
                <div className="text-gray-400 font-medium">Log Type:</div>
                <div className="text-white">{selectedLog.log_type}</div>
                
                <div className="text-gray-400 font-medium">Auth Failures (1h):</div>
                <div className="text-white">{selectedLog.auth_failures_last_1h}</div>
                
                <div className="text-gray-400 font-medium">Time Since Last Failure:</div>
                <div className="text-white">{selectedLog.time_since_last_failure}s</div>
                
                <div className="text-gray-400 font-medium">Root Attempt:</div>
                <div className={selectedLog.is_root_attempt ? 'text-red-400' : 'text-green-400'}>
                  {selectedLog.is_root_attempt ? 'Yes' : 'No'}
                </div>
                
                <div className="text-gray-400 font-medium">Unique Users Attempted:</div>
                <div className="text-white">{selectedLog.unique_users_attempted}</div>
                
                <div className="text-gray-400 font-medium">Anomaly Detected:</div>
                <div className={selectedLog.anomaly_detected ? 'text-red-400' : 'text-green-400'}>
                  {selectedLog.anomaly_detected ? 'Yes' : 'No'}
                </div>
                
                <div className="text-gray-400 font-medium col-span-2">Log Content:</div>
                <div className="col-span-2 bg-gray-900 p-3 rounded font-mono text-sm text-gray-300 break-all">
                  {selectedLog.logs}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleCloseDetails}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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