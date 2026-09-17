import { getMeta } from './db.js';
import { renderOnboarding } from './onboarding.js';
import { getCurrentScreen, renderBottomNav, navigateTo } from './nav.js';
import { applyTheme } from './theme.js';
import { renderHome } from './screens/home.js';
import { renderToday } from './screens/today.js';
import { renderExperiment } from './screens/experiment.js';
import { renderAi } from './screens/ai.js';
import { renderSummary } from './screens/summary.js';
import type { ScreenId } from './types.js';

const appRoot = document.getElementById('app')!;

let pendingDayNumber: number | undefined;
window.addEventListener('experiment28:open-day', (e) => {
  pendingDayNumber = (e as CustomEvent<{ dayNumber: number }>).detail?.dayNumber;
});

async function boot(): Promise<void> {
  appRoot.innerHTML = '<div class="screen-loading">Загрузка…</div>';

  let meta;
  try {
    meta = await getMeta();
  } catch (err) {
    console.error('Failed to load app state', err);
    appRoot.innerHTML =
      '<div class="screen-error">Не удалось загрузить данные приложения. Проверь, что браузер разрешает хранение данных на сайте, и обнови страницу.</div>';
    return;
  }

  applyTheme(meta.themePreference ?? 'system');

  if (!meta.onboardingCompleted) {
    renderApp(false);
    renderOnboarding(document.getElementById('screen-container')!, () => {
      renderApp(true);
    });
    return;
  }

  renderApp(true);
}

function renderApp(showNav: boolean): void {
  appRoot.innerHTML = `
    <main id="screen-container" class="screen-container" role="main"></main>
    <nav id="bottom-nav" class="bottom-nav" aria-label="Основная навигация"></nav>
  `;
  const navEl = document.getElementById('bottom-nav')!;
  navEl.style.display = showNav ? '' : 'none';

  if (showNav) {
    renderRoute();
    window.addEventListener('hashchange', renderRoute);
  }
}

// Клик по уже активной вкладке не меняет hash, поэтому 'hashchange' не сработает -
// без этого экран мог показывать устаревшее состояние (например, номер дня),
// пока пользователь не переключится на другую вкладку и не вернётся обратно.
function selectScreen(id: ScreenId): void {
  const isSameScreen = getCurrentScreen() === id;
  navigateTo(id);
  if (isSameScreen) {
    renderRoute();
  }
}

async function renderRoute(): Promise<void> {
  const screen = getCurrentScreen();
  const container = document.getElementById('screen-container');
  const navEl = document.getElementById('bottom-nav');
  if (!container || !navEl) return;

  renderBottomNav(navEl, screen, selectScreen);

  const dayToOpen = pendingDayNumber;
  pendingDayNumber = undefined;

  try {
    switch (screen as ScreenId) {
      case 'home':
        await renderHome(container);
        break;
      case 'today':
        await renderToday(container, dayToOpen);
        break;
      case 'experiment':
        await renderExperiment(container);
        break;
      case 'ai':
        await renderAi(container);
        break;
      case 'summary':
        await renderSummary(container);
        break;
      default:
        navigateTo('home');
    }
  } catch (err) {
    console.error('Failed to render screen', screen, err);
    container.innerHTML = '<div class="screen-error">Что-то пошло не так при загрузке экрана. Попробуй вернуться на Главную.</div>';
  }
}

function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Service worker registration failed', err);
      });
    });
  }
}

boot();
registerServiceWorker();
