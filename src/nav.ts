import type { ScreenId } from './types.js';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: string; // inline SVG path content, kept minimal
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Главная', icon: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z' },
  { id: 'today', label: 'Сегодня', icon: 'M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z' },
  { id: 'experiment', label: 'Эксперимент', icon: 'M9 3h6M10 3v5.2L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.2V3' },
  { id: 'ai', label: 'AI', icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { id: 'summary', label: 'Итог', icon: 'M4 19V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14M4 19l3-3 4 2 5-6 4 3M4 19h16' },
];

export function getCurrentScreen(): ScreenId {
  const hash = window.location.hash.replace('#', '') as ScreenId;
  const valid = NAV_ITEMS.some((i) => i.id === hash);
  return valid ? hash : 'home';
}

export function navigateTo(screen: ScreenId): void {
  window.location.hash = screen;
}

export function renderBottomNav(container: HTMLElement, active: ScreenId, onSelect?: (id: ScreenId) => void): void {
  container.innerHTML = '';
  container.className = 'bottom-nav';
  for (const item of NAV_ITEMS) {
    const btn = document.createElement('button');
    btn.className = 'bottom-nav__item' + (item.id === active ? ' bottom-nav__item--active' : '');
    btn.setAttribute('aria-label', item.label);
    btn.setAttribute('aria-current', item.id === active ? 'page' : 'false');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="bottom-nav__icon">
        <path d="${item.icon}"></path>
      </svg>
      <span class="bottom-nav__label">${item.label}</span>
    `;
    btn.addEventListener('click', () => {
      if (onSelect) {
        onSelect(item.id);
      } else {
        navigateTo(item.id);
      }
    });
    container.appendChild(btn);
  }
}
