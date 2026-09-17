// Применяет тему к документу. 'system' — снимает ручной атрибут, тогда работает
// CSS-медиа-запрос prefers-color-scheme; 'light'/'dark' — принудительно фиксирует.
export function applyTheme(pref) {
    const root = document.documentElement;
    if (pref === 'system') {
        root.removeAttribute('data-theme');
    }
    else {
        root.setAttribute('data-theme', pref);
    }
}
