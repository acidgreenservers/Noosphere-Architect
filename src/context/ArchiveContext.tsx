import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UnifiedItem, LibraryMetadata } from '../types';
import * as db from '../services/dbService';

interface ArchiveContextType {
    unifiedItems: UnifiedItem[];
    isLoading: boolean;
    error: string | null;
    loadArchive: () => Promise<void>;
    updateItemMetadata: (item: UnifiedItem, meta: Partial<LibraryMetadata>) => Promise<void>;
    deleteItem: (item: UnifiedItem) => Promise<void>;
    clearError: () => void;
}

const ArchiveContext = createContext<ArchiveContextType | undefined>(undefined);

export const useArchive = () => {
    const context = useContext(ArchiveContext);
    if (!context) {
        throw new Error('useArchive must be used within an ArchiveProvider');
    }
    return context;
};

export const ArchiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [unifiedItems, setUnifiedItems] = useState<UnifiedItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadArchive = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const items = await db.getAllUnifiedItems();
            setUnifiedItems(items);
        } catch (err) {
            console.error('Failed to load archive:', err);
            setError('Failed to load library items. Please refresh or try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadArchive();
    }, [loadArchive]);

    const updateItemMetadata = async (item: UnifiedItem, meta: Partial<LibraryMetadata>) => {
        // Optimistic UI update
        setUnifiedItems(prev => prev.map(i => 
            i.id === item.id 
                ? { ...i, ...meta, original: { ...i.original, ...meta } } 
                : i
        ));
        
        try {
            await db.updateUnifiedItemMetadata(item, meta);
        } catch (err) {
            console.error('Failed to update item metadata:', err);
            // Revert optimistic update on failure by reloading fresh state
            setError('Failed to save changes. Your update was reverted.');
            await loadArchive();
        }
    };

    const deleteItem = async (item: UnifiedItem) => {
        // Optimistic UI update
        setUnifiedItems(prev => prev.filter(i => i.id !== item.id));

        try {
            await db.deleteUnifiedItem(item);
        } catch (err) {
            console.error('Failed to delete item:', err);
            // Revert optimistic update
            setError('Failed to delete item. It may still exist.');
            await loadArchive();
        }
    };

    const clearError = () => setError(null);

    return (
        <ArchiveContext.Provider value={{
            unifiedItems,
            isLoading,
            error,
            loadArchive,
            updateItemMetadata,
            deleteItem,
            clearError
        }}>
            {children}
        </ArchiveContext.Provider>
    );
};
