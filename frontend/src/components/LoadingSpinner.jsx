import React from 'react';

const LoadingSpinner = ({ label }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] w-full p-4">
      <div className="relative flex items-center justify-center">
        {/* Soft glowing background aura */}
        <div className="absolute w-12 h-12 rounded-full bg-indigo-500/20 blur-md animate-pulse"></div>
        {/* Glowing crescent arc spinner matching user screenshot */}
        <div className="glowing-arc-spinner"></div>
      </div>
      {label && (
        <p className="mt-4 text-xs font-semibold tracking-widest text-indigo-400/80 uppercase animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
