import { getDay, saveDay, getMeta } from '../db.js';
import { calcCurrentDayNumber, todayDateISO, addDaysISO, formatDateHuman } from '../state.js';
import { SATISFACTION_LEVELS, ENERGY_LEVELS, SLEEP_QUALITY_LEVELS, TENSION_LEVELS } from '../scale-icons.js';
const NOTE_MAX = 200;
const REQUIRED_FIELDS = [
    { key: 'sleepHours', label: 'Сон', unit: 'ч', max: 14, step: 0.5 },
    { key: 'screenTimeHours', label: 'Экранное время', unit: 'ч', max: 16, step: 0.5 },
    { key: 'shortsHours', label: 'Shorts / Reels / TikTok', unit: 'ч', max: 10, step: 0.5 },
    { key: 'workHours', label: 'Работа / учёба', unit: 'ч', max: 16, step: 0.5 },
    { key: 'mainGoalHours', label: 'Главное дело / личная цель', unit: 'ч', max: 12, step: 0.5 },
    { key: 'activityMinutes', label: 'Физическая активность', unit: 'мин', max: 240, step: 5 },
];
const OPTIONAL_FIELDS = [
    { key: 'qualityCommunicationHours', label: 'Качественное общение', unit: 'ч', max: 10, step: 0.5, optional: true },
    { key: 'unplannedSpendingRub', label: 'Незапланированные траты', unit: '₽', max: 50000, step: 100, optional: true },
];
const SCALE_FIELDS = [
    { key: 'energy', label: 'Энергия', levels: ENERGY_LEVELS },
    { key: 'satisfaction', label: 'Удовлетворённость днём', levels: SATISFACTION_LEVELS },
    { key: 'sleepQuality', label: 'Насколько ты выспался?', levels: SLEEP_QUALITY_LEVELS },
    { key: 'tension', label: 'Напряжение за день', levels: TENSION_LEVELS },
];
function emptyDay(dayNumber, dateISO) {
    return {
        dayNumber,
        dateISO,
        sleepHours: null,
        screenTimeHours: null,
        shortsHours: null,
        workHours: null,
        mainGoalHours: null,
        activityMinutes: null,
        energy: null,
        satisfaction: null,
        sleepQuality: null,
        tension: null,
        qualityCommunicationHours: null,
        unplannedSpendingRub: null,
        note: '',
        updatedAtISO: new Date().toISOString(),
    };
}
export async function renderToday(root, requestedDay) {
    root.innerHTML = '<div class="screen-loading">Загрузка…</div>';
    let meta;
    try {
        meta = await getMeta();
    }
    catch (err) {
        console.error(err);
        root.innerHTML = '<div class="screen-error">Не удалось загрузить данные.</div>';
        return;
    }
    if (!meta.startDateISO) {
        root.innerHTML = '<div class="screen-error">Эксперимент ещё не начат.</div>';
        return;
    }
    const today = todayDateISO();
    const currentDayNumber = calcCurrentDayNumber(meta.startDateISO, today);
    let dayNumber = requestedDay ?? currentDayNumber;
    if (dayNumber < 1)
        dayNumber = 1;
    const startDateISO = meta.startDateISO;
    // Кнопка "вперёд" теперь активна даже за пределами текущего дня — там показываем
    // заблокированное состояние с точной датой открытия, а не молчаливый disabled.
    const isLocked = dayNumber > currentDayNumber;
    if (isLocked) {
        renderLocked(dayNumber, startDateISO);
        return;
    }
    const dateForDay = addDaysISO(startDateISO, dayNumber - 1);
    let entry;
    try {
        entry = (await getDay(dayNumber)) ?? emptyDay(dayNumber, dateForDay);
    }
    catch (err) {
        console.error(err);
        entry = emptyDay(dayNumber, dateForDay);
    }
    build(entry, dayNumber, currentDayNumber);
    function renderLocked(dNum, startISO) {
        root.innerHTML = '';
        const dateStr = formatDateHuman(addDaysISO(startISO, dNum - 1));
        const wrap = document.createElement('div');
        wrap.className = 'screen today-screen';
        wrap.innerHTML = `
      <div class="today-header">
        <button class="icon-btn" id="day-prev" aria-label="Предыдущий день">‹</button>
        <div class="today-header__title">
          <div class="today-header__day">День ${dNum}</div>
          <div class="today-header__date">${dateStr}</div>
        </div>
        <button class="icon-btn" id="day-next" aria-label="Следующий день" disabled>›</button>
      </div>
      <div class="locked-day">
        <div class="locked-day__icon">🔒</div>
        <div class="locked-day__title">Этот день ещё не наступил</div>
        <p class="locked-day__text">Он откроется ${dateStr}, после полуночи по времени твоего устройства.</p>
      </div>
    `;
        root.appendChild(wrap);
        wrap.querySelector('#day-prev').addEventListener('click', () => renderToday(root, dNum - 1));
    }
    function build(data, dNum, maxDay) {
        root.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'screen today-screen';
        const dateStr = formatDateHuman(addDaysISO(startDateISO, dNum - 1));
        const dayLabel = dNum === maxDay ? `Сегодня, ${dateStr}` : dateStr;
        wrap.innerHTML = `
      <div class="today-header">
        <button class="icon-btn" id="day-prev" aria-label="Предыдущий день" ${dNum <= 1 ? 'disabled' : ''}>‹</button>
        <div class="today-header__title">
          <div class="today-header__day">День ${dNum}</div>
          <div class="today-header__date">${dayLabel}</div>
        </div>
        <button class="icon-btn" id="day-next" aria-label="Следующий день">›</button>
      </div>
      <div class="field-list" id="field-list"></div>
      <div class="scale-list" id="scale-list"></div>
      <div class="field-group">
        <label class="field-label" for="note-input">Что сегодня больше всего повлияло на твой день?</label>
        <textarea class="input input--textarea" id="note-input" rows="2" maxlength="${NOTE_MAX}" placeholder="Одна короткая фраза…"></textarea>
        <div class="note-counter" id="note-counter">0 / ${NOTE_MAX}</div>
      </div>
      <details class="optional-toggle">
        <summary>Дополнительно (необязательно)</summary>
        <div class="field-list" id="optional-field-list"></div>
      </details>
      <button class="btn btn--primary btn--block" id="save-day">СОХРАНИТЬ ДЕНЬ</button>
      <div class="save-confirm" id="save-confirm" hidden>День сохранён ✓</div>
    `;
        root.appendChild(wrap);
        const fieldListEl = wrap.querySelector('#field-list');
        const optionalListEl = wrap.querySelector('#optional-field-list');
        const scaleListEl = wrap.querySelector('#scale-list');
        const noteInput = wrap.querySelector('#note-input');
        const noteCounter = wrap.querySelector('#note-counter');
        for (const f of REQUIRED_FIELDS)
            fieldListEl.appendChild(renderStepper(f, data));
        for (const f of OPTIONAL_FIELDS)
            optionalListEl.appendChild(renderStepper(f, data));
        for (const s of SCALE_FIELDS)
            scaleListEl.appendChild(renderScale(s, data));
        noteInput.value = data.note ?? '';
        noteCounter.textContent = `${noteInput.value.length} / ${NOTE_MAX}`;
        noteInput.addEventListener('input', () => {
            noteCounter.textContent = `${noteInput.value.length} / ${NOTE_MAX}`;
        });
        wrap.querySelector('#day-prev')?.addEventListener('click', () => {
            if (dNum > 1)
                renderToday(root, dNum - 1);
        });
        wrap.querySelector('#day-next')?.addEventListener('click', () => {
            renderToday(root, dNum + 1);
        });
        wrap.querySelector('#save-day').addEventListener('click', async () => {
            const updated = {
                ...data,
                note: noteInput.value.trim().slice(0, NOTE_MAX),
                updatedAtISO: new Date().toISOString(),
            };
            try {
                await saveDay(updated);
                const confirm = wrap.querySelector('#save-confirm');
                confirm.hidden = false;
                setTimeout(() => {
                    confirm.hidden = true;
                }, 2000);
            }
            catch (err) {
                console.error('Failed to save day', err);
                alert('Не удалось сохранить день. Проверь свободное место на устройстве и попробуй снова.');
            }
        });
    }
    function renderStepper(f, data) {
        const row = document.createElement('div');
        row.className = 'field-row';
        const value = data[f.key] ?? 0;
        row.innerHTML = `
      <div class="field-row__label">${f.label}</div>
      <div class="stepper">
        <button type="button" class="stepper__btn" data-action="dec" aria-label="Уменьшить">−</button>
        <div class="stepper__value"><span class="stepper__number">${formatNum(value)}</span><span class="stepper__unit">${f.unit}</span></div>
        <button type="button" class="stepper__btn" data-action="inc" aria-label="Увеличить">+</button>
      </div>
    `;
        const numberEl = row.querySelector('.stepper__number');
        let current = value;
        row.querySelector('[data-action="dec"]').addEventListener('click', () => {
            current = Math.max(0, round(current - f.step, f.step));
            numberEl.textContent = formatNum(current);
            data[f.key] = current;
        });
        row.querySelector('[data-action="inc"]').addEventListener('click', () => {
            current = Math.min(f.max, round(current + f.step, f.step));
            numberEl.textContent = formatNum(current);
            data[f.key] = current;
        });
        return row;
    }
    function renderScale(s, data) {
        const row = document.createElement('div');
        row.className = 'icon-scale';
        const selected = data[s.key];
        row.innerHTML = `
      <div class="icon-scale__label">${s.label}</div>
      <div class="icon-scale__options" role="radiogroup" aria-label="${s.label}"></div>
    `;
        const optionsEl = row.querySelector('.icon-scale__options');
        for (const level of s.levels) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'icon-scale__option' + (selected === level.value ? ' icon-scale__option--selected' : '');
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', selected === level.value ? 'true' : 'false');
            btn.innerHTML = `
        <svg viewBox="0 0 24 24" class="icon-scale__icon">${level.icon}</svg>
        <span class="icon-scale__option-label">${level.label}</span>
      `;
            btn.addEventListener('click', () => {
                data[s.key] = level.value;
                optionsEl.querySelectorAll('.icon-scale__option').forEach((el) => {
                    el.classList.remove('icon-scale__option--selected');
                    el.setAttribute('aria-checked', 'false');
                });
                btn.classList.add('icon-scale__option--selected');
                btn.setAttribute('aria-checked', 'true');
            });
            optionsEl.appendChild(btn);
        }
        return row;
    }
}
function round(n, step) {
    const precision = step < 1 ? 1 : 0;
    return Number(n.toFixed(precision));
}
function formatNum(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
