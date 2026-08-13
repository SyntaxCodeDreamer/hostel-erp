import React from 'react';

const LoadingSpinner = ({ label }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full p-4">
      <div className="relative flex items-center justify-center">
        {/* Soft background glowing aura */}
        <div className="absolute w-20 h-10 rounded-full bg-indigo-500/20 blur-md animate-pulse"></div>

        {/* 3 Bouncing Glowing Dots */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/60 animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/60 animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/60 animate-bounce"></div>
        </div>
      </div>
      {label && (
        <p className="mt-5 text-xs font-bold tracking-widest text-indigo-400/90 uppercase animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
