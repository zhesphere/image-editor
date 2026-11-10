const KEY = 'orbitvo-theme';

export function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getStoredTheme() {
  const value = localStorage.getItem(KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

export function resolveTheme(stored = getStoredTheme()) {
  if (stored) return stored;
  return systemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = next === 'dark' ? '#222938' : '#2f5bff';
  return next;
}

export function setTheme(theme) {
  const next = applyTheme(theme);
  localStorage.setItem(KEY, next);
  syncToggleButtons(next);
  return next;
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || resolveTheme();
  return setTheme(current === 'dark' ? 'light' : 'dark');
}

function syncToggleButtons(theme = resolveTheme()) {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    button.title = dark ? '浅色' : '深色';
    button.innerHTML = dark
      ? '<span aria-hidden="true">浅色</span>'
      : '<span aria-hidden="true">深色</span>';
  });
}

export function mountThemeToggle(selector = '.topbar-actions') {
  applyTheme(resolveTheme());
  const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!host) return;
  let button = host.querySelector('[data-theme-toggle]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'button small theme-toggle';
    button.dataset.themeToggle = '';
    host.prepend(button);
  }
  button.onclick = () => toggleTheme();
  syncToggleButtons();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme()) return;
    applyTheme(resolveTheme());
    syncToggleButtons();
  });
}

/** Inline-friendly boot; call from module entry ASAP */
export function bootTheme() {
  applyTheme(resolveTheme());
}
