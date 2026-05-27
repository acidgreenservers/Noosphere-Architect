
import React from 'react';
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
  typeLabel
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:shadow-lg transition-all group ${metadata.isPinned ? 'ring-2 ring-blue-500' : ''} ${metadata.isArchived ? 'opacity-60' : ''}`}>
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
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-md">{name}</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saved on {new Date(createdAt).toLocaleDateString()}</p>
      </div>

      <div className="flex items-center space-x-1">
        {onToggleStar && (
          <button onClick={(e) => { e.stopPropagation(); onToggleStar(); }} className={`p-1.5 transition-colors ${metadata.isStarred ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`} title={metadata.isStarred ? 'Unstar' : 'Star'}>
            <span className="material-icons text-xl">{metadata.isStarred ? 'star' : 'star_outline'}</span>
          </button>
        )}
        {onTogglePin && (
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} className={`p-1.5 transition-colors ${metadata.isPinned ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`} title={metadata.isPinned ? 'Unpin' : 'Pin'}>
            <span className="material-icons text-xl">{metadata.isPinned ? 'push_pin' : 'push_pin'}</span>
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors" title="Preview">
          <span className="material-icons text-xl">visibility</span>
        </button>
        {onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-gray-500 hover:text-green-500 transition-colors" title="Edit">
            <span className="material-icons text-xl">edit</span>
          </button>
        )}
         {onToggleArchive && (
          <button onClick={(e) => { e.stopPropagation(); onToggleArchive(); }} className={`p-1.5 transition-colors ${metadata.isArchived ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'}`} title={metadata.isArchived ? 'Unarchive' : 'Archive'}>
            <span className="material-icons text-xl">{metadata.isArchived ? 'unarchive' : 'archive'}</span>
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
          <span className="material-icons text-xl">delete</span>
        </button>
      </div>
    </div>
  );
};

export default LibraryItem;
