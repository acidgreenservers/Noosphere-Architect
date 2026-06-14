import React from 'react';
import { SeedGraphData } from '../types';

interface CircularSignalGraphProps {
  data: SeedGraphData;
}

const CircularSignalGraph: React.FC<CircularSignalGraphProps> = ({ data }) => {
  const { recurringTheme, semanticSignals, gradient, tightness } = data;

  // SVG parameters
  const size = 300;
  const strokeWidth = 25;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Colors based on metrics
  const getTightnessColor = (val: number) => {
    if (val >= 8) return '#22c55e'; // Green-500
    if (val >= 5) return '#eab308'; // Yellow-500
    return '#ef4444'; // Red-500
  };

  const getGradientColor = (val: 'Jagged' | 'Smooth') => {
    return val === 'Smooth' ? '#3b82f6' : '#f97316'; // Blue-500 : Orange-500
  };

  // Divide circle into 4 segments
  const segmentGap = 2; // Degrees
  const segmentLength = (circumference / 4) - (segmentGap * (circumference / 360));

  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Recurring Theme Segment */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#a855f7" // Purple-500
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={0}
            className="transition-all duration-1000 ease-out"
          />
          {/* Semantic Signals Segment */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#06b6d4" // Cyan-500
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-(segmentLength + (segmentGap * (circumference / 360)))}
            className="transition-all duration-1000 ease-out"
          />
          {/* Language Curvature Gradient Segment */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={getGradientColor(gradient)}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-(2 * (segmentLength + (segmentGap * (circumference / 360))))}
            className="transition-all duration-1000 ease-out"
          />
          {/* Curvature Tightness Segment */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={getTightnessColor(tightness)}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={-(3 * (segmentLength + (segmentGap * (circumference / 360))))}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Labels */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Topology Tightness</span>
            <span className="text-5xl font-black text-gray-900 dark:text-gray-100">{tightness}<span className="text-2xl text-gray-400">/10</span></span>
            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${gradient === 'Smooth' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                {gradient} Gradient
            </div>
        </div>
      </div>

      {/* Legend / Detail Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="flex flex-col border-l-4 border-purple-500 pl-3">
            <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Recurring Theme</span>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">{recurringTheme}</p>
        </div>
        <div className="flex flex-col border-l-4 border-cyan-500 pl-3">
            <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Semantic Signals</span>
            <p className="text-xs text-gray-700 dark:text-gray-300">{semanticSignals}</p>
        </div>
      </div>
    </div>
  );
};

export default CircularSignalGraph;
