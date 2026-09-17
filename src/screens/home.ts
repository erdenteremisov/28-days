import { getAllDays, getMeta } from '../db.js';
import { calcCurrentDayNumber, getStageForDay, isExperimentOver, todayDateISO } from '../state.js';
import { navigateTo } from '../nav.js';
import { TOTAL_DAYS } from '../types.js';

const STAGE_MESSAGES: Record<string, string> = {
  observation: 'Сейчас мы просто собираем данные о том, как проходят твои дни — без выводов и без давления.',
  experiment1: 'Идёт первая проверка гипотезы. Продолжай отмечать дни как обычно.',
  experiment2: 'Вторая гипотеза проверяется. Сравним её с первой неделей и первым экспериментом.',
  consolidation: 'Финальная неделя. Закрепляем то, что уже подтвердилось.',
  finished: 'Эксперимент завершён.',
};

export async function renderHome(root: HTMLElement): Promise<void> {
  root.innerHTML = '<div class="screen-loading">Загрузка…</div>';

  let meta;
  let days;
  try {
    [meta, days] = await Promise.all([getMeta(), getAllDays()]);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<div class="screen-error">Не удалось загрузить данные. Попробуй перезапустить приложение.</div>';
    return;
  }

  if (!meta.startDateISO) {
    // Не должно происходить в норме (onboarding блокирует это состояние), но подстрахуемся.
    root.innerHTML = '<div class="screen-error">Эксперимент ещё не начат.</div>';
    return;
  }

  const today = todayDateISO();
  const dayNumber = calcCurrentDayNumber(meta.startDateISO, today);
  const over = isExperimentOver(meta.startDateISO, today);
  const stage = getStageForDay(dayNumber);
  const filledDayNumbers = new Set(days.map((d) => d.dayNumber));
  const todayFilled = filledDayNumbers.has(dayNumber);

  // Найдём ближайший незаполненный день до текущего (не включая сегодня)
  let firstUnfilled: number | null = null;
  for (let n = 1; n < dayNumber; n++) {
    if (!filledDayNumbers.has(n)) {
      firstUnfilled = n;
      break;
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'screen home-screen';

  const stageMsg = over ? STAGE_MESSAGES.finished : STAGE_MESSAGES[stage.id];

  let stageTransitionNote = '';
  if (over) {
    stageTransitionNote = 'Все 28 дней собраны. Загляни в «Итог», чтобы подготовить финальный AI-анализ.';
  } else if (dayNumber === 7 && todayFilled) {
    stageTransitionNote = 'Первая неделя завершена. Пора провести AI-анализ недели 1.';
  } else if (dayNumber === 14 && todayFilled) {
    stageTransitionNote = 'Эксперимент №1 завершён. Посмотри AI-анализ недели 2.';
  } else if (dayNumber === 21 && todayFilled) {
    stageTransitionNote = 'Эксперимент №2 завершён. Посмотри AI-анализ недели 3.';
  }

  wrap.innerHTML = `
    <div class="home-card">
      <div class="home-card__day">День ${dayNumber} из ${TOTAL_DAYS}</div>
      <div class="home-card__stage">${stage.title}</div>
      <p class="home-card__text">${stageMsg}</p>
      ${stageTransitionNote ? `<div class="home-card__note">${stageTransitionNote}</div>` : ''}
      ${
        !over
          ? `<button class="btn btn--primary btn--block" id="home-cta">${
              todayFilled ? 'Изменить сегодняшний день' : 'Записать сегодняшний день'
            }</button>`
          : `<button class="btn btn--primary btn--block" id="home-cta-summary">Открыть «Итог»</button>`
      }
      ${
        firstUnfilled !== null
          ? `<button class="btn btn--ghost btn--block" id="home-fill-missed">День ${firstUnfilled} ещё не заполнен — заполнить</button>`
          : ''
      }
    </div>
    <div class="home-progress" aria-hidden="true">
      ${renderProgressDots(dayNumber, filledDayNumbers)}
    </div>
    <p class="privacy-note privacy-note--footer">Все данные хранятся только на этом устройстве и никуда не отправляются.</p>
  `;

  root.innerHTML = '';
  root.appendChild(wrap);

  wrap.querySelector('#home-cta')?.addEventListener('click', () => navigateTo('today'));
  wrap.querySelector('#home-cta-summary')?.addEventListener('click', () => navigateTo('summary'));
  wrap.querySelector('#home-fill-missed')?.addEventListener('click', () => {
    navigateTo('today');
    window.dispatchEvent(new CustomEvent('experiment28:open-day', { detail: { dayNumber: firstUnfilled } }));
  });
}

function renderProgressDots(currentDay: number, filled: Set<number>): string {
  let html = '';
  for (let n = 1; n <= TOTAL_DAYS; n++) {
    const cls = filled.has(n) ? 'filled' : n === currentDay ? 'current' : 'empty';
    html += `<span class="home-progress__dot home-progress__dot--${cls}"></span>`;
  }
  return html;
}
