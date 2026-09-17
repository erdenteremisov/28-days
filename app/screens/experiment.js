import { getExperiment, saveExperiment, getMeta } from '../db.js';
import { calcCurrentDayNumber, todayDateISO } from '../state.js';
const EXPERIMENT_RANGES = {
    1: [8, 14],
    2: [15, 21],
};
function emptyExperiment(number) {
    const [start, end] = EXPERIMENT_RANGES[number];
    return {
        number,
        hypothesis: '',
        reason: '',
        change: '',
        expectedResult: '',
        startDayNumber: start,
        endDayNumber: end,
        result: '',
        observations: '',
        conclusion: '',
        status: 'upcoming',
    };
}
function computeStatus(number, currentDay) {
    const [start, end] = EXPERIMENT_RANGES[number];
    if (currentDay < start)
        return 'upcoming';
    if (currentDay > end)
        return 'completed';
    return 'active';
}
export async function renderExperiment(root, openNumber) {
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
    const currentDay = calcCurrentDayNumber(meta.startDateISO, todayDateISO());
    if (openNumber) {
        await renderDetail(openNumber);
        return;
    }
    const [exp1, exp2] = await Promise.all([getExperiment(1), getExperiment(2)]);
    const items = [exp1 ?? emptyExperiment(1), exp2 ?? emptyExperiment(2)].map((e) => ({
        ...e,
        status: computeStatus(e.number, currentDay),
    }));
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen experiment-screen';
    wrap.innerHTML = `<h1 class="screen-title">Эксперименты</h1>`;
    const STATUS_LABEL = {
        upcoming: 'Ещё не начат',
        active: 'Идёт сейчас',
        completed: 'Завершён',
    };
    for (const exp of items) {
        const card = document.createElement('button');
        card.className = 'experiment-card';
        card.innerHTML = `
      <div class="experiment-card__header">
        <span class="experiment-card__number">Эксперимент №${exp.number}</span>
        <span class="experiment-card__status experiment-card__status--${exp.status}">${STATUS_LABEL[exp.status]}</span>
      </div>
      <div class="experiment-card__hypothesis">${exp.hypothesis || 'Гипотеза ещё не сформулирована'}</div>
      <div class="experiment-card__days">Дни ${exp.startDayNumber}–${exp.endDayNumber}</div>
    `;
        card.addEventListener('click', () => renderDetail(exp.number));
        wrap.appendChild(card);
    }
    const hint = document.createElement('p');
    hint.className = 'experiment-hint';
    hint.textContent =
        'Гипотезу для каждого эксперимента предложит AI-анализ предыдущей недели — скопируй её сюда после того, как обсудишь результаты с AI.';
    wrap.appendChild(hint);
    root.appendChild(wrap);
    async function renderDetail(number) {
        root.innerHTML = '<div class="screen-loading">Загрузка…</div>';
        const existing = (await getExperiment(number)) ?? emptyExperiment(number);
        const status = computeStatus(number, currentDay);
        root.innerHTML = '';
        const detail = document.createElement('div');
        detail.className = 'screen experiment-detail';
        detail.innerHTML = `
      <button class="link-back" id="exp-back">‹ Все эксперименты</button>
      <h1 class="screen-title">Эксперимент №${number}</h1>
      <div class="field-group">
        <label class="field-label">Гипотеза</label>
        <textarea class="input input--textarea" id="exp-hypothesis" rows="2" placeholder="Например: большое количество коротких видео вечером связано с более низкой энергией утром">${existing.hypothesis}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Почему эта гипотеза появилась</label>
        <textarea class="input input--textarea" id="exp-reason" rows="2">${existing.reason}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Что именно ты меняешь</label>
        <textarea class="input input--textarea" id="exp-change" rows="2" placeholder="Например: 7 дней не смотреть Shorts/Reels после 21:00">${existing.change}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Ожидаемый результат</label>
        <textarea class="input input--textarea" id="exp-expected" rows="2">${existing.expectedResult}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Наблюдения по ходу эксперимента</label>
        <textarea class="input input--textarea" id="exp-observations" rows="2">${existing.observations}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Результат</label>
        <textarea class="input input--textarea" id="exp-result" rows="2">${existing.result}</textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Вывод</label>
        <textarea class="input input--textarea" id="exp-conclusion" rows="2">${existing.conclusion}</textarea>
      </div>
      <button class="btn btn--primary btn--block" id="exp-save">Сохранить</button>
      <div class="save-confirm" id="exp-save-confirm" hidden>Сохранено ✓</div>
    `;
        root.appendChild(detail);
        detail.querySelector('#exp-back').addEventListener('click', () => renderExperiment(root));
        detail.querySelector('#exp-save').addEventListener('click', async () => {
            const get = (id) => detail.querySelector(id).value.trim();
            const updated = {
                ...existing,
                status,
                hypothesis: get('#exp-hypothesis'),
                reason: get('#exp-reason'),
                change: get('#exp-change'),
                expectedResult: get('#exp-expected'),
                observations: get('#exp-observations'),
                result: get('#exp-result'),
                conclusion: get('#exp-conclusion'),
            };
            try {
                await saveExperiment(updated);
                const confirm = detail.querySelector('#exp-save-confirm');
                confirm.hidden = false;
                setTimeout(() => (confirm.hidden = true), 2000);
            }
            catch (err) {
                console.error('Failed to save experiment', err);
                alert('Не удалось сохранить эксперимент. Попробуй ещё раз.');
            }
        });
    }
}
