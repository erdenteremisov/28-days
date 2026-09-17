import { exportAllData, importAllData, type ExportedData } from './db.js';

export async function downloadBackup(): Promise<void> {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `28-days-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickAndRestoreBackup(): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error('Файл не выбран.'));
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as ExportedData;
        await importAllData(data);
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Не удалось прочитать файл.'));
      }
    });
    input.click();
  });
}
