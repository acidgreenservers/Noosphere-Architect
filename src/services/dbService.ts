
import { SavedAgent, SavedPrompt, AgentConfig, PromptConfig, SavedProject, ProjectConfig, SavedSignal, SignalConfig, SavedMindSeed, MindSeedConfig, MindSeedType, PromptType } from '../types';

const DB_NAME = 'NoosphereArchitectDB';
const DB_VERSION = 10; // Incremented for separate prompt stores and system context
const AGENT_STORE = 'savedAgents';
const PROMPT_STORE = 'savedPrompts'; // Legacy, keeping for migration or reference
const STANDARD_PROMPT_STORE = 'standardPrompts';
const SYSTEM_PROMPT_STORE = 'systemPrompts';
const PROJECT_STORE = 'savedProjects';
const SIGNAL_STORE = 'savedSignals';
const COGNISEED_STORE = 'cogniseeds';
const LINGUASEED_STORE = 'linguaseeds';
const ARCHSEED_STORE = 'archseeds';
const AGENT_DRAFT_STORE = 'agentDraft';
const PROMPT_DRAFT_STORE = 'promptDraft'; // Legacy
const STANDARD_PROMPT_DRAFT_STORE = 'standardPromptDraft';
const SYSTEM_PROMPT_DRAFT_STORE = 'systemPromptDraft';
const PROJECT_DRAFT_STORE = 'projectDraft';
const SIGNAL_DRAFT_STORE = 'signalDraft';
const MINDSEED_DRAFT_STORE = 'mindSeedDraft';
const AGENT_CONTEXT_STORE = 'agentContext';
const MINDSEED_CONTEXT_STORE = 'mindSeedContext';
const SIGNAL_CONTEXT_STORE = 'signalContext';
const PROMPT_CONTEXT_STORE = 'promptContext';
const SYSTEM_PROMPT_CONTEXT_STORE = 'systemPromptContext';
const PROJECT_CONTEXT_STORE = 'projectContext';


let dbInstance: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening DB', request.error);
      reject('Error opening DB');
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion || DB_VERSION;

      console.log(`Upgrading DB from v${oldVersion} to v${newVersion}`);

      // Modular Migration Registry
      const migrations: Record<number, (db: IDBDatabase) => void> = {
        1: (db) => {
          if (!db.objectStoreNames.contains(AGENT_STORE)) {
            const agentStore = db.createObjectStore(AGENT_STORE, { keyPath: 'id', autoIncrement: true });
            agentStore.createIndex('name', 'name', { unique: false });
            agentStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(PROMPT_STORE)) {
            const promptStore = db.createObjectStore(PROMPT_STORE, { keyPath: 'id', autoIncrement: true });
            promptStore.createIndex('name', 'name', { unique: false });
            promptStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        },
        2: (db) => {
          if (!db.objectStoreNames.contains(PROJECT_STORE)) {
            const projectStore = db.createObjectStore(PROJECT_STORE, { keyPath: 'id', autoIncrement: true });
            projectStore.createIndex('name', 'name', { unique: false });
            projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        },
        3: (db) => {
          if (!db.objectStoreNames.contains(AGENT_DRAFT_STORE)) db.createObjectStore(AGENT_DRAFT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROMPT_DRAFT_STORE)) db.createObjectStore(PROMPT_DRAFT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROJECT_DRAFT_STORE)) db.createObjectStore(PROJECT_DRAFT_STORE, { keyPath: 'id' });
        },
        4: (db) => {
          if (!db.objectStoreNames.contains(SIGNAL_STORE)) {
            const signalStore = db.createObjectStore(SIGNAL_STORE, { keyPath: 'id', autoIncrement: true });
            signalStore.createIndex('name', 'name', { unique: false });
            signalStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(SIGNAL_DRAFT_STORE)) db.createObjectStore(SIGNAL_DRAFT_STORE, { keyPath: 'id' });
        },
        5: (db) => {
          if (!db.objectStoreNames.contains(COGNISEED_STORE)) {
            const store = db.createObjectStore(COGNISEED_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(LINGUASEED_STORE)) {
            const store = db.createObjectStore(LINGUASEED_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(ARCHSEED_STORE)) {
            const store = db.createObjectStore(ARCHSEED_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(MINDSEED_DRAFT_STORE)) db.createObjectStore(MINDSEED_DRAFT_STORE, { keyPath: 'id' });
        },
        6: (db) => {
          if (!db.objectStoreNames.contains(AGENT_CONTEXT_STORE)) db.createObjectStore(AGENT_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(MINDSEED_CONTEXT_STORE)) db.createObjectStore(MINDSEED_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(SIGNAL_CONTEXT_STORE)) db.createObjectStore(SIGNAL_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROMPT_CONTEXT_STORE)) db.createObjectStore(PROMPT_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROJECT_CONTEXT_STORE)) db.createObjectStore(PROJECT_CONTEXT_STORE, { keyPath: 'id' });
        },
        7: (db) => {
          if (!db.objectStoreNames.contains(STANDARD_PROMPT_STORE)) {
            const store = db.createObjectStore(STANDARD_PROMPT_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(SYSTEM_PROMPT_STORE)) {
            const store = db.createObjectStore(SYSTEM_PROMPT_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('createdAt', 'createdAt', { unique: false });
          }
        },
        8: (db) => {
          if (!db.objectStoreNames.contains(STANDARD_PROMPT_DRAFT_STORE)) db.createObjectStore(STANDARD_PROMPT_DRAFT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(SYSTEM_PROMPT_DRAFT_STORE)) db.createObjectStore(SYSTEM_PROMPT_DRAFT_STORE, { keyPath: 'id' });
        },
        9: (db) => {
          if (!db.objectStoreNames.contains(SYSTEM_PROMPT_CONTEXT_STORE)) db.createObjectStore(SYSTEM_PROMPT_CONTEXT_STORE, { keyPath: 'id' });
        },
        10: () => {
          // Placeholder for data migration if needed
          console.log("Migration to v10 complete: Stewarding state integrity.");
        }
      };

      for (let v = oldVersion + 1; v <= newVersion; v++) {
        if (migrations[v]) {
          console.log(`Running migration for v${v}`);
          migrations[v](db);
        }
      }
    };
  });
};

const getStore = async (storeName: string, mode: IDBTransactionMode) => {
  const db = await initDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
};

// Agent Draft Functions
export const saveDraft = (draft: {id: number, config: AgentConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

// Generic Prompt Draft Functions
export const saveTypedPromptDraft = (type: PromptType, draft: {id: number, config: PromptConfig | AgentConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const storeName = type === 'standard' ? STANDARD_PROMPT_DRAFT_STORE : SYSTEM_PROMPT_DRAFT_STORE;
        const store = await getStore(storeName, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getTypedPromptDraft = (type: PromptType, id: number): Promise<{id: number, config: PromptConfig | AgentConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const storeName = type === 'standard' ? STANDARD_PROMPT_DRAFT_STORE : SYSTEM_PROMPT_DRAFT_STORE;
        const store = await getStore(storeName, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearTypedPromptDraft = (type: PromptType, id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const storeName = type === 'standard' ? STANDARD_PROMPT_DRAFT_STORE : SYSTEM_PROMPT_DRAFT_STORE;
        const store = await getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// MindSeed Draft Functions
export const saveMindSeedDraft = (draft: {id: number, config: MindSeedConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(MINDSEED_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

// Typed Prompt Functions
const getPromptStoreName = (type: PromptType) => {
    return type === 'standard' ? STANDARD_PROMPT_STORE : SYSTEM_PROMPT_STORE;
};

export const addTypedPrompt = (type: PromptType, prompt: SavedPrompt): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const storeName = getPromptStoreName(type);
        const store = await getStore(storeName, 'readwrite');
        const request = store.add(prompt);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllTypedPrompts = (type: PromptType): Promise<SavedPrompt[]> => {
    return new Promise(async (resolve, reject) => {
        const storeName = getPromptStoreName(type);
        const store = await getStore(storeName, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateTypedPrompt = (type: PromptType, prompt: SavedPrompt): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const storeName = getPromptStoreName(type);
        const store = await getStore(storeName, 'readwrite');
        const request = store.put(prompt);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteTypedPrompt = (type: PromptType, id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const storeName = getPromptStoreName(type);
        const store = await getStore(storeName, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllTypedPrompts = (type: PromptType): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const storeName = getPromptStoreName(type);
        const store = await getStore(storeName, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getMindSeedDraft = (id: number): Promise<{id: number, config: MindSeedConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(MINDSEED_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearMindSeedDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(MINDSEED_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// MindSeed Functions
const getMindSeedStoreName = (type: MindSeedType) => {
    switch (type) {
        case 'cogni': return COGNISEED_STORE;
        case 'lingua': return LINGUASEED_STORE;
        case 'arch': return ARCHSEED_STORE;
    }
};

export const addMindSeed = (mindSeed: SavedMindSeed): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        try {
            const storeName = getMindSeedStoreName(mindSeed.config.type);
            const store = await getStore(storeName, 'readwrite');
            const request = store.add(mindSeed);
            request.onsuccess = async () => {
                const id = request.result as number;
                // Atomic verification: check if it was correctly written
                const getRequest = store.get(id);
                getRequest.onsuccess = () => resolve(id);
                getRequest.onerror = () => reject(new Error("Verification failed after write."));
            };
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

// Custom Context Functions
export type ContextStoreName = 'agentContext' | 'mindSeedContext' | 'signalContext' | 'promptContext' | 'systemPromptContext' | 'projectContext';

export const saveCustomContext = (storeName: ContextStoreName, context: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(storeName, 'readwrite');
        const request = store.put({ id: 'current', context });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getCustomContext = (storeName: ContextStoreName): Promise<string | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(storeName, 'readonly');
        const request = store.get('current');
        request.onsuccess = () => resolve(request.result?.context);
        request.onerror = () => reject(request.error);
    });
};

export const deleteCustomContext = (storeName: ContextStoreName): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(storeName, 'readwrite');
        const request = store.delete('current');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllMindSeeds = (type: MindSeedType): Promise<SavedMindSeed[]> => {
    return new Promise(async (resolve, reject) => {
        try {
            const storeName = getMindSeedStoreName(type);
            const store = await getStore(storeName, 'readonly');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const updateMindSeed = (mindSeed: SavedMindSeed): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        try {
            const storeName = getMindSeedStoreName(mindSeed.config.type);
            const store = await getStore(storeName, 'readwrite');
            const request = store.put(mindSeed);
            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const deleteMindSeed = (id: number, type: MindSeedType): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const storeName = getMindSeedStoreName(type);
            const store = await getStore(storeName, 'readwrite');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const clearAllMindSeeds = (type: MindSeedType): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const storeName = getMindSeedStoreName(type);
            const store = await getStore(storeName, 'readwrite');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const getDraft = (id: number): Promise<{id: number, config: AgentConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Prompt Draft Functions
export const savePromptDraft = (draft: {id: number, config: PromptConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getPromptDraft = (id: number): Promise<{id: number, config: PromptConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearPromptDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Project Draft Functions
export const saveProjectDraft = (draft: {id: number, config: ProjectConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getProjectDraft = (id: number): Promise<{id: number, config: ProjectConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearProjectDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Signal Draft Functions
export const saveSignalDraft = (draft: {id: number, config: SignalConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getSignalDraft = (id: number): Promise<{id: number, config: SignalConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearSignalDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};


// Agent Functions
export const addAgent = (agent: SavedAgent): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readwrite');
        const request = store.add(agent);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

// Signal Functions
export const addSignal = (signal: SavedSignal): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_STORE, 'readwrite');
        const request = store.add(signal);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllSignals = (): Promise<SavedSignal[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateSignal = (signal: SavedSignal): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_STORE, 'readwrite');
        const request = store.put(signal);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteSignal = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllSignals = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SIGNAL_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllAgents = (): Promise<SavedAgent[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateAgent = (agent: SavedAgent): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readwrite');
        const request = store.put(agent);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteAgent = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllAgents = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};


// Prompt Functions
export const addPrompt = (prompt: SavedPrompt): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_STORE, 'readwrite');
        const request = store.add(prompt);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllPrompts = (): Promise<SavedPrompt[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updatePrompt = (prompt: SavedPrompt): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_STORE, 'readwrite');
        const request = store.put(prompt);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deletePrompt = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllPrompts = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROMPT_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Project Functions
export const addProject = (project: SavedProject): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_STORE, 'readwrite');
        const request = store.add(project);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllProjects = (): Promise<SavedProject[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateProject = (project: SavedProject): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_STORE, 'readwrite');
        const request = store.put(project);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteProject = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllProjects = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(PROJECT_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
