import { Activity, BarChart2, Cpu, Database, HardDrive, Home, Settings, Shield, Users } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar = () => {
  const { theme } = useTheme();

  const navigation = [
    { name: 'Dashboard', icon: Home, current: true },
    // { name: 'System Logs', icon: Activity, current: false },
    // { name: 'Analytics', icon: BarChart2, current: false },
    // { name: 'Security', icon: Shield, current: false },
    // { name: 'Resources', icon: Cpu, current: false },
    // { name: 'Storage', icon: Database, current: false },
    // { name: 'Devices', icon: HardDrive, current: false },
    // { name: 'Users', icon: Users, current: false },
    // { name: 'Settings', icon: Settings, current: false },
    // Add other nav items here as needed
  ];

  return (
    // Make the sidebar a flex column so the footer is pushed to the bottom
    // Added pb-4 to the main container to push the footer down slightly
    <div className="hidden w-64 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:flex pb-4">
      {/* Sidebar Header */}
      <div className="flex h-14 flex-shrink-0 items-center border-b border-gray-200 px-4 dark:border-gray-700">
        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">Linux Log Guardian</span>
      </div>

      {/* Navigation */}
      {/* Added mb-4 to create space above the footer */}
      <nav className="mt-5 flex-1 overflow-y-auto px-2 mb-4">
        <div className="space-y-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href="#"
              className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                item.current
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  item.current
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300'
                }`}
              />
              {item.name}
            </a>
          ))}
        </div>
      </nav>

      {/* Sidebar Footer */}
      {/* mt-auto keeps it at the bottom relative to the flex container */}
      <div className="mt-auto flex-shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center">
          <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            System Status
          </div>
          <div className="ml-auto flex h-3 w-3 items-center">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
            </span>
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">All systems operational</div>
      </div>
    </div>
  );
};

export default Sidebar;
