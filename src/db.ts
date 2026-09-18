// Тонкая обёртка над IndexedDB. Никакого localStorage для пользовательских данных.
import type { DayEntry, Experiment, MetaData } from './types.js';

const DB_NAME = 'experiment28-db';
const DB_VERSION = 1;

const STORE_META = 'meta';
const STORE_DAYS = 'days';
const STORE_EXPERIMENTS = 'experiments';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB не поддерживается этим браузером.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_DAYS)) {
        db.createObjectStore(STORE_DAYS, { keyPath: 'dayNumber' });
      }
      if (!db.objectStoreNames.contains(STORE_EXPERIMENTS)) {
        db.createObjectStore(STORE_EXPERIMENTS, { keyPath: 'number' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Не удалось открыть базу данных.'));
    req.onblocked = () => reject(new Error('База данных заблокирована другой вкладкой.'));
  });
  return dbPromise;
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        let request: IDBRequest<T>;
        try {
          request = fn(store);
        } catch (err) {
          reject(err as Error);
          return;
        }
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Ошибка операции с базой данных.'));
      })
  );
}

const DEFAULT_META: MetaData = {
  startDateISO: null,
  onboardingAnswers: null,
  onboardingCompleted: false,
  lastSeenDay: 0,
  dismissedPrompts: [],
  themePreference: 'light',
};

export async function getMeta(): Promise<MetaData> {
  try {
    const rows = await tx<any[]>(STORE_META, 'readonly', (s) => s.getAll());
    const map: Record<string, any> = {};
    for (const row of rows) map[row.key] = row.value;
    const merged = { ...DEFAULT_META, ...map };
    // Миграция: раньше существовал вариант темы 'system', теперь только light/dark.
    if (merged.themePreference !== 'light' && merged.themePreference !== 'dark') {
      merged.themePreference = 'light';
    }
    return merged;
  } catch (err) {
    console.error('getMeta failed, falling back to defaults', err);
    return { ...DEFAULT_META };
  }
}

export async function setMetaField<K extends keyof MetaData>(key: K, value: MetaData[K]): Promise<void> {
  await tx(STORE_META, 'readwrite', (s) => s.put({ key, value }));
}

export async function saveDay(entry: DayEntry): Promise<void> {
  await tx(STORE_DAYS, 'readwrite', (s) => s.put(entry));
}

export async function getDay(dayNumber: number): Promise<DayEntry | undefined> {
  return tx<DayEntry | undefined>(STORE_DAYS, 'readonly', (s) => s.get(dayNumber));
}

export async function getAllDays(): Promise<DayEntry[]> {
  const days = await tx<DayEntry[]>(STORE_DAYS, 'readonly', (s) => s.getAll());
  return days.sort((a, b) => a.dayNumber - b.dayNumber);
}

export async function saveExperiment(exp: Experiment): Promise<void> {
  await tx(STORE_EXPERIMENTS, 'readwrite', (s) => s.put(exp));
}

export async function getExperiment(number: number): Promise<Experiment | undefined> {
  return tx<Experiment | undefined>(STORE_EXPERIMENTS, 'readonly', (s) => s.get(number));
}

export async function getAllExperiments(): Promise<Experiment[]> {
  const list = await tx<Experiment[]>(STORE_EXPERIMENTS, 'readonly', (s) => s.getAll());
  return list.sort((a, b) => a.number - b.number);
}

export interface ExportedData {
  version: 1;
  exportedAtISO: string;
  meta: MetaData;
  days: DayEntry[];
  experiments: Experiment[];
}

export async function exportAllData(): Promise<ExportedData> {
  const [meta, days, experiments] = await Promise.all([getMeta(), getAllDays(), getAllExperiments()]);
  return {
    version: 1,
    exportedAtISO: new Date().toISOString(),
    meta,
    days,
    experiments,
  };
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    tx(STORE_META, 'readwrite', (s) => s.clear()),
    tx(STORE_DAYS, 'readwrite', (s) => s.clear()),
    tx(STORE_EXPERIMENTS, 'readwrite', (s) => s.clear()),
  ]);
}

export async function importAllData(data: ExportedData): Promise<void> {
  if (!data || data.version !== 1 || !Array.isArray(data.days) || !Array.isArray(data.experiments)) {
    throw new Error('Файл резервной копии повреждён или имеет неизвестный формат.');
  }
  await clearAllData();
  const metaEntries = Object.entries(data.meta ?? {});
  for (const [key, value] of metaEntries) {
    await setMetaField(key as keyof MetaData, value as never);
  }
  for (const day of data.days) {
    await saveDay(day);
  }
  for (const exp of data.experiments) {
    await saveExperiment(exp);
  }
}
