import React, { useState } from 'react';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import { AnomalyLog } from '../../services/supabase';
import { SuspiciousIP, sendWarningEmail } from '../../services/api';

// Extended interface for AnomalyLog to match the properties we're using
interface ExtendedAnomalyLog extends AnomalyLog {
  device_id?: string;
}

interface SuspiciousIPsTableProps {
  logs: ExtendedAnomalyLog[];
  suspiciousIPs?: SuspiciousIP[];
  loading: boolean;
  error: string | null;
}

const SuspiciousIPsTable: React.FC<SuspiciousIPsTableProps> = ({ 
  logs, 
  suspiciousIPs = [], 
  loading, 
  error 
}) => {
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ip: string, status: 'success' | 'error', message: string} | null>(null);

  // Only display IPs from the suspicious_ip array, no fallback
  const displayIPs = suspiciousIPs.map(ip => ({
    ip: ip.ip_addresses,
    deviceId: ip.device_id
  }));

  const handleSendEmail = async (ipAddress: string, deviceId: string) => {
    // Only proceed if we're not already sending to this IP
    if (sendingEmail === ipAddress) return;
    
    setSendingEmail(ipAddress);
    setEmailStatus(null);
    try {
      // Find a log entry for this IP to use in the warning email
      const logForIP = logs.find(log => log.ip_address === ipAddress)?.logs || 
                       `Suspicious activity detected from IP: ${ipAddress}`;
      
      console.log(`Sending warning email for IP: ${ipAddress}, Device ID: ${deviceId}, Log: ${logForIP}`);
      
      // Call the backend API to send the email
      const result = await sendWarningEmail(deviceId, logForIP);
      console.log('Email sent successfully:', result);
      
      setEmailStatus({
        ip: ipAddress,
        status: 'success',
        message: 'Warning email sent successfully'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus({
        ip: ipAddress,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to send email'
      });
    } finally {
      setSendingEmail(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center p-4 bg-gray-900 rounded-lg text-white shadow-lg border border-gray-700">
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin text-blue-400 h-8 w-8" />
          <span className="mt-4 text-lg font-medium">Loading suspicious IPs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center p-8 rounded-lg bg-gray-900 text-white shadow-lg border border-gray-700">
        <AlertCircle className="text-red-400 h-12 w-12" />
        <p className="mt-4 text-lg font-medium">Error loading suspicious IPs</p>
        <p className="mt-2 text-gray-400 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (!displayIPs.length) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center p-8 bg-gray-900 rounded-lg text-white shadow-lg border border-gray-700">
        <AlertCircle className="text-gray-400 h-12 w-12" />
        <p className="mt-4 text-lg font-medium">No suspicious IPs found</p>
        <p className="mt-2 text-gray-400">No suspicious IP addresses have been detected</p>
      </div>
    );
  }

  return (
    <div className="p-5 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200 mb-4">
        <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
        Suspicious IP Addresses
      </h2>
      
      {/* Show email status message if exists */}
      {emailStatus && (
        <div className={`mb-4 p-3 rounded-lg text-white ${emailStatus.status === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <p className="text-sm font-medium">
            {emailStatus.status === 'success' ? '✓ ' : '✗ '}
            {emailStatus.message}
          </p>
        </div>
      )}
      
      <div className="relative overflow-hidden rounded-lg border border-gray-700 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                  Device ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-800">
              {displayIPs.map(ip => (
                <tr key={ip.ip} className="hover:bg-gray-800">
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300 font-mono">
                    {ip.ip}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300">
                    {ip.deviceId}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <button
                      onClick={() => handleSendEmail(ip.ip, ip.deviceId)}
                      disabled={sendingEmail === ip.ip}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {sendingEmail === ip.ip ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (
                        <>
                          <Mail className="-ml-1 mr-2 h-4 w-4" />
                          Send Warning Email
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuspiciousIPsTable;