import { setMetaField } from './db.js';
import { todayDateISO } from './state.js';
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
    let step = 0;
    const answers = { concern: '', goal: '', changeIfUseful: '' };
    function renderIntro() {
        root.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'onboarding';
        wrap.innerHTML = `
      <div class="onboarding__eyebrow">28 дней — личный эксперимент</div>
      <h1 class="onboarding__title">Собери данные о своих днях, проверь пару гипотез и пойми, что стоит менять.</h1>
      <p class="onboarding__text">Это не курс и не марафон. Никто не обещает найти твоё предназначение за 28 дней. Это просто маленький личный эксперимент: наблюдение → гипотеза → проверка → вывод.</p>
      <button class="btn btn--primary btn--block" id="ob-start">Начать</button>
      <p class="privacy-note">Все ответы и данные хранятся только на этом устройстве и никуда не отправляются.</p>
    `;
        root.appendChild(wrap);
        wrap.querySelector('#ob-start').addEventListener('click', () => {
            step = 1;
            renderQuestion();
        });
    }
    function renderQuestion() {
        root.innerHTML = '';
        const q = QUESTIONS[step - 1];
        const wrap = document.createElement('div');
        wrap.className = 'onboarding';
        wrap.innerHTML = `
      <div class="onboarding__progress">Вопрос ${step} из ${QUESTIONS.length}</div>
      <h1 class="onboarding__title">${q.title}</h1>
      <textarea class="input input--textarea" id="ob-answer" rows="4" placeholder="${q.placeholder}"></textarea>
      <button class="btn btn--primary btn--block" id="ob-next">${step < QUESTIONS.length ? 'Дальше' : 'Начинаем 28 дней'}</button>
      ${step > 1 ? '<button class="btn btn--ghost btn--block" id="ob-back">Назад</button>' : ''}
    `;
        root.appendChild(wrap);
        const textarea = wrap.querySelector('#ob-answer');
        textarea.value = answers[q.key];
        textarea.focus();
        wrap.querySelector('#ob-next').addEventListener('click', async () => {
            answers[q.key] = textarea.value.trim();
            if (step < QUESTIONS.length) {
                step += 1;
                renderQuestion();
            }
            else {
                await finish();
            }
        });
        const back = wrap.querySelector('#ob-back');
        if (back) {
            back.addEventListener('click', () => {
                answers[q.key] = textarea.value.trim();
                step -= 1;
                renderQuestion();
            });
        }
    }
    async function finish() {
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
    }
    renderIntro();
}
