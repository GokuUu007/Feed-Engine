(() => {
  const THEME_KEY = 'feedengine-theme';
  const root = document.documentElement;
  let theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';

  function updateToggle(button) {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    button.querySelector('.theme-icon').textContent = nextTheme === 'light' ? '☀️' : '🌙';
    button.querySelector('.theme-label').textContent = `${nextTheme === 'light' ? 'Light' : 'Dark'} mode`;
    button.setAttribute('aria-label', `Switch to ${nextTheme} mode`);
  }

  function applyTheme(nextTheme) {
    theme = nextTheme;
    root.dataset.theme = theme;
    const button = document.getElementById('theme-toggle');
    if (button) updateToggle(button);
  }

  applyTheme(theme);

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    updateToggle(button);
    button.addEventListener('click', () => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, nextTheme);
      applyTheme(nextTheme);
    });
  });

  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue === 'light' ? 'light' : 'dark');
    }
  });
})();
