const DB_NAME = 'experiment28-db';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_DAYS = 'days';
const STORE_EXPERIMENTS = 'experiments';
let dbPromise = null;
function openDB() {
    if (dbPromise)
        return dbPromise;
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
function tx(storeName, mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        let request;
        try {
            request = fn(store);
        }
        catch (err) {
            reject(err);
            return;
        }
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Ошибка операции с базой данных.'));
    }));
}
const DEFAULT_META = {
    startDateISO: null,
    onboardingAnswers: null,
    onboardingCompleted: false,
    lastSeenDay: 0,
    dismissedPrompts: [],
    themePreference: 'system',
};
export async function getMeta() {
    try {
        const rows = await tx(STORE_META, 'readonly', (s) => s.getAll());
        const map = {};
        for (const row of rows)
            map[row.key] = row.value;
        return { ...DEFAULT_META, ...map };
    }
    catch (err) {
        console.error('getMeta failed, falling back to defaults', err);
        return { ...DEFAULT_META };
    }
}
export async function setMetaField(key, value) {
    await tx(STORE_META, 'readwrite', (s) => s.put({ key, value }));
}
export async function saveDay(entry) {
    await tx(STORE_DAYS, 'readwrite', (s) => s.put(entry));
}
export async function getDay(dayNumber) {
    return tx(STORE_DAYS, 'readonly', (s) => s.get(dayNumber));
}
export async function getAllDays() {
    const days = await tx(STORE_DAYS, 'readonly', (s) => s.getAll());
    return days.sort((a, b) => a.dayNumber - b.dayNumber);
}
export async function saveExperiment(exp) {
    await tx(STORE_EXPERIMENTS, 'readwrite', (s) => s.put(exp));
}
export async function getExperiment(number) {
    return tx(STORE_EXPERIMENTS, 'readonly', (s) => s.get(number));
}
export async function getAllExperiments() {
    const list = await tx(STORE_EXPERIMENTS, 'readonly', (s) => s.getAll());
    return list.sort((a, b) => a.number - b.number);
}
export async function exportAllData() {
    const [meta, days, experiments] = await Promise.all([getMeta(), getAllDays(), getAllExperiments()]);
    return {
        version: 1,
        exportedAtISO: new Date().toISOString(),
        meta,
        days,
        experiments,
    };
}
export async function clearAllData() {
    await Promise.all([
        tx(STORE_META, 'readwrite', (s) => s.clear()),
        tx(STORE_DAYS, 'readwrite', (s) => s.clear()),
        tx(STORE_EXPERIMENTS, 'readwrite', (s) => s.clear()),
    ]);
}
export async function importAllData(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.days) || !Array.isArray(data.experiments)) {
        throw new Error('Файл резервной копии повреждён или имеет неизвестный формат.');
    }
    await clearAllData();
    const metaEntries = Object.entries(data.meta ?? {});
    for (const [key, value] of metaEntries) {
        await setMetaField(key, value);
    }
    for (const day of data.days) {
        await saveDay(day);
    }
    for (const exp of data.experiments) {
        await saveExperiment(exp);
    }
}
