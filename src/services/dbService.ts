import { SavedAgent, SavedPrompt, AgentConfig, PromptConfig, SavedProject, ProjectConfig, SavedSignal, SignalConfig, SavedMindSeed, MindSeedConfig, SavedSynthesis, SavedRoadmap, RoadmapConfig, SavedAgentJob, AgentJobConfig, MindSeedType, PromptType, UnifiedItem, SavedSeed, SeedConfig, CompressionConfig, SavedCompressedSignal } from '../types';
import { encryptData, decryptData } from '../utils/encryption';

const DB_NAME = 'NoosphereArchitectDB';
const DB_VERSION = 17;
const AGENT_STORE = 'savedAgents';
const PROMPT_STORE = 'savedPrompts'; // Legacy, keeping for migration or reference
const STANDARD_PROMPT_STORE = 'standardPrompts';
const SYSTEM_PROMPT_STORE = 'systemPrompts';
const PROJECT_STORE = 'savedProjects';
const SIGNAL_STORE = 'savedSignals';
const COGNISEED_STORE = 'cogniseeds';
const LINGUASEED_STORE = 'linguaseeds';
const ARCHSEED_STORE = 'archseeds';
const COMPRESSED_SIGNAL_STORE = 'savedCompressedSignals';
const AGENT_DRAFT_STORE = 'agentDraft';
const PROMPT_DRAFT_STORE = 'promptDraft'; // Legacy
const STANDARD_PROMPT_DRAFT_STORE = 'standardPromptDraft';
const SYSTEM_PROMPT_DRAFT_STORE = 'systemPromptDraft';
const PROJECT_DRAFT_STORE = 'projectDraft';
const SIGNAL_DRAFT_STORE = 'signalDraft';
const MINDSEED_DRAFT_STORE = 'mindSeedDraft';
const COMPRESSED_SIGNAL_DRAFT_STORE = 'compressedSignalDraft';
const AGENT_CONTEXT_STORE = 'agentContext';
const MINDSEED_CONTEXT_STORE = 'mindSeedContext';
const SIGNAL_CONTEXT_STORE = 'signalContext';
const PROMPT_CONTEXT_STORE = 'promptContext';
const SYSTEM_PROMPT_CONTEXT_STORE = 'systemPromptContext';
const PROJECT_CONTEXT_STORE = 'projectContext';
const COMPRESSED_SIGNAL_CONTEXT_STORE = 'compressedSignalContext';
export const SYNTHESIS_STORE = 'savedSynthesis';
const ROADMAP_STORE = 'savedRoadmaps';
const ROADMAP_DRAFT_STORE = 'roadmapDraft';
const AGENT_JOB_STORE = 'savedAgentJobs';
const AGENT_JOB_DRAFT_STORE = 'agentJobDraft';
const SEED_STORE = 'savedSeeds';
const SEED_TEMP_STORE = 'seedTemp';
const SEED_DRAFT_STORE = 'seedDraft';
const SCHEMA_VERSION_STORE = '_schemaVersion'; // Internal store for migration verification


let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null; // Concurrency guard

export const initDB = (): Promise<IDBDatabase> => {
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
        },
        16: (db, tx) => {
            if (!db.objectStoreNames.contains(SEED_STORE)) {
                const store = db.createObjectStore(SEED_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(SEED_TEMP_STORE)) {
                db.createObjectStore(SEED_TEMP_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(COMPRESSED_SIGNAL_STORE)) {
                const store = db.createObjectStore(COMPRESSED_SIGNAL_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (!db.objectStoreNames.contains(COMPRESSED_SIGNAL_DRAFT_STORE)) {
                db.createObjectStore(COMPRESSED_SIGNAL_DRAFT_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(COMPRESSED_SIGNAL_CONTEXT_STORE)) {
                db.createObjectStore(COMPRESSED_SIGNAL_CONTEXT_STORE, { keyPath: 'id' });
            }
            console.log("Migration to v16 complete: Seed Architect and Compressed Signal stores initialized.");
        },
        17: (db, tx) => {
            if (!db.objectStoreNames.contains(SEED_DRAFT_STORE)) {
                db.createObjectStore(SEED_DRAFT_STORE, { keyPath: 'id' });
            }
            console.log("Migration to v17 complete: Seed Architect draft store initialized.");
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

    const v16Stores = [COMPRESSED_SIGNAL_STORE, COMPRESSED_SIGNAL_DRAFT_STORE, COMPRESSED_SIGNAL_CONTEXT_STORE];
    v16Stores.forEach(storeName => {
        if (db.objectStoreNames.contains(storeName)) {
            diagnostics.storesPresent.push(storeName);
        } else {
            diagnostics.storesMissing.push(storeName);
            diagnostics.healthy = false;
            diagnostics.errors.push(`Missing expected v16 store: ${storeName}`);
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

/**
 * Helper to encrypt a sensitive field (object or string).
 */
const encryptField = (field: any): string => {
    if (!field) return '';
    const str = typeof field === 'string' ? field : JSON.stringify(field);
    return encryptData(str);
};

/**
 * Helper to decrypt a sensitive field with graceful fallback for legacy plain-text data.
 */
const decryptField = (ciphertext: string, isObject: boolean = false): any => {
    if (!ciphertext) return isObject ? undefined : '';

    // Attempt decryption
    const decrypted = decryptData(ciphertext);

    // If decryption failed or returned empty (likely because it was already plain text),
    // or if the ciphertext doesn't look like an encrypted string (CryptoJS typically starts with U2FsdGVkX1)
    if ((!decrypted && ciphertext) || !ciphertext.startsWith('U2FsdGVkX1')) {
        if (isObject && typeof ciphertext === 'string') {
            try { return JSON.parse(ciphertext); } catch { return undefined; }
        }
        return ciphertext;
    }

    if (isObject) {
        try {
            return JSON.parse(decrypted);
        } catch (e) {
            // One last fallback: maybe the ciphertext was actually a JSON string that wasn't encrypted
            try { return JSON.parse(ciphertext); } catch {
                console.error("Failed to parse decrypted object", e);
                return undefined;
            }
        }
    }
    return decrypted;
};

/**
 * Generic entity processor to reduce code duplication and unify stewardship patterns.
 */
const processEntity = (entity: any, schema: string[], transform: (val: any, isObj: boolean) => any): any => {
    if (!entity) return entity;
    const result = { ...entity };
    const objectFields = new Set(['config', 'files', 'result', 'history', 'lines', 'lineage', 'responses']);

    schema.forEach(field => {
        if (result[field] !== undefined && result[field] !== null) {
            result[field] = transform(result[field], objectFields.has(field));
        }
    });
    return result;
};

const SCHEMAS = {
    agent: ['config', 'prompt', 'signal', 'files'],
    prompt: ['config', 'prompt', 'signal', 'files', 'history'],
    project: ['config', 'files'],
    signal: ['config', 'extractedSignal', 'promptSignal', 'signalConstraints'],
    mindseed: ['config', 'result'],
    roadmap: ['config', 'generatedTask'],
    agentJob: ['config', 'files'],
    synthesis: ['content', 'lines', 'lineage'],
    seed: ['config', 'result', 'responses'],
    compression: ['config', 'result']
};

const encryptAgent = (agent: SavedAgent) => processEntity(agent, SCHEMAS.agent, encryptField);
const decryptAgent = (data: any) => processEntity(data, SCHEMAS.agent, (v, isObj) => decryptField(v, isObj)) as SavedAgent;

const encryptPrompt = (prompt: SavedPrompt) => processEntity(prompt, SCHEMAS.prompt, encryptField);
const decryptPrompt = (data: any) => processEntity(data, SCHEMAS.prompt, (v, isObj) => decryptField(v, isObj)) as SavedPrompt;

const encryptProject = (project: SavedProject) => processEntity(project, SCHEMAS.project, encryptField);
const decryptProject = (data: any) => processEntity(data, SCHEMAS.project, (v, isObj) => decryptField(v, isObj)) as SavedProject;

const encryptSignal = (signal: SavedSignal) => processEntity(signal, SCHEMAS.signal, encryptField);
const decryptSignal = (data: any) => processEntity(data, SCHEMAS.signal, (v, isObj) => decryptField(v, isObj)) as SavedSignal;

const encryptMindSeed = (seed: SavedMindSeed) => processEntity(seed, SCHEMAS.mindseed, encryptField);
const decryptMindSeed = (data: any) => processEntity(data, SCHEMAS.mindseed, (v, isObj) => decryptField(v, isObj)) as SavedMindSeed;

const encryptRoadmap = (roadmap: SavedRoadmap) => processEntity(roadmap, SCHEMAS.roadmap, encryptField);
const decryptRoadmap = (data: any) => processEntity(data, SCHEMAS.roadmap, (v, isObj) => decryptField(v, isObj)) as SavedRoadmap;

const encryptAgentJob = (job: SavedAgentJob) => processEntity(job, SCHEMAS.agentJob, encryptField);
const decryptAgentJob = (data: any) => processEntity(data, SCHEMAS.agentJob, (v, isObj) => decryptField(v, isObj)) as SavedAgentJob;

const encryptSynthesis = (synthesis: SavedSynthesis) => processEntity(synthesis, SCHEMAS.synthesis, encryptField);
const decryptSynthesis = (data: any) => processEntity(data, SCHEMAS.synthesis, (v, isObj) => decryptField(v, isObj)) as SavedSynthesis;

const encryptSeed = (seed: SavedSeed) => processEntity(seed, SCHEMAS.seed, encryptField);
const decryptSeed = (data: any) => processEntity(data, SCHEMAS.seed, (v, isObj) => decryptField(v, isObj)) as SavedSeed;

const encryptCompressedSignal = (signal: SavedCompressedSignal) => processEntity(signal, SCHEMAS.compression, encryptField);
const decryptCompressedSignal = (data: any) => processEntity(data, SCHEMAS.compression, (v, isObj) => decryptField(v, isObj)) as SavedCompressedSignal;

// Agent Draft Functions
export const saveDraft = async (draft: {id: number, config: AgentConfig}): Promise<number> => {
    const store = await getStore(AGENT_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

// Synthesis Functions
export const addSynthesis = async (synthesis: SavedSynthesis): Promise<number> => {
    const store = await getStore(SYNTHESIS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptSynthesis(synthesis));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after synthesis write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllSynthesis = async (): Promise<SavedSynthesis[]> => {
    const store = await getStore(SYNTHESIS_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptSynthesis);
            resolve(results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateSynthesis = async (synthesis: SavedSynthesis): Promise<number> => {
    const store = await getStore(SYNTHESIS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptSynthesis(synthesis));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after synthesis update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSynthesis = async (id: number): Promise<void> => {
    const store = await getStore(SYNTHESIS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllSynthesis = async (): Promise<void> => {
    const store = await getStore(SYNTHESIS_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Generic Prompt Draft Functions
export const saveTypedPromptDraft = async (type: PromptType, draft: {id: number, config: PromptConfig | AgentConfig}): Promise<number> => {
    const storeName = type === 'standard' ? STANDARD_PROMPT_DRAFT_STORE : SYSTEM_PROMPT_DRAFT_STORE;
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getTypedPromptDraft = async (type: PromptType, id: number): Promise<{id: number, config: PromptConfig | AgentConfig} | undefined> => {
    const storeName = type === 'standard' ? STANDARD_PROMPT_DRAFT_STORE : SYSTEM_PROMPT_DRAFT_STORE;
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearTypedPromptDraft = async (type: PromptType, id: number): Promise<void> => {
    const storeName = type === 'standard' ? STANDARD_PROMPT_DRAFT_STORE : SYSTEM_PROMPT_DRAFT_STORE;
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// MindSeed Draft Functions
export const saveMindSeedDraft = async (draft: {id: number, config: MindSeedConfig}): Promise<number> => {
    const store = await getStore(MINDSEED_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

// Typed Prompt Functions
const getPromptStoreName = (type: PromptType) => {
    return type === 'standard' ? STANDARD_PROMPT_STORE : SYSTEM_PROMPT_STORE;
};

export const addTypedPrompt = async (type: PromptType, prompt: SavedPrompt): Promise<number> => {
    const storeName = getPromptStoreName(type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptPrompt(prompt));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error(`Verification failed after ${type} prompt write.`));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllTypedPrompts = async (type: PromptType): Promise<SavedPrompt[]> => {
    const storeName = getPromptStoreName(type);
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptPrompt);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateTypedPrompt = async (type: PromptType, prompt: SavedPrompt): Promise<number> => {
    const storeName = getPromptStoreName(type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptPrompt(prompt));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error(`Verification failed after ${type} prompt update.`));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteTypedPrompt = async (type: PromptType, id: number): Promise<void> => {
    const storeName = getPromptStoreName(type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllTypedPrompts = async (type: PromptType): Promise<void> => {
    const storeName = getPromptStoreName(type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getMindSeedDraft = async (id: number): Promise<{id: number, config: MindSeedConfig} | undefined> => {
    const store = await getStore(MINDSEED_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearMindSeedDraft = async (id: number): Promise<void> => {
    const store = await getStore(MINDSEED_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
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

export const addMindSeed = async (mindSeed: SavedMindSeed): Promise<number> => {
    const storeName = getMindSeedStoreName(mindSeed.config.type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptMindSeed(mindSeed));
        request.onsuccess = () => {
            const id = request.result as number;
            const getRequest = store.get(id);
            getRequest.onsuccess = () => resolve(id);
            getRequest.onerror = () => reject(new Error("Verification failed after write."));
        };
        request.onerror = () => reject(request.error);
    });
};

// Custom Context Functions
export type ContextStoreName = 'agentContext' | 'mindSeedContext' | 'signalContext' | 'promptContext' | 'systemPromptContext' | 'projectContext' | 'compressedSignalContext';

export const saveCustomContext = async (storeName: ContextStoreName, context: string): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put({ id: 'current', context: encryptField(context) });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getCustomContext = async (storeName: ContextStoreName): Promise<string | undefined> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get('current');
        request.onsuccess = () => resolve(decryptField(request.result?.context));
        request.onerror = () => reject(request.error);
    });
};

export const deleteCustomContext = async (storeName: ContextStoreName): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete('current');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllMindSeeds = async (type: MindSeedType): Promise<SavedMindSeed[]> => {
    const storeName = getMindSeedStoreName(type);
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptMindSeed);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateMindSeed = async (mindSeed: SavedMindSeed): Promise<number> => {
    const storeName = getMindSeedStoreName(mindSeed.config.type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptMindSeed(mindSeed));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after mindseed update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteMindSeed = async (id: number, type: MindSeedType): Promise<void> => {
    const storeName = getMindSeedStoreName(type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllMindSeeds = async (type: MindSeedType): Promise<void> => {
    const storeName = getMindSeedStoreName(type);
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getDraft = async (id: number): Promise<{id: number, config: AgentConfig} | undefined> => {
    const store = await getStore(AGENT_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearDraft = async (id: number): Promise<void> => {
    const store = await getStore(AGENT_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Prompt Draft Functions
export const savePromptDraft = async (draft: {id: number, config: PromptConfig}): Promise<number> => {
    const store = await getStore(PROMPT_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getPromptDraft = async (id: number): Promise<{id: number, config: PromptConfig} | undefined> => {
    const store = await getStore(PROMPT_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearPromptDraft = async (id: number): Promise<void> => {
    const store = await getStore(PROMPT_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Project Draft Functions
export const saveProjectDraft = async (draft: {id: number, config: ProjectConfig}): Promise<number> => {
    const store = await getStore(PROJECT_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getProjectDraft = async (id: number): Promise<{id: number, config: ProjectConfig} | undefined> => {
    const store = await getStore(PROJECT_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearProjectDraft = async (id: number): Promise<void> => {
    const store = await getStore(PROJECT_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Signal Draft Functions
export const saveSignalDraft = async (draft: {id: number, config: SignalConfig}): Promise<number> => {
    const store = await getStore(SIGNAL_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getSignalDraft = async (id: number): Promise<{id: number, config: SignalConfig} | undefined> => {
    const store = await getStore(SIGNAL_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearSignalDraft = async (id: number): Promise<void> => {
    const store = await getStore(SIGNAL_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};


// Agent Functions
export const addAgent = async (agent: SavedAgent): Promise<number> => {
    const store = await getStore(AGENT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptAgent(agent));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after agent write."));
        };
        request.onerror = () => reject(request.error);
    });
};

// Signal Functions
export const addSignal = async (signal: SavedSignal): Promise<number> => {
    const store = await getStore(SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptSignal(signal));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after signal write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllSignals = async (): Promise<SavedSignal[]> => {
    const store = await getStore(SIGNAL_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptSignal);
            resolve(results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateSignal = async (signal: SavedSignal): Promise<number> => {
    const store = await getStore(SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptSignal(signal));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after signal update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSignal = async (id: number): Promise<void> => {
    const store = await getStore(SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllSignals = async (): Promise<void> => {
    const store = await getStore(SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllAgents = async (): Promise<SavedAgent[]> => {
    const store = await getStore(AGENT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptAgent);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateAgent = async (agent: SavedAgent): Promise<number> => {
    const store = await getStore(AGENT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptAgent(agent));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after agent update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteAgent = async (id: number): Promise<void> => {
    const store = await getStore(AGENT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllAgents = async (): Promise<void> => {
    const store = await getStore(AGENT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};


// Prompt Functions
export const addPrompt = async (prompt: SavedPrompt): Promise<number> => {
    const store = await getStore(PROMPT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptPrompt(prompt));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after legacy prompt write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllPrompts = async (): Promise<SavedPrompt[]> => {
    const store = await getStore(PROMPT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptPrompt);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updatePrompt = async (prompt: SavedPrompt): Promise<number> => {
    const store = await getStore(PROMPT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptPrompt(prompt));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after legacy prompt update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deletePrompt = async (id: number): Promise<void> => {
    const store = await getStore(PROMPT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllPrompts = async (): Promise<void> => {
    const store = await getStore(PROMPT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Project Functions
export const addProject = async (project: SavedProject): Promise<number> => {
    const store = await getStore(PROJECT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptProject(project));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after project write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllProjects = async (): Promise<SavedProject[]> => {
    const store = await getStore(PROJECT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptProject);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateProject = async (project: SavedProject): Promise<number> => {
    const store = await getStore(PROJECT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptProject(project));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after project update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteProject = async (id: number): Promise<void> => {
    const store = await getStore(PROJECT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllProjects = async (): Promise<void> => {
    const store = await getStore(PROJECT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Compressed Signal Functions
export const addCompressedSignal = async (signal: SavedCompressedSignal): Promise<number> => {
    const store = await getStore(COMPRESSED_SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptCompressedSignal(signal));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after compressed signal write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllCompressedSignals = async (): Promise<SavedCompressedSignal[]> => {
    const store = await getStore(COMPRESSED_SIGNAL_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptCompressedSignal);
            resolve(results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateCompressedSignal = async (signal: SavedCompressedSignal): Promise<number> => {
    const store = await getStore(COMPRESSED_SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptCompressedSignal(signal));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after compressed signal update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteCompressedSignal = async (id: number): Promise<void> => {
    const store = await getStore(COMPRESSED_SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllCompressedSignals = async (): Promise<void> => {
    const store = await getStore(COMPRESSED_SIGNAL_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveCompressedSignalDraft = async (draft: {id: number, config: CompressionConfig}): Promise<number> => {
    const store = await getStore(COMPRESSED_SIGNAL_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getCompressedSignalDraft = async (id: number): Promise<{id: number, config: CompressionConfig} | undefined> => {
    const store = await getStore(COMPRESSED_SIGNAL_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearCompressedSignalDraft = async (id: number): Promise<void> => {
    const store = await getStore(COMPRESSED_SIGNAL_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Roadmap Functions
export const addRoadmap = async (roadmap: SavedRoadmap): Promise<number> => {
    const store = await getStore(ROADMAP_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptRoadmap(roadmap));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after roadmap write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllRoadmaps = async (): Promise<SavedRoadmap[]> => {
    const store = await getStore(ROADMAP_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptRoadmap);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateRoadmap = async (roadmap: SavedRoadmap): Promise<number> => {
    const store = await getStore(ROADMAP_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptRoadmap(roadmap));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after roadmap update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteRoadmap = async (id: number): Promise<void> => {
    const store = await getStore(ROADMAP_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllRoadmaps = async (): Promise<void> => {
    const store = await getStore(ROADMAP_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveRoadmapDraft = async (draft: {id: number, config: RoadmapConfig}): Promise<number> => {
    const store = await getStore(ROADMAP_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getRoadmapDraft = async (id: number): Promise<{id: number, config: RoadmapConfig} | undefined> => {
    const store = await getStore(ROADMAP_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearRoadmapDraft = async (id: number): Promise<void> => {
    const store = await getStore(ROADMAP_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Agent Job Functions
export const addAgentJob = async (job: SavedAgentJob): Promise<number> => {
    const store = await getStore(AGENT_JOB_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptAgentJob(job));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after agent job write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllAgentJobs = async (): Promise<SavedAgentJob[]> => {
    const store = await getStore(AGENT_JOB_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptAgentJob);
            resolve(results.sort((a: any,b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateAgentJob = async (job: SavedAgentJob): Promise<number> => {
    const store = await getStore(AGENT_JOB_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptAgentJob(job));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after agent job update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteAgentJob = async (id: number): Promise<void> => {
    const store = await getStore(AGENT_JOB_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllAgentJobs = async (): Promise<void> => {
    const store = await getStore(AGENT_JOB_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Seed Architect Functions
export const addSeed = async (seed: SavedSeed): Promise<number> => {
    const store = await getStore(SEED_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add(encryptSeed(seed));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after seed write."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const getAllSeeds = async (): Promise<SavedSeed[]> => {
    const store = await getStore(SEED_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(decryptSeed);
            resolve(results.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateSeed = async (seed: SavedSeed): Promise<number> => {
    const store = await getStore(SEED_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(encryptSeed(seed));
        request.onsuccess = () => {
            const id = request.result as number;
            const getReq = store.get(id);
            getReq.onsuccess = () => resolve(id);
            getReq.onerror = () => reject(new Error("Verification failed after seed update."));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSeed = async (id: number): Promise<void> => {
    const store = await getStore(SEED_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const clearAllSeeds = async (): Promise<void> => {
    const store = await getStore(SEED_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Seed Temp Store Functions
export const addSeedTempResponse = async (text: string): Promise<number> => {
    const store = await getStore(SEED_TEMP_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.add({ text: encryptField(text) });
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAllSeedTempResponses = async (): Promise<string[]> => {
    const store = await getStore(SEED_TEMP_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const results = (request.result as any[]).map(item => decryptField(item.text));
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearSeedTempResponses = async (): Promise<void> => {
    const store = await getStore(SEED_TEMP_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveSeedDraft = async (draft: {id: number, config: SeedConfig}): Promise<number> => {
    const store = await getStore(SEED_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getSeedDraft = async (id: number): Promise<{id: number, config: SeedConfig} | undefined> => {
    const store = await getStore(SEED_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearSeedDraft = async (id: number): Promise<void> => {
    const store = await getStore(SEED_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// ── Unified Library Operations ──────────────────────────────────────────────

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

export const getAllUnifiedItems = async (): Promise<UnifiedItem[]> => {
    const [
        agents, prompts, stdPrompts, sysPrompts,
        projects, seedsCogni, seedsLingua, seedsArch,
        signals, syntheses, roadmaps, agentJobs,
        seedArchitects, compressedSignals
    ] = await Promise.all([
        getAllAgents().catch(() => []),
        getAllPrompts().catch(() => []),
        getAllTypedPrompts('standard').catch(() => []),
        getAllTypedPrompts('system').catch(() => []),
        getAllProjects().catch(() => []),
        getAllMindSeeds('cogni').catch(() => []),
        getAllMindSeeds('lingua').catch(() => []),
        getAllMindSeeds('arch').catch(() => []),
        getAllSignals().catch(() => []),
        getAllSynthesis().catch(() => []),
        getAllRoadmaps().catch(() => []),
        getAllAgentJobs().catch(() => []),
        getAllSeeds().catch(() => []),
        getAllCompressedSignals().catch(() => [])
    ]);

    const unified: UnifiedItem[] = [
        ...agents.map(i => mapToUnified(i, 'agent')),
        ...prompts.map(i => mapToUnified(i, 'legacy-prompt')),
        ...stdPrompts.map(i => mapToUnified(i, 'prompt-standard')),
        ...sysPrompts.map(i => mapToUnified(i, 'prompt-system')),
        ...projects.map(i => mapToUnified(i, 'project')),
        ...seedsCogni.map(i => mapToUnified(i, 'mindseed')),
        ...seedsLingua.map(i => mapToUnified(i, 'mindseed')),
        ...seedsArch.map(i => mapToUnified(i, 'mindseed')),
        ...signals.map(i => mapToUnified(i, 'signal')),
        ...syntheses.map(i => mapToUnified(i, 'synthesis')),
        ...roadmaps.map(i => mapToUnified(i, 'roadmap')),
        ...agentJobs.map(i => mapToUnified(i, 'agentJob')),
        ...seedArchitects.map(i => mapToUnified(i, 'seed-architect')),
        ...compressedSignals.map(i => mapToUnified(i, 'compressed-signal'))
    ];

    return unified.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const updateUnifiedItemMetadata = async (item: UnifiedItem, metadata: Partial<UnifiedItem>): Promise<void> => {
    const updatedOriginal = {
        ...item.original,
        isStarred: metadata.isStarred !== undefined ? metadata.isStarred : item.original.isStarred,
        isPinned: metadata.isPinned !== undefined ? metadata.isPinned : item.original.isPinned,
        isArchived: metadata.isArchived !== undefined ? metadata.isArchived : item.original.isArchived,
        category: metadata.category !== undefined ? metadata.category : item.original.category
    };

    switch (item.type) {
        case 'agent': await updateAgent(updatedOriginal); break;
        case 'legacy-prompt': await updatePrompt(updatedOriginal); break;
        case 'prompt-standard': await updateTypedPrompt('standard', updatedOriginal); break;
        case 'prompt-system': await updateTypedPrompt('system', updatedOriginal); break;
        case 'project': await updateProject(updatedOriginal); break;
        case 'mindseed': await updateMindSeed(updatedOriginal); break;
        case 'signal': await updateSignal(updatedOriginal); break;
        case 'synthesis': await updateSynthesis(updatedOriginal); break;
        case 'roadmap': await updateRoadmap(updatedOriginal); break;
        case 'agentJob': await updateAgentJob(updatedOriginal); break;
        case 'seed-architect': await updateSeed(updatedOriginal); break;
        case 'compressed-signal': await updateCompressedSignal(updatedOriginal); break;
    }
};

export const deleteUnifiedItem = async (item: UnifiedItem): Promise<void> => {
    const id = item.original.id;
    switch (item.type) {
        case 'agent': await deleteAgent(id); break;
        case 'legacy-prompt': await deletePrompt(id); break;
        case 'prompt-standard': await deleteTypedPrompt('standard', id); break;
        case 'prompt-system': await deleteTypedPrompt('system', id); break;
        case 'project': await deleteProject(id); break;
        case 'mindseed': await deleteMindSeed(id, item.original.config.type); break;
        case 'signal': await deleteSignal(id); break;
        case 'synthesis': await deleteSynthesis(id); break;
        case 'roadmap': await deleteRoadmap(id); break;
        case 'agentJob': await deleteAgentJob(id); break;
        case 'seed-architect': await deleteSeed(id); break;
        case 'compressed-signal': await deleteCompressedSignal(id); break;
    }
};

export const saveAgentJobDraft = async (draft: {id: number, config: AgentJobConfig}): Promise<number> => {
    const store = await getStore(AGENT_JOB_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const encryptedDraft = { ...draft, config: encryptField(draft.config) };
        const request = store.put(encryptedDraft);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
};

export const getAgentJobDraft = async (id: number): Promise<{id: number, config: AgentJobConfig} | undefined> => {
    const store = await getStore(AGENT_JOB_DRAFT_STORE, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            if (!request.result) return resolve(undefined);
            resolve({ ...request.result, config: decryptField(request.result.config, true) });
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearAgentJobDraft = async (id: number): Promise<void> => {
    const store = await getStore(AGENT_JOB_DRAFT_STORE, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};