import { STAGES, TOTAL_DAYS, type Stage } from './types.js';

// Считаем номер текущего дня эксперимента относительно даты начала.
// Если пользователь не открывал приложение несколько дней, дни не "стоят на месте" -
// они просто продолжают расти, а пропущенные дни остаются доступны для заполнения позже.
export function calcCurrentDayNumber(startDateISO: string, todayISO: string = todayDateISO()): number {
  const start = dateOnly(startDateISO);
  const today = dateOnly(todayISO);
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayNumber = diffDays + 1; // день начала = День 1
  if (dayNumber < 1) return 1;
  if (dayNumber > TOTAL_DAYS) return TOTAL_DAYS;
  return dayNumber;
}

// Возвращает true, если эксперимент формально завершён (прошло 28+ дней с начала).
export function isExperimentOver(startDateISO: string, todayISO: string = todayDateISO()): boolean {
  const start = dateOnly(startDateISO);
  const today = dateOnly(todayISO);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays + 1 > TOTAL_DAYS;
}

export function dateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayDateISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getStageForDay(dayNumber: number): Stage {
  for (const stage of STAGES) {
    if (dayNumber >= stage.rangeStart && dayNumber <= stage.rangeEnd) return stage;
  }
  return STAGES[STAGES.length - 1];
}

// День считается последним днём стадии (важно для подсказок "пора сделать AI-анализ")
export function isLastDayOfStage(dayNumber: number): boolean {
  return STAGES.some((s) => s.rangeEnd === dayNumber);
}

export function isFirstDayOfStage(dayNumber: number): boolean {
  return STAGES.some((s) => s.rangeStart === dayNumber);
}

export function addDaysISO(startISO: string, offsetDays: number): string {
  const d = dateOnly(startISO);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateHuman(iso: string): string {
  const d = dateOnly(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
