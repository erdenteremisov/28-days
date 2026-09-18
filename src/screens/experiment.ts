import { getExperiment, saveExperiment, getMeta } from '../db.js';
import { calcCurrentDayNumber, todayDateISO } from '../state.js';
import type { Experiment, ExperimentStatus } from '../types.js';

const EXPERIMENT_RANGES: Record<1 | 2 | 3, [number, number]> = {
  1: [8, 14],
  2: [15, 21],
  3: [22, 28],
};

function emptyExperiment(number: 1 | 2 | 3): Experiment {
  const [start, end] = EXPERIMENT_RANGES[number];
  return {
    number,
    hypothesis: '',
    startDayNumber: start,
    endDayNumber: end,
    status: 'upcoming',
    updatedAtISO: new Date().toISOString(),
  };
}

function computeStatus(number: 1 | 2 | 3, currentDay: number): ExperimentStatus {
  const [start, end] = EXPERIMENT_RANGES[number];
  if (currentDay < start) return 'upcoming';
  if (currentDay > end) return 'completed';
  return 'active';
}

const STATUS_LABEL: Record<ExperimentStatus, string> = {
  upcoming: 'Ещё не начат',
  active: 'Идёт сейчас',
  completed: 'Завершён',
};

export async function renderExperiment(root: HTMLElement, openNumber?: 1 | 2 | 3): Promise<void> {
  root.innerHTML = '<div class="screen-loading">Загрузка…</div>';

  let meta;
  try {
    meta = await getMeta();
  } catch (err) {
    console.error(err);
    root.innerHTML = '<div class="screen-error">Не удалось загрузить данные.</div>';
    return;
  }
  if (!meta.startDateISO) {
    root.innerHTML = '<div class="screen-error">Эксперимент ещё не начат.</div>';
    return;
  }
  const currentDay = calcCurrentDayNumber(meta.startDateISO, todayDateISO());

  if (openNumber) {
    await renderDetail(openNumber);
    return;
  }

  const [exp1, exp2, exp3] = await Promise.all([getExperiment(1), getExperiment(2), getExperiment(3)]);
  const items = [exp1 ?? emptyExperiment(1), exp2 ?? emptyExperiment(2), exp3 ?? emptyExperiment(3)].map((e) => ({
    ...e,
    status: computeStatus(e.number, currentDay),
  }));

  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen experiment-screen';
  const title = document.createElement('h1');
  title.className = 'screen-title';
  title.textContent = 'Эксперименты';
  wrap.appendChild(title);

  for (const exp of items) {
    const card = document.createElement('button');
    card.className = 'experiment-card';
    // Собираем разметку из безопасных, статичных частей, а текст гипотезы
    // (пользовательский ввод) вставляем отдельно через textContent, а не
    // через innerHTML - это защищает от XSS даже если гипотеза содержит
    // символы, которые выглядят как HTML-теги.
    card.innerHTML = `
      <div class="experiment-card__header">
        <span class="experiment-card__number">Эксперимент №${exp.number}</span>
        <span class="experiment-card__status experiment-card__status--${exp.status}">${STATUS_LABEL[exp.status]}</span>
      </div>
      <div class="experiment-card__hypothesis"></div>
      <div class="experiment-card__days">Дни ${exp.startDayNumber}–${exp.endDayNumber}</div>
    `;
    const hypothesisEl = card.querySelector<HTMLDivElement>('.experiment-card__hypothesis')!;
    hypothesisEl.textContent = exp.hypothesis || 'Гипотеза ещё не сохранена';
    card.addEventListener('click', () => renderDetail(exp.number as 1 | 2 | 3));
    wrap.appendChild(card);
  }

  const hint = document.createElement('p');
  hint.className = 'experiment-hint';
  hint.textContent =
    'Гипотезу для каждого эксперимента формулирует AI по итогам недельного анализа — скопируй готовый блок из ответа AI и вставь его сюда целиком.';
  wrap.appendChild(hint);

  root.appendChild(wrap);

  async function renderDetail(number: 1 | 2 | 3): Promise<void> {
    root.innerHTML = '<div class="screen-loading">Загрузка…</div>';
    const existing = (await getExperiment(number)) ?? emptyExperiment(number);

    root.innerHTML = '';
    const detail = document.createElement('div');
    detail.className = 'screen experiment-detail';
    detail.innerHTML = `
      <button class="link-back" id="exp-back">‹ Все эксперименты</button>
      <h1 class="screen-title">Эксперимент №${number}</h1>
      <p class="screen-subtitle">Вставь сюда весь блок гипотезы, который тебе сформулировал AI — целиком, как есть.</p>
      <div class="field-group">
        <textarea class="input input--textarea experiment-hypothesis-textarea" id="exp-hypothesis" rows="10" placeholder="ЭКСПЕРИМЕНТ ${number}&#10;&#10;МОЯ ГИПОТЕЗА:&#10;..."></textarea>
      </div>
      <button class="btn btn--primary btn--block" id="exp-save">Сохранить</button>
      <div class="save-confirm" id="exp-save-confirm" hidden>Сохранено</div>
    `;
    root.appendChild(detail);

    // Значение вставляем через .value, а не в innerHTML/textContent верстки -
    // безопасно даже если сохранённый текст содержит спецсимволы.
    const textarea = detail.querySelector<HTMLTextAreaElement>('#exp-hypothesis')!;
    textarea.value = existing.hypothesis;

    detail.querySelector('#exp-back')!.addEventListener('click', () => renderExperiment(root));
    detail.querySelector('#exp-save')!.addEventListener('click', async () => {
      const updated: Experiment = {
        ...existing,
        hypothesis: textarea.value.trim(),
        updatedAtISO: new Date().toISOString(),
      };
      try {
        await saveExperiment(updated);
        const confirm = detail.querySelector<HTMLDivElement>('#exp-save-confirm')!;
        confirm.hidden = false;
        setTimeout(() => (confirm.hidden = true), 2000);
      } catch (err) {
        console.error('Failed to save experiment', err);
        alert('Не удалось сохранить эксперимент. Попробуй ещё раз.');
      }
    });
  }
}
