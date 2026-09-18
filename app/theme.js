// Тема теперь всегда явная (light/dark) — вариант 'system' убран по требованию.
// Атрибут data-theme на <html> выставляется всегда, без auto-detect по ОС.
export function applyTheme(pref) {
    document.documentElement.setAttribute('data-theme', pref);
}
