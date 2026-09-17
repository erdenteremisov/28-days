// Генераторы иконок для шкал 1-5. Каждая шкала — своё визуальное семейство,
// чтобы пользователь не путал разные конструкты между собой (энергия и
// удовлетворённость — это не один и тот же вопрос, заданный дважды).
const STROKE = 'stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"';
// ---------- Удовлетворённость днём: круглые лица ----------
function faceIcon(curvature, browTilt) {
    // curvature: -7 (грусть) .. +7 (радость) — смещение контрольной точки рта
    const mouthY = 15 + curvature;
    return `
    <circle cx="12" cy="12" r="9" ${STROKE}></circle>
    <path d="M8.3 9.3 L8.3 9.3" ${STROKE}></path>
    <circle cx="8.7" cy="9.8" r="1" fill="currentColor" stroke="none"></circle>
    <circle cx="15.3" cy="9.8" r="1" fill="currentColor" stroke="none"></circle>
    <path d="M7.5 ${15 - curvature * 0.2} Q12 ${mouthY} 16.5 ${15 - curvature * 0.2}" ${STROKE}></path>
    ${browTilt !== 0 ? `<path d="M7 7.6 L10 ${7.6 + browTilt}" ${STROKE}></path><path d="M17 7.6 L14 ${7.6 + browTilt}" ${STROKE}></path>` : ''}
  `;
}
export const SATISFACTION_LEVELS = [
    { value: 1, label: 'Тяжёлый день', icon: faceIcon(-6, 1.6) },
    { value: 2, label: 'Так себе', icon: faceIcon(-3, 0.6) },
    { value: 3, label: 'Обычный', icon: faceIcon(0, 0) },
    { value: 4, label: 'Хороший', icon: faceIcon(3, 0) },
    { value: 5, label: 'Отличный', icon: faceIcon(6, 0) },
];
// ---------- Энергия: фигура человека, от поникшей до бодрой ----------
const FIGURE_POSES = [
    // 1 — сидит, поникший
    `<circle cx="12" cy="6.5" r="2.3" ${STROKE}></circle>
   <path d="M9 20 Q9 14 12 13 Q12.8 15.5 12 17 L10.5 20" ${STROKE}></path>
   <path d="M12 13 Q15 14.5 15.5 18" ${STROKE}></path>
   <path d="M12 15 L9.5 17.5" ${STROKE}></path>`,
    // 2 — стоит, руки опущены, голова чуть вниз
    `<circle cx="12" cy="6" r="2.2" ${STROKE}></circle>
   <path d="M12 8.3 L12 16" ${STROKE}></path>
   <path d="M12 10.5 L9 14.5" ${STROKE}></path>
   <path d="M12 10.5 L15 14.5" ${STROKE}></path>
   <path d="M12 16 L9.7 21" ${STROKE}></path>
   <path d="M12 16 L14.3 21" ${STROKE}></path>`,
    // 3 — стоит ровно, нейтрально
    `<circle cx="12" cy="5.5" r="2.2" ${STROKE}></circle>
   <path d="M12 7.7 L12 16" ${STROKE}></path>
   <path d="M12 10 L8.7 13" ${STROKE}></path>
   <path d="M12 10 L15.3 13" ${STROKE}></path>
   <path d="M12 16 L9.5 21" ${STROKE}></path>
   <path d="M12 16 L14.5 21" ${STROKE}></path>`,
    // 4 — идёт бодро, руки в движении
    `<circle cx="12.5" cy="5.5" r="2.2" ${STROKE}></circle>
   <path d="M12.3 7.7 L11.7 15.5" ${STROKE}></path>
   <path d="M11.9 9.8 L8.7 8.3" ${STROKE}></path>
   <path d="M11.9 9.8 L15.5 11.5" ${STROKE}></path>
   <path d="M11.7 15.5 L9 20.5" ${STROKE}></path>
   <path d="M11.7 15.5 L15 19" ${STROKE}></path>`,
    // 5 — руки вверх, победная поза
    `<circle cx="12" cy="6" r="2.2" ${STROKE}></circle>
   <path d="M12 8.2 L12 16" ${STROKE}></path>
   <path d="M12 10 L8 5.5" ${STROKE}></path>
   <path d="M12 10 L16 5.5" ${STROKE}></path>
   <path d="M12 16 L9 21" ${STROKE}></path>
   <path d="M12 16 L15 21" ${STROKE}></path>`,
];
export const ENERGY_LEVELS = [
    { value: 1, label: 'Вымотан', icon: FIGURE_POSES[0] },
    { value: 2, label: 'Устал', icon: FIGURE_POSES[1] },
    { value: 3, label: 'В норме', icon: FIGURE_POSES[2] },
    { value: 4, label: 'Бодрый', icon: FIGURE_POSES[3] },
    { value: 5, label: 'В ударе', icon: FIGURE_POSES[4] },
];
// ---------- Качество сна: батарейка (метафора "подзарядки") ----------
function batteryIcon(filled) {
    // На маленьком размере тонкая обводка почти не отличима от заливки, поэтому
    // "пустые" сегменты рисуем очень бледной заливкой (opacity), а не обводкой -
    // так разница между уровнями видна даже в 26px.
    const segments = [0, 1, 2, 3, 4].map((i) => {
        const x = 5 + i * 3.1;
        const isFilled = i < filled;
        return `<rect x="${x}" y="8" width="2.2" height="8" rx="0.6" fill="currentColor" stroke="none" opacity="${isFilled ? '1' : '0.18'}"></rect>`;
    });
    return `
    <rect x="3.5" y="6" width="16" height="12" rx="2.2" ${STROKE}></rect>
    <rect x="20" y="9.5" width="1.6" height="5" rx="0.6" fill="currentColor" stroke="none"></rect>
    ${segments.join('\n')}
  `;
}
export const SLEEP_QUALITY_LEVELS = [
    { value: 1, label: 'Совсем не выспался', icon: batteryIcon(1) },
    { value: 2, label: 'Слабо', icon: batteryIcon(2) },
    { value: 3, label: 'Средне', icon: batteryIcon(3) },
    { value: 4, label: 'Хорошо', icon: batteryIcon(4) },
    { value: 5, label: 'Отлично выспался', icon: batteryIcon(5) },
];
// ---------- Напряжение: линия от ровной (спокойно) до острых пиков (тревожно) ----------
function tensionIcon(amplitude) {
    if (amplitude === 0) {
        return `<path d="M3 12 L21 12" ${STROKE}></path>`;
    }
    const points = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
        const x = 3 + (18 / steps) * i;
        const y = 12 + (i % 2 === 0 ? 0 : (i % 4 === 1 ? -amplitude : amplitude));
        points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return `<path d="M${points.join(' L')}" ${STROKE}></path>`;
}
export const TENSION_LEVELS = [
    { value: 1, label: 'Спокойно', icon: tensionIcon(0) },
    { value: 2, label: 'Немного', icon: tensionIcon(2) },
    { value: 3, label: 'Заметно', icon: tensionIcon(4) },
    { value: 4, label: 'Напряжённо', icon: tensionIcon(6) },
    { value: 5, label: 'На пределе', icon: tensionIcon(8) },
];
