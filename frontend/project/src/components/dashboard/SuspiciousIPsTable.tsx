import React, { useState } from 'react';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import { AnomalyLog } from '../../services/supabase';

// Extended interface for AnomalyLog to match the properties we're using
interface ExtendedAnomalyLog extends AnomalyLog {
  device_id?: string;
}

interface SuspiciousIPsTableProps {
  logs: ExtendedAnomalyLog[];
  loading: boolean;
  error: string | null;
}

const SuspiciousIPsTable: React.FC<SuspiciousIPsTableProps> = ({ logs, loading, error }) => {
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  // Get unique suspicious IPs with just the essential information
  const suspiciousIPs = Array.from(
    logs.filter(log => log.anomaly_detected && log.ip_address && log.ip_address.trim() !== '')
      .reduce((acc, log) => {
        if (!acc.has(log.ip_address)) {
          acc.set(log.ip_address, {
            ip: log.ip_address,
            deviceId: log.device_id || '-'
          });
        }
        return acc;
      }, new Map<string, { ip: string; deviceId: string }>())
  ).map(([_, value]) => value);

  const handleSendEmail = async (ipAddress: string) => {
    // Only proceed if we're not already sending to this IP
    if (sendingEmail === ipAddress) return;
    
    setSendingEmail(ipAddress);
    try {
      // TODO: Implement email sending functionality
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
      console.log(`Sending warning email for IP: ${ipAddress}`);
    } catch (error) {
      console.error('Error sending email:', error);
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

  if (!suspiciousIPs.length) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center p-8 bg-gray-900 rounded-lg text-white shadow-lg border border-gray-700">
        <AlertCircle className="text-gray-400 h-12 w-12" />
        <p className="mt-4 text-lg font-medium">No suspicious IPs found</p>
        <p className="mt-2 text-gray-400">No suspicious IP addresses have been detected</p>
      </div>
    );
  }

  return (
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
            {suspiciousIPs.map(ip => (
              <tr key={ip.ip} className="hover:bg-gray-800">
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300 font-mono">
                  {ip.ip}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-300">
                  {ip.deviceId}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <button
                    onClick={() => handleSendEmail(ip.ip)}
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
  );
};

export default SuspiciousIPsTable;