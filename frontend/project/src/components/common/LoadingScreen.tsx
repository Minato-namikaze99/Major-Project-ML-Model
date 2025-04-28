import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col items-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
        <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">Loading</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please wait while we set up Linux Log Guardian</p>
      </div>
    </div>
  );
};

export default LoadingScreen;