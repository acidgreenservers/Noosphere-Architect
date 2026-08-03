import React, { useState, useEffect, useCallback } from 'react';
import {
    SavedAgent, SavedPrompt, SavedProject, SavedMindSeed, SavedSignal, SavedSynthesis,
    LibraryMetadata, UnifiedItem, ExportFormat
} from '../types';
import * as db from '../services/dbService';
import LibraryItem from './LibraryItem';
import LibraryListItem from './LibraryListItem';
import PreviewModal from './PreviewModal';
import ExportPopover from './ExportPopover';
import BatchExportPopover from './BatchExportPopover';
import SynthesisWorkspace from './SynthesisWorkspace';
import Modal from './Modal';
import Toast from './Toast';
import { getPreviewContent, getExportFilename, buildExport, triggerDownload } from '../utils/export';
import { getDeepSearchText } from '../utils/search';

type SortField = 'createdAt' | 'name' | 'type';
type SortDirection = 'asc' | 'desc';

const TYPE_LABELS: Record<UnifiedItem['type'], string> = {
    'agent': 'Agents',
    'prompt-standard': 'Standard Prompts',
    'prompt-system': 'Skills',
    'project': 'Projects',
    'mindseed': 'MindSeeds',
    'signal': 'Signals',
    'synthesis': 'Syntheses',
    'roadmap': 'Roadmaps',
    'agentJob': 'Agent Jobs',
    'legacy-prompt': 'Legacy Prompts',
    'seed-architect': 'Seed Analyses',
    'compressed-signal': 'Compressed Signals'
};

const TYPE_ICONS: Record<UnifiedItem['type'], string> = {
    'agent': 'smart_toy',
    'prompt-standard': 'description',
    'prompt-system': 'psychology',
    'project': 'folder',
    'mindseed': 'spa',
    'signal': 'signal_cellular_alt',
    'synthesis': 'auto_fix_high',
    'roadmap': 'map',
    'agentJob': 'assignment_ind',
    'legacy-prompt': 'history',
    'seed-architect': 'auto_awesome',
    'compressed-signal': 'compress'
};

const ArchitectureOrganization: React.FC = () => {
    const [items, setItems] = useState<UnifiedItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all_types');
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSynthesisMode, setIsSynthesisMode] = useState(false);
    const [previewItem, setPreviewItem] = useState<UnifiedItem | null>(null);
    const [exportItem, setExportItem] = useState<UnifiedItem | null>(null);
    const [batchExportOpen, setBatchExportOpen] = useState(false);
    const [editItem, setEditItem] = useState<UnifiedItem | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<UnifiedItem | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editName, setEditName] = useState('');
    const [bulkCategoryInput, setBulkCategoryInput] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const loadAllData = useCallback(async () => {
        const unified = await db.getAllUnifiedItems();
        setItems(unified);
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const allCategories = Array.from(new Set(items.map(i => i.category).filter(c => c && c.trim()))).sort();

    const handleToggleMetadata = async (item: UnifiedItem, field: keyof LibraryMetadata) => {
        const newValue = !item[field as keyof UnifiedItem];
        await db.updateUnifiedItemMetadata(item, { [field]: newValue });
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: newValue, original: { ...i.original, [field]: newValue } } : i));
        if (previewItem?.id === item.id) setPreviewItem({ ...item, [field]: newValue, original: { ...item.original, [field]: newValue } });
    };

    const handleUpdateCategory = async (item: UnifiedItem, category: string) => {
        await db.updateUnifiedItemMetadata(item, { category });
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, category, original: { ...i.original, category } } : i));
        if (previewItem?.id === item.id) setPreviewItem({ ...item, category, original: { ...item.original, category } });
    };

    const handleOpenEdit = (item: UnifiedItem) => {
        setEditItem(item);
        setEditName(item.name);
        const content = getPreviewContent(item);
        setEditContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
    };

    const handleSaveEdit = async () => {
        if (!editItem) return;
        const o = editItem.original;
        let updatedOriginal = { ...o, name: editName };

        if (editItem.type === 'mindseed') {
            updatedOriginal.result = { ...o.result, seed: editName };
        } else if (editItem.type === 'project') {
            try {
                updatedOriginal.files = JSON.parse(editContent);
            } catch {
                setToast({ message: 'Invalid JSON for multi-file project', type: 'error' });
                return;
            }
        } else if (editItem.type === 'signal') {
            updatedOriginal.promptSignal = editContent.split('\n\n')[0];
        } else if (editItem.type === 'synthesis') {
            updatedOriginal.content = editContent;
        } else if (editItem.type === 'roadmap') {
            updatedOriginal.generatedTask = editContent;
        } else if (editItem.type === 'seed-architect') {
            updatedOriginal.result = { ...o.result, explanation: editContent };
        } else if (o.prompt !== undefined) {
            updatedOriginal.prompt = editContent;
        } else if (o.files) {
            try {
                updatedOriginal.files = JSON.parse(editContent);
            } catch {
                setToast({ message: 'Invalid JSON for multi-file bundle', type: 'error' });
                return;
            }
        }

        // Use individual update functions as they already handle encryption
        switch (editItem.type) {
            case 'agent': await db.updateAgent(updatedOriginal); break;
            case 'legacy-prompt': await db.updatePrompt(updatedOriginal); break;
            case 'prompt-standard': await db.updateTypedPrompt('standard', updatedOriginal); break;
            case 'prompt-system': await db.updateTypedPrompt('system', updatedOriginal); break;
            case 'project': await db.updateProject(updatedOriginal); break;
            case 'mindseed': await db.updateMindSeed(updatedOriginal); break;
            case 'signal': await db.updateSignal(updatedOriginal); break;
            case 'synthesis': await db.updateSynthesis(updatedOriginal); break;
            case 'roadmap': await db.updateRoadmap(updatedOriginal); break;
            case 'agentJob': await db.updateAgentJob(updatedOriginal); break;
            case 'seed-architect': await db.updateSeed(updatedOriginal); break;
        }

        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: editName, original: updatedOriginal } : i));
        setEditItem(null);
        setToast({ message: 'Item updated', type: 'success' });
    };

    const handleDelete = (item: UnifiedItem) => {
        setDeleteTarget(item);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        await db.deleteUnifiedItem(deleteTarget);
        setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
        setToast({ message: 'Item deleted', type: 'success' });
        setPreviewItem(null);
        setIsDeleteConfirmOpen(false);
        setDeleteTarget(null);
    };

    const sidebarCount = (filterId: string): number => {
        return items.filter(i => {
            const isTypeFilter = Object.keys(TYPE_LABELS).includes(filterId) || filterId === 'all_types';
            const isItemArchived = i.isArchived === true || String(i.isArchived) === 'true';
            
            if (isTypeFilter) {
                if (activeCategory === 'archived' && !isItemArchived) return false;
                if (activeCategory === 'starred' && !i.isStarred) return false;
                if (activeCategory === 'pinned' && !i.isPinned) return false;
                if (!['all', 'starred', 'pinned', 'archived'].includes(activeCategory) && i.category !== activeCategory) return false;
                
                if (filterId !== 'all_types' && i.type !== filterId) return false;
                return true;
            }
            
            if (activeTypeFilter !== 'all_types' && i.type !== activeTypeFilter) return false;
            
            if (filterId === 'archived') return isItemArchived;
            
            if (filterId === 'all') return true;
            if (filterId === 'starred') return i.isStarred;
            if (filterId === 'pinned') return i.isPinned;
            
            return i.category === filterId;
        }).length;
    };

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkArchive = async () => {
        const selectedItems = items.filter(i => selectedIds.has(String(i.id)));
        for (const item of selectedItems) {
            await handleToggleMetadata(item, 'isArchived');
        }
        setSelectedIds(new Set());
    };

    const handleBulkCategory = async () => {
        if (!bulkCategoryInput.trim()) {
            setToast({ message: 'Enter a category name', type: 'error' });
            return;
        }
        const selectedItems = items.filter(i => selectedIds.has(String(i.id)));
        for (const item of selectedItems) {
            await db.updateUnifiedItemMetadata(item, { category: bulkCategoryInput.trim() });
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: bulkCategoryInput.trim(), original: { ...i.original, category: bulkCategoryInput.trim() } } : i));
        }
        setBulkCategoryInput('');
        setSelectedIds(new Set());
        setToast({ message: `Assigned "${bulkCategoryInput.trim()}" to ${selectedItems.length} items`, type: 'success' });
    };

    const getSortValue = (item: UnifiedItem): string | number => {
        switch (sortField) {
            case 'name': return item.name.toLowerCase();
            case 'type': return item.type;
            case 'createdAt':
            default: return new Date(item.createdAt).getTime();
        }
    };

    const filteredAndSortedItems = items
        .filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  getDeepSearchText(item.original).includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            const isItemArchived = item.isArchived === true || String(item.isArchived) === 'true';

            if (activeCategory === 'archived' && !isItemArchived) return false;

            if (activeCategory === 'starred' && !item.isStarred) return false;
            if (activeCategory === 'pinned' && !item.isPinned) return false;

            if (!['all', 'starred', 'pinned', 'archived'].includes(activeCategory)) {
                if (item.category !== activeCategory) return false;
            }

            if (activeTypeFilter !== 'all_types') {
                if (item.type !== activeTypeFilter) return false;
            }

            return true;
        })
        .sort((a, b) => {
            const aVal = getSortValue(a);
            const bVal = getSortValue(b);
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortDirection === 'asc' ? cmp : -cmp;
        });


    const cycleSortDirection = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const handleSortFieldChange = (field: SortField) => {
        if (sortField === field) {
            cycleSortDirection();
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // ── Render ──────────────────────────────────────────────────────

    return (
        <div className="max-w-6xl mx-auto flex flex-col flex-1 min-h-0">
            {/* ── Top header ── */}
            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Architecture Organization</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage, categorize, and steward your synthesized wisdom.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
                        <span className="material-icons text-gray-400 text-sm">sort</span>
                        {(['createdAt', 'name', 'type'] as SortField[]).map(field => (
                            <button
                                key={field}
                                onClick={() => handleSortFieldChange(field)}
                                className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                                    sortField === field
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                {field === 'createdAt' ? 'Date' : field === 'name' ? 'Name' : 'Type'}
                            </button>
                        ))}
                        <button
                            onClick={cycleSortDirection}
                            className="ml-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            <span className="material-icons text-sm">
                                {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                            </span>
                        </button>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title="List View"
                        >
                            <span className="material-icons text-sm">view_list</span>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title="Grid View"
                        >
                            <span className="material-icons text-sm">grid_view</span>
                        </button>
                    </div>

                    <div className="relative w-full md:w-72">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* ── Filter Ribbon ── */}
            <div className="mb-8 flex flex-col md:flex-row items-start md:items-center gap-4">
                {/* View Pills */}
                <div className="flex bg-gray-100 dark:bg-gray-800/50 rounded-xl p-1 shadow-inner overflow-x-auto custom-scrollbar">
                    {['all', 'starred', 'pinned', 'archived'].map(view => (
                        <button
                            key={view}
                            onClick={() => setActiveCategory(view)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeCategory === view ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            <span className="capitalize">{view === 'all' ? 'All Items' : view}</span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Type Filter */}
                    <div className="relative">
                        <select
                            value={activeTypeFilter}
                            onChange={(e) => setActiveTypeFilter(e.target.value)}
                            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-10 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                            <option value="all_types">All Types</option>
                            {Object.entries(TYPE_LABELS).map(([id, label]) => (
                                <option key={id} value={id}>{label}</option>
                            ))}
                        </select>
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
                            {activeTypeFilter === 'all_types' ? 'category' : TYPE_ICONS[activeTypeFilter as UnifiedItem['type']]}
                        </span>
                        <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                    </div>

                    {/* Category Filter */}
                    {allCategories.length > 0 && (
                        <div className="relative">
                            <select
                                value={['all', 'starred', 'pinned', 'archived'].includes(activeCategory) ? 'all_categories' : activeCategory}
                                onChange={(e) => {
                                    if (e.target.value === 'all_categories') {
                                        setActiveCategory('all');
                                    } else {
                                        setActiveCategory(e.target.value);
                                    }
                                }}
                                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-10 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                            >
                                <option value="all_categories">All Categories</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">folder</span>
                            <span className="material-icons absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">expand_more</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main Grid Area ── */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <div className="mb-4 flex flex-col gap-3 px-1">
                    {/* Active Filters Bar */}
                    {(activeTypeFilter !== 'all_types' || (!['all', 'starred', 'pinned', 'archived'].includes(activeCategory)) || searchTerm) && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Active Filters:</span>
                            
                            {searchTerm && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-700 transition-all">
                                    <span className="material-icons text-[14px] text-gray-400">search</span>
                                    "{searchTerm}"
                                    <button onClick={() => setSearchTerm('')} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none">
                                        <span className="material-icons text-[14px] block">close</span>
                                    </button>
                                </div>
                            )}

                            {activeTypeFilter !== 'all_types' && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-100 dark:border-blue-800/50 transition-all">
                                    <span className="material-icons text-[14px]">{TYPE_ICONS[activeTypeFilter as UnifiedItem['type']] || 'category'}</span>
                                    {TYPE_LABELS[activeTypeFilter as UnifiedItem['type']] || activeTypeFilter}
                                    <button onClick={() => setActiveTypeFilter('all_types')} className="ml-1 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 focus:outline-none">
                                        <span className="material-icons text-[14px] block">close</span>
                                    </button>
                                </div>
                            )}

                            {(!['all', 'starred', 'pinned', 'archived'].includes(activeCategory)) && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium border border-purple-100 dark:border-purple-800/50 transition-all">
                                    <span className="material-icons text-[14px]">folder</span>
                                    <span className="capitalize">{activeCategory}</span>
                                    <button onClick={() => setActiveCategory('all')} className="ml-1 text-purple-400 hover:text-purple-600 dark:hover:text-purple-200 focus:outline-none">
                                        <span className="material-icons text-[14px] block">close</span>
                                    </button>
                                </div>
                            )}
                            
                            <button 
                                onClick={() => { setActiveTypeFilter('all_types'); setActiveCategory('all'); setSearchTerm(''); }}
                                className="ml-2 text-xs font-bold text-red-500 hover:text-red-700 hover:underline transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                            
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {filteredAndSortedItems.length} item{filteredAndSortedItems.length !== 1 ? 's' : ''} found
                            </div>
                        </div>
                        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-1"}>
                            {filteredAndSortedItems.map(item => (
                                <div key={item.id} className="relative">
                                    {viewMode === 'grid' ? (
                                        <LibraryItem
                                            name={item.name}
                                            createdAt={item.createdAt}
                                            metadata={item}
                                            icon={TYPE_ICONS[item.type]}
                                            typeLabel={item.type.replace('prompt-', '')}
                                            onPreview={() => setPreviewItem(item)}
                                            onDelete={() => handleDelete(item)}
                                            onToggleStar={() => handleToggleMetadata(item, 'isStarred')}
                                            onTogglePin={() => handleToggleMetadata(item, 'isPinned')}
                                            onToggleArchive={() => handleToggleMetadata(item, 'isArchived')}
                                            onExport={() => setExportItem(item)}
                                            onEdit={() => handleOpenEdit(item)}
                                            onClick={() => toggleSelection(String(item.id))}
                                            isSelected={selectedIds.has(String(item.id))}
                                        />
                                    ) : (
                                        <LibraryListItem
                                            name={item.name}
                                            createdAt={item.createdAt}
                                            metadata={item}
                                            icon={TYPE_ICONS[item.type]}
                                            typeLabel={item.type.replace('prompt-', '')}
                                            onPreview={() => setPreviewItem(item)}
                                            onDelete={() => handleDelete(item)}
                                            onToggleStar={() => handleToggleMetadata(item, 'isStarred')}
                                            onTogglePin={() => handleToggleMetadata(item, 'isPinned')}
                                            onToggleArchive={() => handleToggleMetadata(item, 'isArchived')}
                                            onExport={() => setExportItem(item)}
                                            onEdit={() => handleOpenEdit(item)}
                                            onClick={() => toggleSelection(String(item.id))}
                                            isSelected={selectedIds.has(String(item.id))}
                                        />
                                    )}
                                </div>
                            ))}
                            {filteredAndSortedItems.length === 0 && (
                                <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                    <span className="material-icons text-5xl text-gray-300 dark:text-gray-700 mb-4">inventory_2</span>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">No architectural assets found in this view.</p>
                                </div>
                            )}
                        </div>
                    </div>
            {/* ── Floating Bulk Actions ── */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
                    <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-700/50 px-4 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center justify-center gap-4 min-w-[max-content]">
                        <span className="text-white font-bold px-3 py-1 bg-white/10 rounded-lg text-sm">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-white/10 hover:bg-white/20 transition-colors rounded-xl px-3 py-1">
                                <span className="material-icons text-white text-sm">folder</span>
                                <input
                                    type="text"
                                    value={bulkCategoryInput}
                                    onChange={(e) => setBulkCategoryInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleBulkCategory()}
                                    placeholder="Assign category..."
                                    className="w-28 bg-transparent border-none text-white placeholder-white/60 text-sm outline-none"
                                    list="bulk-category-suggestions"
                                />
                                <datalist id="bulk-category-suggestions">
                                    {allCategories.map(cat => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                                <button onClick={handleBulkCategory} className="ml-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors" title="Assign Category">Go</button>
                            </div>
                            <button onClick={() => setBatchExportOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm">
                                <span className="material-icons text-sm">folder_zip</span> Export
                            </button>
                            <button onClick={() => setIsSynthesisMode(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm">
                                <span className="material-icons text-sm">auto_fix_high</span> Synthesize
                            </button>
                            <button onClick={handleBulkArchive} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-bold text-sm">
                                <span className="material-icons text-sm">archive</span> Archive
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-white/60 hover:text-white transition-colors">
                                <span className="material-icons text-xl block">close</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modals ── */}
            {previewItem && (
                <PreviewModal
                    isOpen={!!previewItem}
                    onClose={() => setPreviewItem(null)}
                    title={previewItem.name}
                    content={getPreviewContent(previewItem)}
                    mindSeed={previewItem.type === 'mindseed' ? previewItem.original.result : undefined}
                    seedArchitect={previewItem.type === 'seed-architect' ? previewItem.original : undefined}
                    metadata={previewItem}
                    categoryOptions={allCategories}
                    onUpdateMetadata={(meta) => {
                        const fields: (keyof LibraryMetadata)[] = ['isStarred', 'isPinned', 'isArchived'];
                        fields.forEach(f => {
                            if (meta[f] !== previewItem[f]) handleToggleMetadata(previewItem, f);
                        });
                        if (meta.category !== previewItem.category) handleUpdateCategory(previewItem, meta.category || '');
                    }}
                    onCopy={() => {
                        const content = getPreviewContent(previewItem);
                        const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                        navigator.clipboard.writeText(text);
                    }}
                    onExport={() => setExportItem(previewItem)}
                    onDelete={() => handleDelete(previewItem)}
                />
            )}

            {exportItem && (
                <ExportPopover
                    isOpen={!!exportItem}
                    onClose={() => setExportItem(null)}
                    item={exportItem}
                    onExportComplete={(format) => {
                        setToast({ message: `Exported as ${format}`, type: 'success' });
                    }}
                />
            )}

            {batchExportOpen && (
                <BatchExportPopover
                    isOpen={batchExportOpen}
                    onClose={() => setBatchExportOpen(false)}
                    items={items.filter(i => selectedIds.has(String(i.id)))}
                    onExportComplete={(format) => {
                        setToast({ message: `Batch exported ${selectedIds.size} items as ${format}`, type: 'success' });
                        setSelectedIds(new Set());
                    }}
                />
            )}

            {isSynthesisMode && (
                <SynthesisWorkspace
                    sourceItems={items.filter(i => selectedIds.has(String(i.id))).map(i => i.original)}
                    onClose={() => { setIsSynthesisMode(false); setSelectedIds(new Set()); }}
                    onSaveSuccess={() => loadAllData()}
                />
            )}

            <Modal isOpen={isDeleteConfirmOpen} onClose={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} title="Confirm Deletion">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-2">
                        <button onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }} className="px-4 py-2 border dark:border-gray-600 rounded-lg transition-colors">Cancel</button>
                        <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title={`Edit ${editItem?.type}`}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Content (Markdown or JSON for bundles)</label>
                        <textarea
                            rows={12}
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setEditItem(null)} className="px-4 py-2 border dark:border-gray-600 rounded-lg">Cancel</button>
                        <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">Save Changes</button>
                    </div>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default ArchitectureOrganization;