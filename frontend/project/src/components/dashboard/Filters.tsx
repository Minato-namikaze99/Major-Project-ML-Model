import { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface FiltersProps {
  eventIds: string[];
  onEventIdChange: (eventId: string | undefined) => void;
  onAnomalyChange: (isAnomaly: boolean | undefined) => void;
  onSearch: (term: string) => void;
  selectedEventId?: string;
  selectedAnomalyStatus?: boolean;
  searchTerm: string;
}

const Filters = ({
  eventIds,
  onEventIdChange,
  onAnomalyChange,
  onSearch,
  selectedEventId,
  selectedAnomalyStatus,
  searchTerm,
}: FiltersProps) => {
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Handle search with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchInput);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [searchInput, onSearch]);
  
  const handleClearFilters = () => {
    onEventIdChange(undefined);
    onAnomalyChange(undefined);
    setSearchInput('');
    onSearch('');
  };
  
  const isFiltersActive = selectedEventId !== undefined || 
                         selectedAnomalyStatus !== undefined || 
                         searchTerm !== '';
  
  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Logs</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search logs..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 sm:w-64"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <X size={14} className="text-gray-400 hover:text-gray-500" />
              </button>
            )}
          </div>
          
          {/* Filters Toggle Button */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors 
              ${isFiltersOpen
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            <Filter size={16} className="mr-1" />
            Filters
            {isFiltersActive && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                {(selectedEventId ? 1 : 0) + (selectedAnomalyStatus !== undefined ? 1 : 0)}
              </span>
            )}
          </button>
          
          {/* Clear Filters */}
          {isFiltersActive && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <X size={16} className="mr-1" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded Filters */}
      {isFiltersOpen && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Event ID Filter */}
            <div>
              <label htmlFor="event-id" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Event ID
              </label>
              <select
                id="event-id"
                value={selectedEventId || ''}
                onChange={(e) => onEventIdChange(e.target.value || undefined)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500"
              >
                <option value="">All Event IDs</option>
                {eventIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Anomaly Filter */}
            <div>
              <label htmlFor="anomaly-status" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Anomaly Status
              </label>
              <select
                id="anomaly-status"
                value={selectedAnomalyStatus === undefined ? '' : selectedAnomalyStatus.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    onAnomalyChange(undefined);
                  } else {
                    onAnomalyChange(value === 'true');
                  }
                }}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="false">Normal</option>
                <option value="true">Anomalous</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Filters;