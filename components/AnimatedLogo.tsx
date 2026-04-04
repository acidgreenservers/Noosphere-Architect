
import React from 'react';

const AnimatedLogo: React.FC = () => {
  return (
    <div className="flex justify-center items-center my-8" aria-label="Noosphere-Architect Animated Logo">
      <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style>
          {`
            @keyframes rotate-clockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes rotate-counter-clockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(-360deg); }
            }
            #gear1 {
              transform-origin: 65px 45px;
              animation: rotate-clockwise 10s linear infinite;
            }
            #gear2 {
              transform-origin: 50px 55px;
              animation: rotate-counter-clockwise 10s linear infinite;
            }
          `}
        </style>
        <path d="M62,90 C42,90 27,75 27,55 C27,35 42,20 62,20 C72,20 82,25 87,35" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M27,55 C22,45 22,35 25,25" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M25,25 C27,15 35,5 47,5" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M87,35 C92,45 90,60 82,70" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M82,70 C75,80 67,87 62,90" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        
        <g id="gear1">
          <path d="M65 38 L 67.5 33 L 72.5 33 L 75 38 L 72.5 43 L 67.5 43 Z" fill="#F59E0B" />
          <path d="M65 52 L 62.5 57 L 57.5 57 L 55 52 L 57.5 47 L 62.5 47 Z" fill="#F59E0B" />
          <circle cx="65" cy="45" r="6" fill="#60A5FA" />
        </g>
        <g id="gear2">
          <path d="M50 48 L 52.5 43 L 57.5 43 L 60 48 L 57.5 53 L 52.5 53 Z" fill="#F59E0B" />
          <path d="M50 62 L 47.5 67 L 42.5 67 L 40 62 L 42.5 57 L 47.5 57 Z" fill="#F59E0B" />
          <circle cx="50" cy="55" r="6" fill="#60A5FA" />
        </g>
      </svg>
    </div>
  );
};

export default AnimatedLogo;
