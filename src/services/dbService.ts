
import { SavedAgent, SavedPrompt, AgentConfig, PromptConfig, SavedProject, ProjectConfig } from '../types';

const DB_NAME = 'NoosphereArchitectDB';
const DB_VERSION = 4; // Incremented to trigger onupgradeneeded
const AGENT_STORE = 'savedAgents';
const PROMPT_STORE = 'savedPrompts';
const PROJECT_STORE = 'savedProjects';
const AGENT_DRAFT_STORE = 'agentDraft';
const PROMPT_DRAFT_STORE = 'promptDraft';
const PROJECT_DRAFT_STORE = 'projectDraft';


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
       if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        const projectStore = db.createObjectStore(PROJECT_STORE, { keyPath: 'id', autoIncrement: true });
        projectStore.createIndex('name', 'name', { unique: false });
        projectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(AGENT_DRAFT_STORE)) {
        db.createObjectStore(AGENT_DRAFT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROMPT_DRAFT_STORE)) {
        db.createObjectStore(PROMPT_DRAFT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROJECT_DRAFT_STORE)) {
        db.createObjectStore(PROJECT_DRAFT_STORE, { keyPath: 'id' });
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


// Agent Functions
export const addAgent = (agent: SavedAgent): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readwrite');
        const request = store.add(agent);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllAgents = (): Promise<SavedAgent[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
        request.onsuccess = () => resolve(request.result.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
        request.onsuccess = () => resolve(request.result.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
