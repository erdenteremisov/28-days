import { setMetaField } from './db.js';
import { todayDateISO } from './state.js';
import { STARTER_INTERVIEW_PROMPT } from './ai-prompt.js';
const QUESTIONS = [
    {
        key: 'concern',
        title: 'Что сейчас больше всего беспокоит тебя в твоей жизни?',
        placeholder: 'Например: не хватает энергии, всё время устаю…',
    },
    {
        key: 'goal',
        title: 'Что ты хочешь понять за эти 28 дней?',
        placeholder: 'Например: от чего на самом деле зависит моя энергия',
    },
    {
        key: 'changeIfUseful',
        title: 'Если эксперимент окажется полезным, что ты хотел бы изменить?',
        placeholder: 'Например: меньше уставать по вечерам',
    },
];
export function renderOnboarding(root, onFinished) {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'onboarding';
    wrap.innerHTML = `
    <div class="onboarding__eyebrow">28 дней — личный эксперимент</div>
    <h1 class="onboarding__title">Прежде чем начать</h1>
    <p class="onboarding__text">Ответь на три коротких вопроса — они станут отправной точкой для всего эксперимента.</p>

    <div class="field-list" id="onboarding-fields"></div>

    <button class="btn btn--primary btn--block" id="ob-save">Сохранить</button>

    <div class="onboarding__divider">
      <p class="onboarding__helper-text">Не знаешь, что писать?<br/>Пройди короткое интервью — станет понятнее.</p>
      <button class="btn btn--secondary btn--block" id="ob-copy-interview">Скопировать промт для интервью</button>
      <div class="save-confirm" id="ob-copy-confirm" hidden>Промт скопирован</div>
      <p class="onboarding__helper-text onboarding__helper-text--small">Вставь его в ChatGPT, Claude или Gemini, пройди интервью, а готовый результат вставь обратно в поля выше.</p>
    </div>

    <p class="privacy-note">Все ответы и данные хранятся только на этом устройстве и никуда не отправляются.</p>
  `;
    root.appendChild(wrap);
    const fieldsEl = wrap.querySelector('#onboarding-fields');
    const textareas = {};
    for (const q of QUESTIONS) {
        const group = document.createElement('div');
        group.className = 'field-group';
        const label = document.createElement('label');
        label.className = 'field-label';
        label.textContent = q.title;
        const textarea = document.createElement('textarea');
        textarea.className = 'input input--textarea';
        textarea.rows = 3;
        textarea.placeholder = q.placeholder;
        group.appendChild(label);
        group.appendChild(textarea);
        fieldsEl.appendChild(group);
        textareas[q.key] = textarea;
    }
    wrap.querySelector('#ob-save').addEventListener('click', async () => {
        const answers = {
            concern: textareas.concern.value.trim(),
            goal: textareas.goal.value.trim(),
            changeIfUseful: textareas.changeIfUseful.value.trim(),
        };
        try {
            await setMetaField('onboardingAnswers', answers);
            await setMetaField('startDateISO', todayDateISO());
            await setMetaField('onboardingCompleted', true);
            onFinished();
        }
        catch (err) {
            console.error('Failed to save onboarding', err);
            alert('Не удалось сохранить ответы. Проверь, что в браузере разрешено хранение данных, и попробуй ещё раз.');
        }
    });
    wrap.querySelector('#ob-copy-interview').addEventListener('click', async () => {
        const confirm = wrap.querySelector('#ob-copy-confirm');
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(STARTER_INTERVIEW_PROMPT);
            }
            else {
                const tmp = document.createElement('textarea');
                tmp.value = STARTER_INTERVIEW_PROMPT;
                tmp.style.position = 'fixed';
                tmp.style.opacity = '0';
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand('copy');
                document.body.removeChild(tmp);
            }
            confirm.hidden = false;
            setTimeout(() => (confirm.hidden = true), 2500);
        }
        catch (err) {
            console.error('Copy failed', err);
            alert('Не удалось скопировать автоматически. Попробуй выделить и скопировать текст вручную.');
        }
    });
}
