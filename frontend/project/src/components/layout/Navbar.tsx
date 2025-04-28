import { useState, useEffect } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<{ id: number; message: string; isNew: boolean }[]>([]);
  
  // Simulate receiving notifications
  useEffect(() => {
    // Initial notifications
    setNotifications([
      { id: 1, message: 'New anomaly detected in system logs', isNew: true },
      { id: 2, message: 'System update completed successfully', isNew: false },
    ]);
    
    // Simulate new notifications every 30 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.5) { // 50% chance to get a new notification
        const newNotification = {
          id: Date.now(),
          message: `Anomaly detected: Unusual login attempt at ${new Date().toLocaleTimeString()}`,
          isNew: true,
        };
        
        setNotifications(prev => [newNotification, ...prev]);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const [showNotifications, setShowNotifications] = useState(false);
  
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    
    // Mark all as read when opening
    if (!showNotifications) {
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isNew: false }))
      );
    }
  };
  
  const hasNewNotifications = notifications.some(notif => notif.isNew);
  
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
          >
            <Menu size={20} />
          </button>
          <h1 className="ml-2 text-xl font-semibold text-gray-800 dark:text-white lg:hidden">
            Linux Log Guardian
          </h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            >
              <Bell size={18} />
              {hasNewNotifications && (
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500" />
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border-b border-gray-200 px-4 py-3 dark:border-gray-700 ${
                          notification.isNew ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {notification.message}
                        </p>
                        {notification.isNew && (
                          <div className="mt-1 flex items-center">
                            <span className="mr-1 h-2 w-2 rounded-full bg-blue-600" />
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">New</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
                  <button
                    className="w-full text-center text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => setNotifications([])}
                  >
                    Clear all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="flex items-center">
            <div className="mr-2 hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
            </div>
            <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div className="flex h-full w-full items-center justify-center text-sm font-medium uppercase text-gray-700 dark:text-gray-300">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;