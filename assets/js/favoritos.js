import { destinations, getFavorites, setFavorite } from './storage.js';

const controls = document.querySelectorAll('[data-favorite]');
const options = document.querySelectorAll('.favorite-options input');
const cards = document.querySelectorAll('.favorites-grid .destination-card');
const empty = document.querySelector('.empty-favorites');
const status = document.querySelector('[data-favorites-status]');

function updateNavBadges() {
  const count = getFavorites().length;
  document.querySelectorAll('nav a[href*="favoritos.html"]').forEach(link => {
    let badge = link.querySelector('.nav-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        link.appendChild(badge);
      }
      badge.textContent = ` (${count})`;
    } else if (badge) {
      badge.remove();
    }
  });
}

function render() {
  const favorites = new Set(getFavorites());
  controls.forEach(button => {
    const selected = favorites.has(button.dataset.favorite);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? '♥ Quitar de favoritos' : '♡ Guardar en favoritos';
  });
  options.forEach(input => { input.checked = favorites.has(input.value); });
  cards.forEach(card => { card.hidden = !favorites.has(card.dataset.destination); });
  if (empty) empty.hidden = favorites.size > 0;
  updateNavBadges();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-favorite]');
  if (!button) return;
  const id = button.dataset.favorite;
  const enabled = !getFavorites().includes(id);
  if (!setFavorite(id, enabled)) {
    if (status) status.textContent = 'No se pudieron guardar los favoritos en este navegador.';
    return;
  }
  if (status) status.textContent = `${destinations[id]} ${enabled ? 'se agregó a' : 'se quitó de'} favoritos.`;
  render();
});

options.forEach(input => input.addEventListener('change', () => {
  if (!setFavorite(input.value, input.checked)) {
    if (status) status.textContent = 'No se pudieron guardar los favoritos en este navegador.';
  }
  render();
}));

window.addEventListener('storage', render);
render();
