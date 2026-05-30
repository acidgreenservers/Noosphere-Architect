import React from 'react';
import LibraryItem from './LibraryItem';
import { UnifiedItem } from '../types';

/** Props for the reusable Starred/Pinned bar component.
 *  - `type` determines whether we render starred or pinned items.
 *  - `items` is the full list of UnifiedItem objects.
 *  - `expanded` controls the accordion open state.
 *  - `onToggleExpand` toggles the accordion.
 *  - Callback props forward actions to the parent component.
 */
type StarredPinnedBarProps = {
    type: 'starred' | 'pinned';
    items: UnifiedItem[];
    expanded: boolean;
    onToggleExpand: () => void;
    onToggleStar: (item: UnifiedItem) => void;
    onTogglePin: (item: UnifiedItem) => void;
    onToggleArchive: (item: UnifiedItem) => void;
    onDelete: (item: UnifiedItem) => void;
    onEdit: (item: UnifiedItem) => void;
    onExport?: (item: UnifiedItem) => void;
    onSelect: (id: string) => void;
    selectedIds: Set<string>;
};

/** Consistent UI for the Starred and Pinned sections.
 *  The component mirrors the markup that previously lived inside
 *  ArchitectureOrganization.tsx, but is now isolated so any other
 *  view can import it and get the same look‑and‑feel.
 */
export const StarredPinnedBar: React.FC<StarredPinnedBarProps> = ({
    type,
    items,
    expanded,
    onToggleExpand,
    onToggleStar,
    onTogglePin,
    onToggleArchive,
    onDelete,
    onEdit,
    onExport,
    onSelect,
    selectedIds,
}) => {
    const isStarred = type === 'starred';
    const filtered = items.filter(i => (isStarred ? i.isStarred : i.isPinned) && !i.isArchived);
    const badgeCount = filtered.length;

    const title = isStarred ? 'Starred Items' : 'Pinned Items';
    const icon = isStarred ? 'star' : 'push_pin';
    const iconColor = isStarred ? 'text-amber-500' : 'text-blue-500';
    const gradientFrom = isStarred ? 'from-amber-50' : 'from-blue-50';
    const gradientDark = isStarred ? 'from-amber-900/20' : 'from-blue-900/20';
    const badgeColor = isStarred ? 'bg-amber-500' : 'bg-blue-500';

    return (
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <button
                onClick={onToggleExpand}
                className={`w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r ${gradientFrom} to-transparent dark:${gradientDark} hover:${gradientFrom.replace('from-', 'from-').replace('50', '100')} dark:hover:${gradientDark.replace('900/20', '900/30')} transition-colors`}
            >
                <div className="flex items-center gap-3">
                    <span className={`material-icons ${iconColor}`}>{icon}</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{title}</span>
                    <span className={`px-2 py-0.5 ${badgeColor} text-white text-xs font-bold rounded-full`}>
                        {badgeCount}
                    </span>
                </div>
                <span className={`material-icons text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filtered.map(item => (
                            <div key={item.id} className="relative">
                                <LibraryItem
                                    name={item.name}
                                    createdAt={item.createdAt}
                                    metadata={item}
                                    typeLabel={item.type.replace('prompt-', '')}
                                    onPreview={() => {}}
                                    onDelete={() => onDelete(item)}
                                    onExport={onExport ? () => onExport(item) : undefined}
                                    onToggleStar={() => onToggleStar(item)}
                                    onTogglePin={() => onTogglePin(item)}
                                    onToggleArchive={() => onToggleArchive(item)}
                                    onEdit={() => onEdit(item)}
                                    onClick={() => onSelect(String(item.id))}
                                    isSelected={selectedIds.has(String(item.id))}
                                />
                            </div>
                        ))}
                    </div>
                    {filtered.length === 0 && (
                        <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                            <span className="material-icons text-4xl mb-2">{isStarred ? 'star_outline' : 'push_pin'}</span>
                            <p>No {title.toLowerCase()} yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
