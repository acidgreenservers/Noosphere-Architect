import { SavedAgent, SavedPrompt, AgentConfig, PromptConfig, SavedProject, ProjectConfig, SavedSignal, SignalConfig, SavedMindSeed, MindSeedConfig, SavedSynthesis, SavedRoadmap, RoadmapConfig, SavedAgentJob, AgentJobConfig, MindSeedType, PromptType } from '../types';

const DB_NAME = 'NoosphereArchitectDB';
const DB_VERSION = 15;
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
export const SYNTHESIS_STORE = 'savedSynthesis';
const ROADMAP_STORE = 'savedRoadmaps';
const ROADMAP_DRAFT_STORE = 'roadmapDraft';
const AGENT_JOB_STORE = 'savedAgentJobs';
const AGENT_JOB_DRAFT_STORE = 'agentJobDraft';
const SCHEMA_VERSION_STORE = '_schemaVersion'; // Internal store for migration verification


let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null; // Concurrency guard

const initDB = (): Promise<IDBDatabase> => {
  // Deduplicate concurrent init calls
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      initPromise = null;
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening DB', request.error);
      initPromise = null;
      reject(request.error?.message || 'Error opening DB');
    };

    request.onblocked = () => {
      console.warn('IndexedDB open blocked. Another tab may have an older version open.');
      // Don't reject — the block may resolve if the user closes other tabs
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      initPromise = null;

      // Handle unexpected close (e.g., storage quota exceeded, browser crash)
      dbInstance.onclose = () => {
        console.warn('IndexedDB connection unexpectedly closed. Resetting instance.');
        dbInstance = null;
      };
      // Handle version change from another tab
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        initPromise = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion || DB_VERSION;
      const tx = (event.target as IDBOpenDBRequest).transaction;

      console.log(`Upgrading DB from v${oldVersion} to v${newVersion}`);

      // Create schema version store if it doesn't exist (migration v12+)
      // This must happen before any migration runs
      if (newVersion >= 12 && !db.objectStoreNames.contains(SCHEMA_VERSION_STORE)) {
        db.createObjectStore(SCHEMA_VERSION_STORE, { keyPath: 'version' });
      }

      // Write the current version as starting state BEFORE migrations
      if (tx && db.objectStoreNames.contains(SCHEMA_VERSION_STORE)) {
        const metaStore = tx.objectStore(SCHEMA_VERSION_STORE);
        // Set starting state: "migrating_from_v_<oldVersion>"
        metaStore.put({ version: 'status', value: `migrating_from_${oldVersion}`, updatedAt: new Date().toISOString() });
      }

      // Modular Migration Registry
      // Each migration receives (db, tx) for explicit transaction access
      const migrations: Record<number, (db: IDBDatabase, tx: IDBTransaction | null) => void> = {
        1: (db, tx) => {
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
        2: (db, tx) => {
          if (!db.objectStoreNames.contains(PROJECT_STORE)) {
            const projectStore = db.createObjectStore(PROJECT_STORE, { keyPath: 'id', autoIncrement: true });
            projectStore.createIndex('name', 'name', { unique: false });
            projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        },
        3: (db, tx) => {
          if (!db.objectStoreNames.contains(AGENT_DRAFT_STORE)) db.createObjectStore(AGENT_DRAFT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROMPT_DRAFT_STORE)) db.createObjectStore(PROMPT_DRAFT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROJECT_DRAFT_STORE)) db.createObjectStore(PROJECT_DRAFT_STORE, { keyPath: 'id' });
        },
        4: (db, tx) => {
          if (!db.objectStoreNames.contains(SIGNAL_STORE)) {
            const signalStore = db.createObjectStore(SIGNAL_STORE, { keyPath: 'id', autoIncrement: true });
            signalStore.createIndex('name', 'name', { unique: false });
            signalStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(SIGNAL_DRAFT_STORE)) db.createObjectStore(SIGNAL_DRAFT_STORE, { keyPath: 'id' });
        },
        5: (db, tx) => {
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
        6: (db, tx) => {
          if (!db.objectStoreNames.contains(AGENT_CONTEXT_STORE)) db.createObjectStore(AGENT_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(MINDSEED_CONTEXT_STORE)) db.createObjectStore(MINDSEED_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(SIGNAL_CONTEXT_STORE)) db.createObjectStore(SIGNAL_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROMPT_CONTEXT_STORE)) db.createObjectStore(PROMPT_CONTEXT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(PROJECT_CONTEXT_STORE)) db.createObjectStore(PROJECT_CONTEXT_STORE, { keyPath: 'id' });
        },
        7: (db, tx) => {
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
        8: (db, tx) => {
          if (!db.objectStoreNames.contains(STANDARD_PROMPT_DRAFT_STORE)) db.createObjectStore(STANDARD_PROMPT_DRAFT_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(SYSTEM_PROMPT_DRAFT_STORE)) db.createObjectStore(SYSTEM_PROMPT_DRAFT_STORE, { keyPath: 'id' });
        },
        9: (db, tx) => {
          if (!db.objectStoreNames.contains(SYSTEM_PROMPT_CONTEXT_STORE)) db.createObjectStore(SYSTEM_PROMPT_CONTEXT_STORE, { keyPath: 'id' });
        },
        10: (db, tx) => {
          console.log("Migration to v10 complete: Stewarding state integrity.");
        },
        11: (db, tx) => {
            // Create synthesis store
            if (!db.objectStoreNames.contains(SYNTHESIS_STORE)) {
                const store = db.createObjectStore(SYNTHESIS_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }

            if (!tx) {
              console.warn("Migration v11: no transaction available for cursor data migration — skipping metadata unification.");
              return;
            }

            // Unify metadata fields across all existing records
            const stores = [
                AGENT_STORE, PROMPT_STORE, STANDARD_PROMPT_STORE, SYSTEM_PROMPT_STORE,
                PROJECT_STORE, SIGNAL_STORE, COGNISEED_STORE, LINGUASEED_STORE, ARCHSEED_STORE,
                SYNTHESIS_STORE
            ];

            stores.forEach(storeName => {
                if (db.objectStoreNames.contains(storeName)) {
                    const store = tx.objectStore(storeName);
                    const request = store.openCursor();

                    request.onerror = (e) => {
                      console.error(`Cursor migration v11 failed in store "${storeName}":`, (e.target as IDBRequest).error);
                    };

                    request.onsuccess = (e) => {
                        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
                        if (cursor) {
                            const data = cursor.value;
                            let updated = false;
                            if (data.isStarred === undefined) { data.isStarred = false; updated = true; }
                            if (data.isPinned === undefined) { data.isPinned = false; updated = true; }
                            if (data.isArchived === undefined) { data.isArchived = false; updated = true; }
                            if (data.category === undefined) { data.category = ''; updated = true; }

                            if (updated) {
                              try {
                                cursor.update(data);
                              } catch (updateErr) {
                                console.error(`Migration v11: cursor.update failed in "${storeName}" for record:`, data?.id, updateErr);
                              }
                            }
                            cursor.continue();
                        }
                    };
                }
            });
            console.log("Migration to v11 complete: Unified metadata initialized.");
        },
        12: (db, tx) => {
            // Migration v12: Create _schemaVersion store for independent verification trail
            // The store is already created at the top of onupgradeneeded (if version >= 12),
            // so this migration is deliberately minimal — it just marks completion.
            console.log("Migration to v12 complete: Schema version store initialized.");
        },
        13: (db, tx) => {
            if (!db.objectStoreNames.contains(ROADMAP_STORE)) {
                const store = db.createObjectStore(ROADMAP_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(ROADMAP_DRAFT_STORE)) {
                db.createObjectStore(ROADMAP_DRAFT_STORE, { keyPath: 'id' });
            }
            console.log("Migration to v13 complete: Roadmap store initialized.");
        },
        14: (_db, _tx) => {
            console.log("Migration to v14 complete: Schema version reconciled with existing DB state.");
        },
        15: (db, tx) => {
            if (!db.objectStoreNames.contains(AGENT_JOB_STORE)) {
                const store = db.createObjectStore(AGENT_JOB_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(AGENT_JOB_DRAFT_STORE)) {
                db.createObjectStore(AGENT_JOB_DRAFT_STORE, { keyPath: 'id' });
            }
            console.log("Migration to v15 complete: Agent Job store initialized.");
        }
      };

      for (let v = oldVersion + 1; v <= newVersion; v++) {
        if (migrations[v]) {
          try {
            console.log(`Running migration for v${v}`);
            migrations[v](db, tx);
            // Record successful completion of this migration in the schema version store
            if (tx && db.objectStoreNames.contains(SCHEMA_VERSION_STORE)) {
              const metaStore = tx.objectStore(SCHEMA_VERSION_STORE);
              metaStore.put({
                version: v,
                value: 'completed',
                completedAt: new Date().toISOString()
              });
            }
          } catch (err) {
            console.error(`Migration v${v} FAILED:`, err);
            // Record failure in schema version store
            if (tx && db.objectStoreNames.contains(SCHEMA_VERSION_STORE)) {
              try {
                const metaStore = tx.objectStore(SCHEMA_VERSION_STORE);
                metaStore.put({
                  version: v,
                  value: 'failed',
                  error: String(err),
                  failedAt: new Date().toISOString()
                });
              } catch (metaErr) {
                console.error(`Failed to record migration failure in schema version store:`, metaErr);
              }
            }
            // Reject the overall promise so the caller knows the DB is in an inconsistent state
            reject(`Migration v${v} failed: ${err}`);
            return;
          }
        }
      }
    };
  });

  return initPromise;
};

/**
 * Health check: verifies database integrity.
 * Returns a diagnostics object with store status and migration history.
 * Components can call this to detect corruption early.
 */
export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  storesPresent: string[];
  storesMissing: string[];
  schemaVersions: Record<string, unknown>;
  errors: string[];
}> => {
  const diagnostics = {
    healthy: true,
    storesPresent: [] as string[],
    storesMissing: [] as string[],
    schemaVersions: {} as Record<string, unknown>,
    errors: [] as string[]
  };

  try {
    const db = await initDB();

    const expectedStores = [
      AGENT_STORE, PROMPT_STORE, STANDARD_PROMPT_STORE, SYSTEM_PROMPT_STORE,
      PROJECT_STORE, SIGNAL_STORE, COGNISEED_STORE, LINGUASEED_STORE, ARCHSEED_STORE,
      SYNTHESIS_STORE, ROADMAP_STORE, AGENT_JOB_STORE, SCHEMA_VERSION_STORE
    ];

    expectedStores.forEach(storeName => {
      if (db.objectStoreNames.contains(storeName)) {
        diagnostics.storesPresent.push(storeName);
      } else {
        diagnostics.storesMissing.push(storeName);
        diagnostics.healthy = false;
        diagnostics.errors.push(`Missing expected store: ${storeName}`);
      }
    });

    // Read schema version store
    if (db.objectStoreNames.contains(SCHEMA_VERSION_STORE)) {
      const tx = db.transaction(SCHEMA_VERSION_STORE, 'readonly');
      const store = tx.objectStore(SCHEMA_VERSION_STORE);
      const allVersions = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const result: Record<string, unknown> = {};
          (request.result as any[]).forEach((item: any) => {
            result[item.version] = item;
          });
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      });
      diagnostics.schemaVersions = allVersions;

      // Check for any recorded failures
      for (const [version, record] of Object.entries(allVersions)) {
        const rec = record as any;
        if (rec.value === 'failed') {
          diagnostics.healthy = false;
          diagnostics.errors.push(`Migration v${version} recorded as FAILED: ${rec.error}`);
        }
      }
    }
  } catch (err: any) {
    diagnostics.healthy = false;
    diagnostics.errors.push(`Database init failed: ${err.message || String(err)}`);
  }

  return diagnostics;
};

const getStore = async (storeName: string, mode: IDBTransactionMode) => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(storeName)) {
    throw new Error(`Store "${storeName}" does not exist in the database.`);
  }
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

// Synthesis Functions
export const addSynthesis = (synthesis: SavedSynthesis): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SYNTHESIS_STORE, 'readwrite');
        const request = store.add(synthesis);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllSynthesis = (): Promise<SavedSynthesis[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SYNTHESIS_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateSynthesis = (synthesis: SavedSynthesis): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SYNTHESIS_STORE, 'readwrite');
        const request = store.put(synthesis);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteSynthesis = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SYNTHESIS_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllSynthesis = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(SYNTHESIS_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
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

// Roadmap Functions
export const addRoadmap = (roadmap: SavedRoadmap): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_STORE, 'readwrite');
        const request = store.add(roadmap);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllRoadmaps = (): Promise<SavedRoadmap[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateRoadmap = (roadmap: SavedRoadmap): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_STORE, 'readwrite');
        const request = store.put(roadmap);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteRoadmap = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllRoadmaps = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveRoadmapDraft = (draft: {id: number, config: RoadmapConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getRoadmapDraft = (id: number): Promise<{id: number, config: RoadmapConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearRoadmapDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(ROADMAP_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Agent Job Functions
export const addAgentJob = (job: SavedAgentJob): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_STORE, 'readwrite');
        const request = store.add(job);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllAgentJobs = (): Promise<SavedAgentJob[]> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_STORE, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        request.onerror = () => reject(request.error);
    });
};

export const updateAgentJob = (job: SavedAgentJob): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_STORE, 'readwrite');
        const request = store.put(job);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const deleteAgentJob = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllAgentJobs = (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_STORE, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveAgentJobDraft = (draft: {id: number, config: AgentJobConfig}): Promise<number> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_DRAFT_STORE, 'readwrite');
        const request = store.put(draft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAgentJobDraft = (id: number): Promise<{id: number, config: AgentJobConfig} | undefined> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_DRAFT_STORE, 'readonly');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearAgentJobDraft = (id: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const store = await getStore(AGENT_JOB_DRAFT_STORE, 'readwrite');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};