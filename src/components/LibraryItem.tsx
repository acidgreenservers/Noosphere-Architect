
import React, { useState, useRef, useEffect } from 'react';
import { LibraryMetadata } from '../types';

interface LibraryItemProps {
  name: string;
  createdAt: string;
  metadata: LibraryMetadata;
  icon?: string;
  onPreview: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onToggleStar?: () => void;
  onTogglePin?: () => void;
  onToggleArchive?: () => void;
  onClick?: () => void;
  isLegacy?: boolean;
  typeLabel?: string;
  isSelected?: boolean;
}

const LibraryItem: React.FC<LibraryItemProps> = ({
  name,
  createdAt,
  metadata,
  icon,
  onPreview,
  onEdit,
  onDelete,
  onToggleStar,
  onTogglePin,
  onToggleArchive,
  onClick,
  isLegacy,
  typeLabel,
  isSelected
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsRevealed(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-all group ${metadata.isPinned ? 'ring-2 ring-blue-500' : ''} ${metadata.isArchived ? 'opacity-60' : ''}`}
    >
      {/* Base Content Layer */}
      <div className="p-4 flex justify-between items-center">
        <div className="flex-grow cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            {metadata.isPinned && <span className="material-icons text-blue-500 text-xs">push_pin</span>}
            {metadata.isStarred && <span className="material-icons text-amber-500 text-xs">star</span>}
            {typeLabel && (
               <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                 {typeLabel}
               </span>
            )}
            {isLegacy && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded">Legacy</span>
            )}
            {metadata.category && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-[10px] font-medium rounded-full">
                {metadata.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {icon && <span className="material-icons text-gray-400 text-lg">{icon}</span>}
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px] sm:max-w-xs">{name}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saved on {new Date(createdAt).toLocaleDateString()}</p>
        </div>

        {/* Selection Indicator & Shutter Trigger Button */}
        {isSelected && (
          <div className="ml-2 mr-1 flex items-center">
            <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg">
              <span className="material-icons text-sm block">check</span>
            </div>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsRevealed(true); }}
          className="ml-2 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center shadow-inner"
          title="Show Actions"
        >
          <span className="material-icons text-xl">tune</span>
        </button>
      </div>

      {/* Slide Reveal Action Tray */}
      <div
        className={`absolute top-0 right-0 h-full w-full bg-blue-50/90 dark:bg-blue-950/90 backdrop-blur-md flex items-center justify-between px-4 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-10 ${
          isRevealed ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ clipPath: isRevealed ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)' }}
      >
        <div className="flex items-center space-x-1 sm:space-x-3 overflow-x-auto no-scrollbar">
          {onToggleStar && (
            <button onClick={(e) => { e.stopPropagation(); onToggleStar(); }} className={`p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors ${metadata.isStarred ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`} title={metadata.isStarred ? 'Unstar' : 'Star'}>
              <span className="material-icons text-2xl">{metadata.isStarred ? 'star' : 'star_outline'}</span>
            </button>
          )}
          {onTogglePin && (
            <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors ${metadata.isPinned ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`} title={metadata.isPinned ? 'Unpin' : 'Pin'}>
              <span className="material-icons text-2xl">push_pin</span>
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-500 hover:text-blue-500 transition-colors" title="Preview">
            <span className="material-icons text-2xl">visibility</span>
          </button>
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-500 hover:text-green-500 transition-colors" title="Edit">
              <span className="material-icons text-2xl">edit</span>
            </button>
          )}
           {onToggleArchive && (
            <button onClick={(e) => { e.stopPropagation(); onToggleArchive(); }} className={`p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors ${metadata.isArchived ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'}`} title={metadata.isArchived ? 'Unarchive' : 'Archive'}>
              <span className="material-icons text-2xl">{metadata.isArchived ? 'unarchive' : 'archive'}</span>
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
            <span className="material-icons text-2xl">delete</span>
          </button>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setIsRevealed(false); }}
          className="p-1.5 bg-white/50 dark:bg-gray-800/50 rounded-full hover:bg-white dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all shadow-sm flex items-center justify-center"
          title="Close Actions"
        >
          <span className="material-icons">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

export default LibraryItem;
