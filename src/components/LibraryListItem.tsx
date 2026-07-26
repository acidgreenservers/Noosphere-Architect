import React from 'react';
import { LibraryMetadata } from '../types';

interface LibraryListItemProps {
  name: string;
  createdAt: string;
  metadata: LibraryMetadata;
  icon?: string;
  onPreview: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onExport?: () => void;
  onToggleStar?: () => void;
  onTogglePin?: () => void;
  onToggleArchive?: () => void;
  onClick?: () => void;
  isLegacy?: boolean;
  typeLabel?: string;
  isSelected?: boolean;
}

const LibraryListItem: React.FC<LibraryListItemProps> = ({
  name,
  createdAt,
  metadata,
  icon,
  onPreview,
  onEdit,
  onDelete,
  onExport,
  onToggleStar,
  onTogglePin,
  onToggleArchive,
  onClick,
  isLegacy,
  typeLabel,
  isSelected
}) => {
  return (
    <div
      onClick={onClick}
      onDoubleClick={(e) => { e.stopPropagation(); onPreview(); }}
      className={`group relative flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer select-none ${
        metadata.isPinned ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'
      } ${metadata.isArchived ? 'opacity-60 bg-gray-50 dark:bg-gray-800/80' : ''}`}
    >
      {/* Selection Checkbox Area */}
      <div className="flex items-center w-8 flex-shrink-0">
        {isSelected ? (
          <div className="bg-blue-600 text-white p-0.5 rounded shadow-sm flex items-center justify-center">
            <span className="material-icons text-sm block">check</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded border border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors"></div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex items-center flex-1 min-w-0 gap-4">
        {icon && (
          <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 flex items-center justify-center w-6">
            <span className="material-icons text-xl">{icon}</span>
          </div>
        )}
        
        <div className="flex flex-col flex-1 min-w-0 justify-center">
          <div className="flex items-center gap-2">
            {metadata.isPinned && <span className="material-icons text-blue-500 text-[14px]" title="Pinned">push_pin</span>}
            {metadata.isStarred && <span className="material-icons text-amber-500 text-[14px]" title="Starred">star</span>}
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm" title={name}>
              {name}
            </span>
          </div>
        </div>

        {/* Chips Area (Type & Category) */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 w-48 justify-start">
          {typeLabel && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 truncate max-w-[90px]" title={typeLabel}>
              {typeLabel}
            </span>
          )}
          {isLegacy && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded" title="Legacy">
              LEGACY
            </span>
          )}
          {metadata.category && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-[10px] font-medium rounded-full truncate max-w-[90px]" title={metadata.category}>
              {metadata.category}
            </span>
          )}
        </div>
      </div>

      {/* Right-Aligned Date & Hover Actions Layer */}
      <div className="relative w-32 flex-shrink-0 h-full flex items-center justify-end">
        {/* Visible Date (Default State) */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2 font-mono tabular-nums transition-opacity duration-200 group-hover:opacity-0">
          {new Date(createdAt).toLocaleDateString()}
        </div>

        {/* Hover Action Bar (Revealed on Hover with Right-to-Left wipe) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 [clip-path:inset(0_0_0_100%)] group-hover:[clip-path:inset(0_0_0_0)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
          <div className="flex items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-md rounded-lg border border-gray-200/60 dark:border-gray-700/60 p-0.5 transform translate-x-4 group-hover:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-max">
            {onToggleStar && (
              <button onClick={(e) => { e.stopPropagation(); onToggleStar(); }} className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${metadata.isStarred ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`} title={metadata.isStarred ? 'Unstar' : 'Star'}>
                <span className="material-icons text-[18px]">{metadata.isStarred ? 'star' : 'star_outline'}</span>
              </button>
            )}
            {onTogglePin && (
              <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${metadata.isPinned ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`} title={metadata.isPinned ? 'Unpin' : 'Pin'}>
                <span className="material-icons text-[18px]">push_pin</span>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500 transition-colors" title="Preview (Double Click)">
              <span className="material-icons text-[18px]">visibility</span>
            </button>
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-green-500 transition-colors" title="Edit">
                <span className="material-icons text-[18px]">edit</span>
              </button>
            )}
            {onExport && (
              <button onClick={(e) => { e.stopPropagation(); onExport(); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500 transition-colors" title="Export">
                <span className="material-icons text-[18px]">file_download</span>
              </button>
            )}
            {onToggleArchive && (
              <button onClick={(e) => { e.stopPropagation(); onToggleArchive(); }} className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${metadata.isArchived ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'}`} title={metadata.isArchived ? 'Unarchive' : 'Archive'}>
                <span className="material-icons text-[18px]">{metadata.isArchived ? 'unarchive' : 'archive'}</span>
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
              <span className="material-icons text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryListItem;
