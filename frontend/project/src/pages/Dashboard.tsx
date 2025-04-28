// components/dashboard/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AnomalyLog,
  fetchLogs,
  filterLogs,
  downloadLogsAsCSV,
  countTotalLogs
} from '../services/supabase';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BarChart from '../components/dashboard/BarChart';
import PieChart from '../components/dashboard/PieChart';
import LogsTable from '../components/dashboard/LogsTable';
import StatsCounters from '../components/dashboard/StatsCounters';
import Filters from '../components/dashboard/Filters';
import { LogOut, Download, RotateCw, Shield } from 'lucide-react';
// import { useTheme } from '../contexts/ThemeContext';

const Dashboard = () => {
  const { signOut } = useAuth();
  const nav = useNavigate();

  const [logs, setLogs] = useState<AnomalyLog[]>([]);
  const [filteredLogs, setFiltered] = useState<AnomalyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [logType, setLogType] = useState<string|undefined>();
  const [anomStatus, setAnomStatus] = useState<boolean|undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  // const { theme, toggleTheme } = useTheme();

  useEffect(() => { load(); }, []);
  useEffect(() => { applyFilters(); }, [logType, anomStatus, searchTerm]);

  async function load() {
    setLoading(true);
    setRefreshing(true);
    try {
      const all = await fetchLogs();
      console.log('🔍 fetched logs count:', all.length);
      setLogs(all);
      setFiltered(all);
      setTotalCount(await countTotalLogs());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function applyFilters() {
    setLoading(true);
    try {
      const f = await filterLogs(logType, anomStatus, searchTerm);
      setFiltered(f);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => { await signOut(); nav('/login'); };

  const types = Array.from(new Set(logs.map(l => l.log_type)));

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-800 dark:text-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* header */}
          <div className="mb-6 flex flex-col justify-between space-y-4 md:flex-row md:items-center">
            <div className="flex items-center">
              <Shield size={32} className="mr-3 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">Linux Log Guardian</h1>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Monitoring {totalCount.toLocaleString()} system logs</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={load}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <RotateCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => downloadLogsAsCSV(filteredLogs)}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
              >
                <Download size={16} className="mr-2" /><span>Export CSV</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-all shadow-md hover:shadow-lg"
              >
                <LogOut size={16} className="mr-2" /><span>Logout</span>
              </button>
            </div>
          </div>

          <StatsCounters
            logs={filteredLogs}
            totalLogsCount={totalCount}
          />

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl bg-white p-6 shadow-lg transition-shadow hover:shadow-xl dark:bg-gray-800 dark:border dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Event Type Frequency
              </h2>
              <BarChart logs={filteredLogs} />
            </div>
            <div className="overflow-hidden rounded-xl bg-white p-6 shadow-lg transition-shadow hover:shadow-xl dark:bg-gray-800 dark:border dark:border-gray-700">
              <h2 className="mb-4 text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200">
                <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Anomaly Distribution
              </h2>
              <PieChart logs={filteredLogs} />
            </div>
          </div>

          <div className="mb-6 rounded-xl bg-white p-5 shadow-lg dark:bg-gray-800 dark:border dark:border-gray-700">
            <Filters
              eventIds={types}
              onEventIdChange={setLogType}
              onAnomalyChange={setAnomStatus}
              onSearch={setSearchTerm}
              selectedEventId={logType}
              selectedAnomalyStatus={anomStatus}
              searchTerm={searchTerm}
            />
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-lg transition-shadow hover:shadow-xl dark:bg-gray-800 dark:border dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold flex items-center text-gray-800 dark:text-gray-200">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Log Events
              </h2>
            </div>
            <LogsTable
              anomalyLogs={filteredLogs}
              loading={loading}
              error={error}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;