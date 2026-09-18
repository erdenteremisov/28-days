// Основные типы данных приложения "28 дней — личный эксперимент"

export interface OnboardingAnswers {
  concern: string; // Что сейчас больше всего беспокоит тебя в твоей жизни?
  goal: string; // Что ты хочешь понять за эти 28 дней?
  changeIfUseful: string; // Если эксперимент окажется полезным, что ты хотел бы изменить?
}

// 'system' убран по требованию: теперь только явный выбор пользователя.
export type ThemePreference = 'light' | 'dark';

export interface MetaData {
  startDateISO: string | null; // дата начала эксперимента, YYYY-MM-DD
  onboardingAnswers: OnboardingAnswers | null;
  onboardingCompleted: boolean;
  lastSeenDay: number; // для расчёта "новых" завершённых стадий на Главной
  dismissedPrompts: number[]; // номера недель, для которых пользователь уже открывал AI-анализ
  themePreference: ThemePreference;
}

// Один день дневника. dayNumber — номер дня эксперимента (1..28), а не дата.
// Все порядковые шкалы (energy, satisfaction, sleepQuality, tension) — 1-5,
// это осознанные уровни состояния, а не точные измерения (см. AI-промпты).
export interface DayEntry {
  dayNumber: number;
  dateISO: string; // фактическая календарная дата, когда день был сохранён/относится
  sleepHours: number | null;
  screenTimeHours: number | null;
  shortsHours: number | null;
  workHours: number | null;
  mainGoalHours: number | null;
  activityMinutes: number | null;
  energy: number | null; // 1-5, уровень энергии за день
  satisfaction: number | null; // 1-5, удовлетворённость днём
  sleepQuality: number | null; // 1-5, насколько выспавшимся человек себя чувствует (не то же самое, что sleepHours)
  tension: number | null; // 1-5, уровень напряжения/стресса за день
  qualityCommunicationHours: number | null; // доп.
  unplannedSpendingRub: number | null; // доп.
  note: string; // "Что сегодня больше всего повлияло на твой день?" до 200 симв.
  updatedAtISO: string;
}

export type ExperimentStatus = 'upcoming' | 'active' | 'completed';

// Упрощено до одного большого текстового поля: вся структура гипотезы
// (что изменить, что наблюдать, критерии) уже содержится в тексте, который
// формулирует внешний AI. Приложение просто хранит и отображает этот текст,
// не пытаясь парсить его на части.
export interface Experiment {
  number: 1 | 2 | 3;
  hypothesis: string; // текст целиком, как есть, вставленный пользователем из AI
  startDayNumber: number;
  endDayNumber: number;
  status: ExperimentStatus;
  updatedAtISO: string;
}

export type StageId = 'observation' | 'experiment1' | 'experiment2' | 'experiment3' | 'finished';

export interface Stage {
  id: StageId;
  title: string;
  rangeStart: number;
  rangeEnd: number;
}

export const STAGES: Stage[] = [
  { id: 'observation', title: 'Наблюдение', rangeStart: 1, rangeEnd: 7 },
  { id: 'experiment1', title: 'Эксперимент №1', rangeStart: 8, rangeEnd: 14 },
  { id: 'experiment2', title: 'Эксперимент №2', rangeStart: 15, rangeEnd: 21 },
  { id: 'experiment3', title: 'Эксперимент №3', rangeStart: 22, rangeEnd: 28 },
];

export const TOTAL_DAYS = 28;

export type ScreenId = 'home' | 'today' | 'experiment' | 'ai' | 'summary';
