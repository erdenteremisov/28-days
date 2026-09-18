import { getAllDays, getAllExperiments, getMeta } from '../db.js';
import { calcCurrentDayNumber, todayDateISO, addDaysISO, formatDateHuman } from '../state.js';
import { buildWeek1Prompt, buildWeek2Prompt, buildWeek3Prompt, buildFinalPrompt } from '../ai-prompt.js';
import type { DayEntry, Experiment, MetaData } from '../types.js';

function daysInRange(all: DayEntry[], start: number, end: number): DayEntry[] {
  return all.filter((d) => d.dayNumber >= start && d.dayNumber <= end);
}

interface PromptOption {
  id: string;
  title: string;
  description: string;
  minDay: number;
  build: (days: DayEntry[], experiments: Experiment[], meta: MetaData) => string;
}

export async function renderAi(root: HTMLElement): Promise<void> {
  root.innerHTML = '<div class="screen-loading">Загрузка…</div>';

  let meta, days, experiments;
  try {
    [meta, days, experiments] = await Promise.all([getMeta(), getAllDays(), getAllExperiments()]);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<div class="screen-error">Не удалось загрузить данные.</div>';
    return;
  }
  if (!meta.startDateISO) {
    root.innerHTML = '<div class="screen-error">Эксперимент ещё не начат.</div>';
    return;
  }
  const startDateISO = meta.startDateISO;
  const currentDay = calcCurrentDayNumber(startDateISO, todayDateISO());

  const options: PromptOption[] = [
    {
      id: 'week1',
      title: 'Анализ недели 1 (дни 1–7)',
      description: 'Первые наблюдения и гипотеза для эксперимента №1.',
      minDay: 7,
      build: (allDays, _exps, m) => buildWeek1Prompt(m, daysInRange(allDays, 1, 7)),
    },
    {
      id: 'week2',
      title: 'Анализ недели 2 (дни 8–14)',
      description: 'Проверка эксперимента №1.',
      minDay: 14,
      build: (allDays, exps, m) =>
        buildWeek2Prompt(m, daysInRange(allDays, 1, 7), daysInRange(allDays, 8, 14), exps.find((e) => e.number === 1)),
    },
    {
      id: 'week3',
      title: 'Анализ недели 3 (дни 15–21)',
      description: 'Повторяемость паттернов и гипотеза для эксперимента №3.',
      minDay: 21,
      build: (allDays, exps, m) =>
        buildWeek3Prompt(
          m,
          daysInRange(allDays, 1, 7),
          daysInRange(allDays, 8, 14),
          daysInRange(allDays, 15, 21),
          exps.find((e) => e.number === 1),
          exps.find((e) => e.number === 2)
        ),
    },
    {
      id: 'final',
      title: 'Финальное интервью (дни 1–28)',
      description: 'Полный разбор 28 дней и три итоговые формулировки.',
      minDay: 28,
      build: (allDays, exps, m) =>
        buildFinalPrompt(
          m,
          daysInRange(allDays, 1, 7),
          daysInRange(allDays, 8, 14),
          daysInRange(allDays, 15, 21),
          daysInRange(allDays, 22, 28),
          exps.find((e) => e.number === 1),
          exps.find((e) => e.number === 2),
          exps.find((e) => e.number === 3)
        ),
    },
  ];

  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen ai-screen';
  wrap.innerHTML = `
    <h1 class="screen-title">AI-анализ</h1>
    <p class="screen-subtitle">Приложение не отправляет данные никуда само. Оно готовит текст, который ты вставляешь в ChatGPT, Claude или Gemini.</p>
    <div id="ai-options"></div>
    <div id="ai-output"></div>
  `;
  root.appendChild(wrap);

  const optionsEl = wrap.querySelector<HTMLDivElement>('#ai-options')!;
  const outputEl = wrap.querySelector<HTMLDivElement>('#ai-output')!;

  for (const opt of options) {
    const available = currentDay >= opt.minDay;
    const card = document.createElement('button');
    card.className = 'ai-option' + (available ? '' : ' ai-option--locked');
    card.disabled = !available;
    const unlockDate = formatDateHuman(addDaysISO(startDateISO, opt.minDay - 1));
    card.innerHTML = `
      <div class="ai-option__title">${opt.title}</div>
      <div class="ai-option__desc">${available ? opt.description : `Откроется ${unlockDate} (день ${opt.minDay})`}</div>
    `;
    if (available) {
      card.addEventListener('click', () => showPrompt(opt));
    }
    optionsEl.appendChild(card);
  }

  function showPrompt(opt: PromptOption): void {
    const text = opt.build(days!, experiments!, meta!);
    outputEl.innerHTML = `
      <div class="ai-prompt">
        <div class="ai-prompt__label">${opt.title}</div>
        <textarea class="input input--textarea ai-prompt__text" id="ai-prompt-text" rows="10" readonly></textarea>
        <button class="btn btn--primary btn--block" id="ai-copy">Скопировать промт</button>
        <div class="save-confirm" id="ai-copy-confirm" hidden>Промт скопирован</div>
      </div>
    `;
    // Текст промпта - через .value, а не через innerHTML/интерполяцию строки.
    const textarea = outputEl.querySelector<HTMLTextAreaElement>('#ai-prompt-text')!;
    textarea.value = text;
    outputEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    outputEl.querySelector('#ai-copy')!.addEventListener('click', async () => {
      const confirm = outputEl.querySelector<HTMLDivElement>('#ai-copy-confirm')!;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          textarea.select();
          document.execCommand('copy');
        }
        confirm.hidden = false;
        setTimeout(() => (confirm.hidden = true), 2500);
      } catch (err) {
        console.error('Copy failed', err);
        textarea.select();
        alert('Не удалось скопировать автоматически. Текст выделен — скопируй его вручную (Ctrl/Cmd+C).');
      }
    });
  }
}
