import React, { useState, useEffect, useCallback } from 'react';
import {
    SavedAgent, SavedPrompt, SavedProject, SavedMindSeed, SavedSignal, SavedSynthesis,
    LibraryMetadata
} from '../types';
import * as db from '../services/dbService';
import LibraryItem from './LibraryItem';
import PreviewModal from './PreviewModal';
import SynthesisWorkspace from './SynthesisWorkspace';
import Modal from './Modal';
import Toast from './Toast';

type UnifiedItem = {
    id: number | string;
    name: string;
    type: 'agent' | 'prompt-standard' | 'prompt-system' | 'project' | 'mindseed' | 'signal' | 'synthesis' | 'legacy-prompt';
    original: any;
    createdAt: string;
    isStarred: boolean;
    isPinned: boolean;
    isArchived: boolean;
    category: string;
};

const ArchitectureOrganization: React.FC = () => {
    const [items, setItems] = useState<UnifiedItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveTab] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSynthesisMode, setIsSynthesisMode] = useState(false);
    const [previewItem, setPreviewItem] = useState<UnifiedItem | null>(null);
    const [editItem, setEditItem] = useState<UnifiedItem | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editName, setEditName] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const loadAllData = useCallback(async () => {
        const [
            agents, prompts, stdPrompts, sysPrompts,
            projects, seedsCogni, seedsLingua, seedsArch,
            signals, syntheses
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
            db.getAllSynthesis()
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
            ...syntheses.map(i => ({ ...mapToUnified(i, 'synthesis') }))
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

        // Handle content update based on type nuance
        if (editItem.type === 'mindseed') {
            updatedOriginal.result = { ...o.result, seed: editName }; // MindSeed name is the seed
        } else if (editItem.type === 'project') {
            try {
                updatedOriginal.files = JSON.parse(editContent);
            } catch {
                setToast({ message: 'Invalid JSON for multi-file project', type: 'error' });
                return;
            }
        } else if (editItem.type === 'signal') {
            // Signal edit is complex as it's extracted, usually we edit the name or synthesized result
            updatedOriginal.promptSignal = editContent.split('\n\n')[0];
        } else if (editItem.type === 'synthesis') {
            updatedOriginal.content = editContent;
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
        }
        setItems(prev => prev.filter(i => i.id !== item.id));
        setToast({ message: 'Item deleted', type: 'success' });
        setPreviewItem(null);
    };

    const categories = ['all', 'starred', 'pinned', 'archived', ...Array.from(new Set(items.map(i => i.category).filter(c => c)))];

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

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (activeCategory === 'all') return !item.isArchived;
        if (activeCategory === 'starred') return item.isStarred;
        if (activeCategory === 'pinned') return item.isPinned;
        if (activeCategory === 'archived') return item.isArchived;
        return item.category === activeCategory;
    });

    const getPreviewContent = (item: UnifiedItem): string | Record<string, string> | undefined => {
        const o = item.original;
        if (item.type === 'mindseed') return undefined; // Handled by mindSeed prop in PreviewModal
        if (item.type === 'project') return {
            'overview.md': o.files.overviewFile,
            'standards.md': o.files.standardsFile,
            'rules.md': o.files.rulesFile
        };
        if (item.type === 'signal') return `## User Prompt\n\n${o.config.messyPrompt}\n\n## Prompt Signal\n\n${o.promptSignal}\n\n## Signal Constraints\n\n${o.signalConstraints}`;
        if (item.type === 'synthesis') return o.content;
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
        let isJson = false;

        if (typeof content === 'string') {
            blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        } else if (typeof content === 'object') {
            // Multi-file: export as a JSON bundle (or single file with separator)
            const combined = Object.entries(content)
                .map(([name, text]) => `--- ${name} ---\n\n${text}`)
                .join('\n\n');
            blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
        } else {
            blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json;charset=utf-8' });
            isJson = true;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isJson ? filename.replace(/\.md$/, '.json') : filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setToast({ message: `Exported "${filename}"`, type: 'success' });
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Architecture Organization</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage, categorize, and steward your synthesized wisdom.</p>
                </div>
                <div className="w-full md:w-72 relative">
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

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Categories */}
                <aside className="w-full lg:w-64 space-y-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-4 mb-4">Views</h3>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                                activeCategory === cat
                                ? 'bg-blue-600 text-white shadow-md font-bold'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span className="capitalize">{cat}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                {items.filter(i => {
                                    if (cat === 'all') return !i.isArchived;
                                    if (cat === 'starred') return i.isStarred;
                                    if (cat === 'pinned') return i.isPinned;
                                    if (cat === 'archived') return i.isArchived;
                                    return i.category === cat;
                                }).length}
                            </span>
                        </button>
                    ))}
                </aside>

                {/* Main Grid */}
                <div className="flex-grow">
                    {selectedIds.size > 0 && (
                        <div className="mb-6 p-4 bg-blue-600 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                            <span className="text-white font-bold ml-2">{selectedIds.size} items selected</span>
                            <div className="flex gap-2">
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
                                    Archive Selected
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredItems.map(item => (
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
                        {filteredItems.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                                <span className="material-icons text-5xl text-gray-300 dark:text-gray-700 mb-4">inventory_2</span>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">No architectural assets found in this view.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {previewItem && (
                <PreviewModal
                    isOpen={!!previewItem}
                    onClose={() => setPreviewItem(null)}
                    title={previewItem.name}
                    content={getPreviewContent(previewItem)}
                    mindSeed={previewItem.type === 'mindseed' ? previewItem.original.result : undefined}
                    metadata={previewItem}
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