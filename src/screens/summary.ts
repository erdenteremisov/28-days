import { getAllDays, getAllExperiments, getMeta, setMetaField, clearAllData } from '../db.js';
import { calcCurrentDayNumber, isExperimentOver, todayDateISO } from '../state.js';
import { downloadBackup, pickAndRestoreBackup } from '../export-import.js';
import { applyTheme } from '../theme.js';
import { TOTAL_DAYS, type OnboardingAnswers, type ThemePreference } from '../types.js';

const ONBOARDING_QUESTIONS: { key: keyof OnboardingAnswers; title: string }[] = [
  { key: 'concern', title: 'Что сейчас больше всего беспокоит тебя в твоей жизни?' },
  { key: 'goal', title: 'Что ты хочешь понять за эти 28 дней?' },
  { key: 'changeIfUseful', title: 'Если эксперимент окажется полезным, что ты хотел бы изменить?' },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

export async function renderSummary(root: HTMLElement): Promise<void> {
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

  const currentDay = calcCurrentDayNumber(meta.startDateISO, todayDateISO());
  const over = isExperimentOver(meta.startDateISO, todayDateISO());
  const filledCount = days.length;

  const avgOf = (key: 'energy' | 'satisfaction' | 'sleepQuality' | 'tension') => {
    const values = days.map((d) => d[key]).filter((v): v is number => typeof v === 'number');
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '—';
  };
  const avgEnergy = avgOf('energy');
  const avgSatisfaction = avgOf('satisfaction');
  const hasEnergy = days.some((d) => d.energy != null);
  const hasSatisfaction = days.some((d) => d.satisfaction != null);

  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'screen summary-screen';
  wrap.innerHTML = `
    <h1 class="screen-title">Итог</h1>
    <div class="summary-card">
      <div class="summary-card__row"><span>Заполнено дней</span><strong>${filledCount} из ${TOTAL_DAYS}</strong></div>
      <div class="summary-card__row"><span>Средняя энергия</span><strong>${avgEnergy}${hasEnergy ? '/5' : ''}</strong></div>
      <div class="summary-card__row"><span>Средняя удовлетворённость</span><strong>${avgSatisfaction}${hasSatisfaction ? '/5' : ''}</strong></div>
    </div>

    <div class="summary-experiments" id="summary-experiments"></div>

    ${
      over
        ? `<p class="screen-subtitle">Все 28 дней собраны. Загляни в раздел «AI» — там доступно финальное интервью.</p>`
        : `<p class="screen-subtitle">Сейчас день ${currentDay} из ${TOTAL_DAYS}. Итог по всем 28 дням появится ближе к концу эксперимента, но данные и эксперименты уже можно посмотреть здесь.</p>`
    }

    <div class="settings-section">
      <h2 class="settings-section__title">Твои ответы при старте</h2>
      <div class="onboarding-review" id="onboarding-review"></div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Оформление</h2>
      <div class="theme-toggle" id="theme-toggle"></div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Данные</h2>
      <p class="settings-section__text">Все данные хранятся только на этом устройстве и никуда не отправляются. Сделай резервную копию, если планируешь сменить телефон или браузер.</p>
      <button class="btn btn--secondary btn--block" id="btn-export">Экспортировать мои данные</button>
      <button class="btn btn--ghost btn--block" id="btn-import">Восстановить данные</button>
      <div class="save-confirm" id="settings-confirm" hidden></div>
    </div>

    <div class="settings-section">
      <h2 class="settings-section__title">Начать заново</h2>
      <p class="settings-section__text">Полностью удалит все дни, эксперименты и ответы на этом устройстве и начнёт эксперимент с чистого дня 1. Это необратимо.</p>
      <button class="btn btn--danger btn--block" id="btn-reset">Начать эксперимент заново</button>
    </div>
  `;
  root.appendChild(wrap);

  // ---------- Эксперименты ----------
  const expEl = wrap.querySelector<HTMLDivElement>('#summary-experiments')!;
  if (experiments.length === 0) {
    expEl.innerHTML = '<p class="screen-subtitle">Эксперименты появятся здесь после того, как будут описаны в разделе «Эксперимент».</p>';
  } else {
    for (const exp of experiments) {
      const card = document.createElement('div');
      card.className = 'summary-experiment-card';
      card.innerHTML = `
        <div class="summary-experiment-card__title">Эксперимент №${exp.number}</div>
        <div class="summary-experiment-card__text">${exp.hypothesis || 'Гипотеза не указана'}</div>
        ${exp.conclusion ? `<div class="summary-experiment-card__conclusion">Вывод: ${exp.conclusion}</div>` : ''}
      `;
      expEl.appendChild(card);
    }
  }

  // ---------- Ответы онбординга: просмотр + редактирование ----------
  const reviewEl = wrap.querySelector<HTMLDivElement>('#onboarding-review')!;
  renderOnboardingReview(reviewEl, meta.onboardingAnswers);

  function renderOnboardingReview(container: HTMLElement, answers: OnboardingAnswers | null): void {
    const current: OnboardingAnswers = answers ?? { concern: '', goal: '', changeIfUseful: '' };
    container.innerHTML = `
      ${ONBOARDING_QUESTIONS.map(
        (q) => `
        <div class="onboarding-review__item">
          <div class="onboarding-review__question">${q.title}</div>
          <div class="onboarding-review__answer">${escapeHtml(current[q.key]) || '<em>не указано</em>'}</div>
        </div>`
      ).join('')}
      <button class="btn btn--secondary btn--block" id="onboarding-edit-btn">Изменить ответы</button>
    `;
    container.querySelector('#onboarding-edit-btn')!.addEventListener('click', () => renderOnboardingEdit(container, current));
  }

  function renderOnboardingEdit(container: HTMLElement, current: OnboardingAnswers): void {
    container.innerHTML = `
      ${ONBOARDING_QUESTIONS.map(
        (q) => `
        <div class="field-group">
          <label class="field-label">${q.title}</label>
          <textarea class="input input--textarea" rows="2" data-key="${q.key}">${current[q.key]}</textarea>
        </div>`
      ).join('')}
      <p class="onboarding-edit-note">Изменения не повлияют на промпты, которые ты уже скопировал в AI раньше — только на будущие.</p>
      <button class="btn btn--primary btn--block" id="onboarding-save-btn">Сохранить</button>
      <button class="btn btn--ghost btn--block" id="onboarding-cancel-btn">Отмена</button>
    `;
    container.querySelector('#onboarding-cancel-btn')!.addEventListener('click', () => renderOnboardingReview(container, current));
    container.querySelector('#onboarding-save-btn')!.addEventListener('click', async () => {
      const updated: OnboardingAnswers = { ...current };
      container.querySelectorAll<HTMLTextAreaElement>('textarea[data-key]').forEach((el) => {
        const key = el.dataset.key as keyof OnboardingAnswers;
        updated[key] = el.value.trim();
      });
      try {
        await setMetaField('onboardingAnswers', updated);
        renderOnboardingReview(container, updated);
      } catch (err) {
        console.error('Failed to save onboarding answers', err);
        alert('Не удалось сохранить ответы. Попробуй ещё раз.');
      }
    });
  }

  // ---------- Тема ----------
  const themeToggleEl = wrap.querySelector<HTMLDivElement>('#theme-toggle')!;
  function renderThemeToggle(active: ThemePreference): void {
    themeToggleEl.innerHTML = THEME_OPTIONS.map(
      (opt) =>
        `<button type="button" class="theme-toggle__option${opt.value === active ? ' theme-toggle__option--selected' : ''}" data-theme-value="${opt.value}">${opt.label}</button>`
    ).join('');
    themeToggleEl.querySelectorAll<HTMLButtonElement>('[data-theme-value]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.themeValue as ThemePreference;
        applyTheme(value);
        renderThemeToggle(value);
        try {
          await setMetaField('themePreference', value);
        } catch (err) {
          console.error('Failed to save theme preference', err);
        }
      });
    });
  }
  renderThemeToggle(meta.themePreference ?? 'system');

  // ---------- Экспорт / импорт / сброс ----------
  const confirmEl = wrap.querySelector<HTMLDivElement>('#settings-confirm')!;
  function showConfirm(text: string): void {
    confirmEl.textContent = text;
    confirmEl.hidden = false;
    setTimeout(() => (confirmEl.hidden = true), 3000);
  }

  wrap.querySelector('#btn-export')!.addEventListener('click', async () => {
    try {
      await downloadBackup();
      showConfirm('Файл резервной копии сохранён.');
    } catch (err) {
      console.error(err);
      alert('Не удалось создать резервную копию.');
    }
  });

  wrap.querySelector('#btn-import')!.addEventListener('click', async () => {
    const ok = confirm('Восстановление заменит текущие данные на устройстве данными из файла. Продолжить?');
    if (!ok) return;
    try {
      await pickAndRestoreBackup();
      showConfirm('Данные восстановлены.');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Не удалось восстановить данные.');
    }
  });

  wrap.querySelector('#btn-reset')!.addEventListener('click', async () => {
    const ok = confirm('Все дни, эксперименты и ответы будут удалены без возможности восстановления. Начать заново?');
    if (!ok) return;
    const confirmAgain = confirm('Точно? Это действие нельзя отменить.');
    if (!confirmAgain) return;
    try {
      await clearAllData();
      window.location.hash = '';
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Не удалось сбросить данные. Попробуй ещё раз.');
    }
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
