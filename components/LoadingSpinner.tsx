
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center my-12 text-center">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 dark:border-blue-400 rounded-full animate-spin"></div>
      </div>
      <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
        {message || "Architecting your assets..."}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        This may take a moment.
      </p>
    </div>
  );
};

export default LoadingSpinner;
