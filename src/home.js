import { renderHubCards, renderToolNav } from './shared/shell.js';
import { mountThemeToggle } from './shared/theme.js';

document.querySelector('#nav-tools').innerHTML = renderToolNav('home');
document.querySelector('#tool-grid').innerHTML = renderHubCards();
mountThemeToggle();
