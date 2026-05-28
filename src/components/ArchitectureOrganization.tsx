import React, { useState, useEffect, useCallback } from 'react';
import {
    SavedAgent, SavedPrompt, SavedProject, SavedMindSeed, SavedSignal, SavedSynthesis,
    LibraryMetadata, UnifiedItem
} from '../types';
import * as db from '../services/dbService';
import LibraryItem from './LibraryItem';
import PreviewModal from './PreviewModal';
import SynthesisWorkspace from './SynthesisWorkspace';
import Modal from './Modal';
import Toast from './Toast';

type SortField = 'createdAt' | 'name' | 'type';
type SortDirection = 'asc' | 'desc';

const TYPE_LABELS: Record<UnifiedItem['type'], string> = {
    'agent': 'Agents',
    'prompt-standard': 'Standard Prompts',
    'prompt-system': 'System Prompts',
    'project': 'Projects',
    'mindseed': 'MindSeeds',
    'signal': 'Signals',
    'synthesis': 'Syntheses',
    'roadmap': 'Roadmaps',
    'legacy-prompt': 'Legacy Prompts'
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
    'legacy-prompt': 'history'
};

const ArchitectureOrganization: React.FC = () => {
    const [items, setItems] = useState<UnifiedItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all_types');
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSynthesisMode, setIsSynthesisMode] = useState(false);
    const [previewItem, setPreviewItem] = useState<UnifiedItem | null>(null);
    const [editItem, setEditItem] = useState<UnifiedItem | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editName, setEditName] = useState('');
    const [bulkCategoryInput, setBulkCategoryInput] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [expandedSection, setExpandedSection] = useState<string | null>('Views');
    
    const loadAllData = useCallback(async () => {
        const [
            agents, prompts, stdPrompts, sysPrompts,
            projects, seedsCogni, seedsLingua, seedsArch,
            signals, syntheses, roadmaps
        ] = await Promise.all([
            db.getAllAgents(),
            db.getAllPrompts(),
            db.getAllTypedPrompts('standard'),
            db.getAllTypedPrompts('system'),
            db.getAllProjects(),
            db.getAllMindSeeds('cogni'),
            db.getAllMindSeeds('lingua'),
            db.getAllMindSeeds('arch'),
            db.getAllSignals(),
            db.getAllSynthesis(),
            db.getAllRoadmaps()
        ]);

        const unified: UnifiedItem[] = [
            ...agents.map(i => ({ ...mapToUnified(i, 'agent') })),
            ...prompts.map(i => ({ ...mapToUnified(i, 'legacy-prompt') })),
            ...stdPrompts.map(i => ({ ...mapToUnified(i, 'prompt-standard') })),
            ...sysPrompts.map(i => ({ ...mapToUnified(i, 'prompt-system') })),
            ...projects.map(i => ({ ...mapToUnified(i, 'project') })),
            ...seedsCogni.map(i => ({ ...mapToUnified(i, 'mindseed') })),
            ...seedsLingua.map(i => ({ ...mapToUnified(i, 'mindseed') })),
            ...seedsArch.map(i => ({ ...mapToUnified(i, 'mindseed') })),
            ...signals.map(i => ({ ...mapToUnified(i, 'signal') })),
            ...syntheses.map(i => ({ ...mapToUnified(i, 'synthesis') })),
            ...roadmaps.map(i => ({ ...mapToUnified(i, 'roadmap') }))
        ];

        setItems(unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, []);

    const mapToUnified = (item: any, type: UnifiedItem['type']): UnifiedItem => ({
        id: `${type}-${item.id}`,
        name: item.name || (item.result?.seed) || 'Untitled',
        type,
        original: item,
        createdAt: item.createdAt,
        isStarred: !!item.isStarred,
        isPinned: !!item.isPinned,
        isArchived: !!item.isArchived,
        category: item.category || ''
    });

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const allCategories = Array.from(new Set(items.map(i => i.category).filter(c => c && c.trim()))).sort();

    const sidebarSections = [
        {
            label: 'Views',
            items: [
                { id: 'all', label: 'All Items', icon: 'inventory_2' },
                { id: 'starred', label: 'Starred', icon: 'star' },
                { id: 'pinned', label: 'Pinned', icon: 'push_pin' },
                { id: 'archived', label: 'Archived', icon: 'archive' },
            ] as { id: string; label: string; icon: string }[]
        },
        {
            label: 'Filter by Type',
            items: [
                { id: 'all_types', label: 'All Types', icon: 'category' },
                ...Object.entries(TYPE_LABELS).map(([typeId, label]) => ({
                    id: typeId,
                    label,
                    icon: TYPE_ICONS[typeId as UnifiedItem['type']]
                }))
            ] as { id: string; label: string; icon: string }[]
        }
    ];

    if (allCategories.length > 0) {
        sidebarSections.push({
            label: 'Categories',
            items: allCategories.map(cat => ({ id: cat, label: cat, icon: 'folder' }))
        });
    }

    const handleToggleMetadata = async (item: UnifiedItem, field: keyof LibraryMetadata) => {
        const updatedOriginal = { ...item.original, [field]: !item.original[field] };
        await saveItem(item.type, updatedOriginal);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: updatedOriginal[field], original: updatedOriginal } : i));
        if (previewItem?.id === item.id) setPreviewItem({ ...item, [field]: updatedOriginal[field], original: updatedOriginal });
    };

    const handleUpdateCategory = async (item: UnifiedItem, category: string) => {
        const updatedOriginal = { ...item.original, category };
        await saveItem(item.type, updatedOriginal);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, category, original: updatedOriginal } : i));
        if (previewItem?.id === item.id) setPreviewItem({ ...item, category, original: updatedOriginal });
    };

    const saveItem = async (type: UnifiedItem['type'], original: any) => {
        switch (type) {
            case 'agent': await db.updateAgent(original); break;
            case 'legacy-prompt': await db.updatePrompt(original); break;
            case 'prompt-standard': await db.updateTypedPrompt('standard', original); break;
            case 'prompt-system': await db.updateTypedPrompt('system', original); break;
            case 'project': await db.updateProject(original); break;
            case 'mindseed': await db.updateMindSeed(original); break;
            case 'signal': await db.updateSignal(original); break;
            case 'synthesis': await db.updateSynthesis(original); break;
            case 'roadmap': await db.updateRoadmap(original); break;
        }
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

        await saveItem(editItem.type, updatedOriginal);
        setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: editName, original: updatedOriginal } : i));
        setEditItem(null);
        setToast({ message: 'Item updated', type: 'success' });
    };

    const handleDelete = async (item: UnifiedItem) => {
        if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

        const id = item.original.id;
        switch (item.type) {
            case 'agent': await db.deleteAgent(id); break;
            case 'legacy-prompt': await db.deletePrompt(id); break;
            case 'prompt-standard': await db.deleteTypedPrompt('standard', id); break;
            case 'prompt-system': await db.deleteTypedPrompt('system', id); break;
            case 'project': await db.deleteProject(id); break;
            case 'mindseed': await db.deleteMindSeed(id, item.original.config.type); break;
            case 'signal': await db.deleteSignal(id); break;
            case 'synthesis': await db.deleteSynthesis(id); break;
            case 'roadmap': await db.deleteRoadmap(id); break;
        }
        setItems(prev => prev.filter(i => i.id !== item.id));
        setToast({ message: 'Item deleted', type: 'success' });
        setPreviewItem(null);
    };

    const sidebarCount = (filterId: string): number => {
        return items.filter(i => {
            if (filterId === 'all') return !i.isArchived;
            if (filterId === 'starred') return i.isStarred;
            if (filterId === 'pinned') return i.isPinned;
            if (filterId === 'archived') return i.isArchived;
            if (Object.keys(TYPE_LABELS).includes(filterId)) return i.type === filterId;
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
            const updatedOriginal = { ...item.original, category: bulkCategoryInput.trim() };
            await saveItem(item.type, updatedOriginal);
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, category: bulkCategoryInput.trim(), original: updatedOriginal } : i));
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
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (activeCategory === 'all' && item.isArchived) return false;
            if (activeCategory === 'starred' && !item.isStarred) return false;
            if (activeCategory === 'pinned' && !item.isPinned) return false;
            if (activeCategory === 'archived' && !item.isArchived) return false;

            const isViewFilter = ['all', 'starred', 'pinned', 'archived'].includes(activeCategory);
            if (activeTypeFilter !== 'all_types' && (isViewFilter || activeCategory === 'all')) {
                if (item.type !== activeTypeFilter) return false;
            }

            if (!['all', 'starred', 'pinned', 'archived'].includes(activeCategory)) {
                if (item.category !== activeCategory) return false;
            }

            return true;
        })
        .sort((a, b) => {
            const aVal = getSortValue(a);
            const bVal = getSortValue(b);
            const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortDirection === 'asc' ? cmp : -cmp;
        });

    const getPreviewContent = (item: UnifiedItem): string | Record<string, string> | undefined => {
        const o = item.original;
        if (item.type === 'mindseed') return undefined;
        if (item.type === 'project') return {
            'overview.md': o.files.overviewFile,
            'standards.md': o.files.standardsFile,
            'rules.md': o.files.rulesFile
        };
        if (item.type === 'signal') return `## User Prompt\n\n${o.config.messyPrompt}\n\n## Prompt Signal\n\n${o.promptSignal}\n\n## Signal Constraints\n\n${o.signalConstraints}`;
        if (item.type === 'synthesis') return o.content;
        if (item.type === 'roadmap') return o.generatedTask;
        if (o.prompt) return o.prompt;
        if (o.files) return {
            'agent.md': o.files.agentFile,
            'guidelines.md': o.files.projectGuidelines,
            'constraints.md': o.files.constraintsFile,
            'SKILL.md': o.files.skillFile
        };
        return '';
    };

    const getExportFilename = (item: UnifiedItem): string => {
        const base = item.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
        const timestamp = new Date().toISOString().slice(0, 10);
        switch (item.type) {
            case 'mindseed': return `mindseed-${base}-${timestamp}.md`;
            case 'project': return `project-${base}-${timestamp}.zip`;
            case 'signal': return `signal-${base}-${timestamp}.md`;
            case 'synthesis': return `synthesis-${base}-${timestamp}.md`;
            case 'agent': return `agent-${base}-${timestamp}.md`;
            case 'prompt-standard':
            case 'prompt-system':
            case 'legacy-prompt': return `prompt-${base}-${timestamp}.md`;
            case 'roadmap': return `roadmap-${base}-${timestamp}.md`;
            default: return `export-${base}-${timestamp}.md`;
        }
    };

    const handleExport = (item: UnifiedItem) => {
        const content = getPreviewContent(item);
        if (!content) {
            setToast({ message: 'Nothing to export for this item', type: 'error' });
            return;
        }

        const filename = getExportFilename(item);
        let blob: Blob;

        if (typeof content === 'string') {
            blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        } else if (typeof content === 'object') {
            const combined = Object.entries(content)
                .map(([name, text]) => `--- ${name} ---\n\n${text}`)
                .join('\n\n');
            blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
        } else {
            blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8' });
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setToast({ message: `Exported "${filename}"`, type: 'success' });
    };

    const renderSidebarButton = (id: string, label: string, icon: string) => {
        const isActive =
            (['all', 'starred', 'pinned', 'archived'].includes(id) && activeCategory === id) ||
            (Object.keys(TYPE_LABELS).includes(id) && activeTypeFilter === id) ||
            (!['all', 'starred', 'pinned', 'archived'].includes(id) && !Object.keys(TYPE_LABELS).includes(id) && activeCategory === id);
        const count = sidebarCount(id);

        return (
            <button
                key={id}
                onClick={() => {
                    if (['all', 'starred', 'pinned', 'archived'].includes(id)) {
                        setActiveCategory(id);
                        setActiveTypeFilter('all_types');
                    } else if (Object.keys(TYPE_LABELS).includes(id)) {
                        setActiveTypeFilter(id);
                        setActiveCategory('all');
                    } else {
                        setActiveCategory(id);
                        setActiveTypeFilter('all_types');
                    }
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                    isActive
                    ? 'bg-blue-600 text-white shadow-md font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
                <span className="flex items-center gap-2">
                    <span className={`material-icons text-lg ${isActive ? 'text-white' : 'text-gray-400'}`}>{icon}</span>
                    <span>{label}</span>
                </span>
                {count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

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

    const toggleSection = (sectionLabel: string) => {
        setExpandedSection(prev => prev === sectionLabel ? null : sectionLabel);
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

            {/* ── All Items Section ── */}
            <div className="mb-6">
                <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">

                    {/* Sidebar */}
                    <aside className="w-full lg:w-64 space-y-3 lg:sticky lg:top-0 lg:self-start lg:max-h-screen overflow-y-auto">
                        {sidebarSections.map(section => {
                            const isExpanded = expandedSection === section.label;
                            return (
                                <div key={section.label} className="bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                                    <button
                                        onClick={() => toggleSection(section.label)}
                                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        <span>{section.label}</span>
                                        <span className={`material-icons text-base transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-2 pb-2 space-y-1 pt-1">
                                            {section.items.map(({ id, label, icon }) => renderSidebarButton(id, label, icon))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </aside>

                    {/* Main Grid */}
                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedIds.size > 0 && (
                            <div className="mb-6 p-4 bg-blue-600 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <span className="text-white font-bold ml-2">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1 bg-white/20 rounded-xl px-3 py-1">
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
                                        <button
                                            onClick={handleBulkCategory}
                                            className="ml-1 px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors"
                                            title="Assign Category"
                                        >
                                            Go
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setIsSynthesisMode(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors font-bold text-sm"
                                    >
                                        <span className="material-icons text-sm">auto_fix_high</span>
                                        Synthesize
                                    </button>
                                    <button
                                        onClick={handleBulkArchive}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors font-bold text-sm"
                                    >
                                        <span className="material-icons text-sm">archive</span>
                                        Archive
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="px-4 py-2 text-white hover:underline text-sm"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 px-1">
                            {filteredAndSortedItems.length} item{filteredAndSortedItems.length !== 1 ? 's' : ''}
                            {activeTypeFilter !== 'all_types' && ` in ${TYPE_LABELS[activeTypeFilter as UnifiedItem['type']]?.toLowerCase() || activeTypeFilter}`}
                            {activeCategory !== 'all' && !['starred', 'pinned', 'archived'].includes(activeCategory) && ` in "${activeCategory}"`}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredAndSortedItems.map(item => (
                                <div key={item.id} className="relative">
                                    <LibraryItem
                                        name={item.name}
                                        createdAt={item.createdAt}
                                        metadata={item}
                                        typeLabel={item.type.replace('prompt-', '')}
                                        onPreview={() => setPreviewItem(item)}
                                        onDelete={() => handleDelete(item)}
                                        onToggleStar={() => handleToggleMetadata(item, 'isStarred')}
                                        onTogglePin={() => handleToggleMetadata(item, 'isPinned')}
                                        onToggleArchive={() => handleToggleMetadata(item, 'isArchived')}
                                        onEdit={() => handleOpenEdit(item)}
                                        onClick={() => toggleSelection(String(item.id))}
                                        isSelected={selectedIds.has(String(item.id))}
                                    />
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
                </div>
            </div>

            {/* ── Modals ── */}
            {previewItem && (
                <PreviewModal
                    isOpen={!!previewItem}
                    onClose={() => setPreviewItem(null)}
                    title={previewItem.name}
                    content={getPreviewContent(previewItem)}
                    mindSeed={previewItem.type === 'mindseed' ? previewItem.original.result : undefined}
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
                    onExport={() => handleExport(previewItem)}
                    onDelete={() => handleDelete(previewItem)}
                />
            )}

            {isSynthesisMode && (
                <SynthesisWorkspace
                    sourceItems={items.filter(i => selectedIds.has(String(i.id))).map(i => i.original)}
                    onClose={() => { setIsSynthesisMode(false); setSelectedIds(new Set()); }}
                    onSaveSuccess={() => loadAllData()}
                />
            )}

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