import { createStorage } from './storage.js';
import { createTrackerLogic } from './logic.js';

// --- Utilities ---

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
function escapeHTML(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

/** @type {number|null} */
let toastTimer = null;

/**
 * Shows a toast notification.
 * @param {string} message - Message to display
 * @param {'error'|'success'} type - Toast type
 */
function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast visible toast-' + type;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}

/**
 * Wraps a function so any thrown error surfaces as a toast.
 * @param {Function} fn - Handler function
 * @returns {Function} Guarded handler
 */
function guard(fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      showToast(e.message || 'Something went wrong. Please try again.');
      console.error(e);
    }
  };
}

/**
 * Prevents mouse wheel from changing number input values.
 * @param {HTMLInputElement} input - Number input element
 */
function addWheelBlur(input) {
  input.addEventListener('wheel', (e) => {
    e.currentTarget.blur();
  }, { passive: true });
}

/**
 * Returns a CSS class name based on progress percentage.
 * @param {number} pct - Percentage (0-100)
 * @returns {string} CSS class suffix
 */
function progressClass(pct) {
  if (pct >= 100) return 'complete';
  if (pct >= 67) return 'high';
  if (pct >= 34) return 'mid';
  return 'low';
}

// --- Application State ---

/** @type {Set<string>} Tracks which seasons are expanded (key: "showId-seasonIndex") */
const expandedSeasons = new Set();

/** @type {string|null} Show ID pending delete confirmation */
let pendingDeleteId = null;

// --- Core Setup ---

const storage = createStorage('tv-tracker-data', showToast);
const tracker = createTrackerLogic(storage);

// --- DOM References ---

const formEl = document.getElementById('add-show-form');
const titleInput = document.getElementById('show-title');
const seasonCountInput = document.getElementById('season-count');
const episodeContainer = document.getElementById('episode-inputs-container');
const showsList = document.getElementById('shows-list');
const emptyState = document.getElementById('empty-state');

// --- Rendering ---

/**
 * Renders all show cards into the DOM.
 * @param {Array<import('./logic.js').Show>} shows - Current shows snapshot
 */
function render(shows) {
  if (shows.length === 0) {
    showsList.innerHTML = '';
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  showsList.innerHTML = shows.map(show => {
    const progress = tracker.getShowProgress(show.id);
    const pClass = progressClass(progress.percentage);
    const isComplete = progress.percentage >= 100;
    const cardClass = 'glass-card show-card' + (isComplete ? ' completed' : '');

    return '<div class="' + cardClass + '" data-show-id="' + show.id + '">' +
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-title">' + escapeHTML(show.title) + '</div>' +
          '<div class="card-subtitle">' + progress.watched + ' / ' + progress.total + ' episodes watched' +
            (isComplete ? ' <span class="badge-complete">Completed</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="card-actions">' +
          renderDeleteButton(show.id) +
        '</div>' +
      '</div>' +
      '<div class="progress-container">' +
        '<div class="progress-bar">' +
          '<div class="progress-fill ' + pClass + '" style="width:' + progress.percentage + '%"></div>' +
        '</div>' +
        '<div class="progress-info">' +
          '<span>' + show.seasons.length + ' season' + (show.seasons.length > 1 ? 's' : '') + '</span>' +
          '<span class="progress-percentage">' + progress.percentage + '%</span>' +
        '</div>' +
      '</div>' +
      '<div class="seasons-list">' +
        show.seasons.map((season, si) => renderSeason(show, season, si)).join('') +
      '</div>' +
    '</div>';
  }).join('');

  // Focus confirm button if pending delete
  if (pendingDeleteId) {
    const btn = showsList.querySelector('.btn-confirm-delete');
    if (btn) btn.focus();
  }
}

/**
 * Renders delete button or confirmation inline.
 * @param {string} showId - Show ID
 * @returns {string} HTML string
 */
function renderDeleteButton(showId) {
  if (pendingDeleteId === showId) {
    return '<div class="delete-confirm" role="alert" aria-live="polite">' +
      '<span>Delete?</span>' +
      '<button class="btn-confirm-delete" data-action="confirm-delete" data-show-id="' + showId + '">Yes</button>' +
      '<button class="btn-cancel-delete" data-action="cancel-delete" data-show-id="' + showId + '">No</button>' +
    '</div>';
  }
  return '<button class="btn-delete" data-action="delete" data-show-id="' + showId + '" aria-label="Delete show">Delete</button>';
}

/**
 * Renders a collapsible season block.
 * @param {import('./logic.js').Show} show - Parent show
 * @param {Array<import('./logic.js').Episode>} season - Season episodes
 * @param {number} si - Season index
 * @returns {string} HTML string
 */
function renderSeason(show, season, si) {
  const key = show.id + '-' + si;
  const isExpanded = expandedSeasons.has(key);
  const watched = season.filter(ep => ep.watched).length;

  return '<div class="season-block">' +
    '<button class="season-header" data-action="toggle-season" data-show-id="' + show.id + '" data-season="' + si + '" aria-expanded="' + isExpanded + '">' +
      '<span>Season ' + (si + 1) + '</span>' +
      '<span class="season-meta">' +
        '<span class="season-count">' + watched + '/' + season.length + '</span>' +
        '<span class="season-chevron ' + (isExpanded ? 'expanded' : '') + '">&#8250;</span>' +
      '</span>' +
    '</button>' +
    (isExpanded ? (
      '<div class="season-episodes">' +
        '<div class="episode-grid">' +
          season.map((ep, ei) =>
            '<button class="episode-tile ' + (ep.watched ? 'watched' : '') + '" ' +
              'data-action="toggle-episode" ' +
              'data-show-id="' + show.id + '" ' +
              'data-season="' + si + '" ' +
              'data-episode="' + ei + '" ' +
              'aria-label="Episode ' + ep.number + (ep.watched ? ', watched' : ', unwatched') + '" ' +
              'aria-pressed="' + ep.watched + '">' +
              ep.number +
            '</button>'
          ).join('') +
        '</div>' +
      '</div>'
    ) : '') +
  '</div>';
}

/**
 * Updates the dynamic episode count inputs when season count changes.
 */
function updateSeasonInputs() {
  const count = parseInt(seasonCountInput.value, 10);
  if (!Number.isFinite(count) || count <= 0 || count > 50) {
    episodeContainer.innerHTML = '';
    return;
  }

  episodeContainer.innerHTML = Array.from({ length: count }, (_, i) =>
    '<div class="episode-input-group">' +
      '<label for="ep-count-' + i + '">S' + (i + 1) + '</label>' +
      '<input type="number" id="ep-count-' + i + '" class="form-input episode-count-input" ' +
        'data-season="' + i + '" min="1" max="200" required placeholder="Eps" ' +
        'aria-label="Episodes in Season ' + (i + 1) + '">' +
    '</div>'
  ).join('');

  // Add wheel blur to new number inputs
  episodeContainer.querySelectorAll('input[type="number"]').forEach(addWheelBlur);
}

// --- Event Handlers ---

/**
 * Handles the add show form submission.
 * @param {SubmitEvent} e
 */
function onSubmit(e) {
  e.preventDefault();

  const title = titleInput.value.trim();
  if (!title) {
    showToast('Please enter a show title.');
    titleInput.focus();
    return;
  }

  const seasonCount = parseInt(seasonCountInput.value, 10);
  if (!Number.isFinite(seasonCount) || seasonCount <= 0) {
    showToast('Please enter a valid number of seasons.');
    seasonCountInput.focus();
    return;
  }

  const epInputs = episodeContainer.querySelectorAll('.episode-count-input');
  if (epInputs.length !== seasonCount) {
    showToast('Please enter the number of seasons first.');
    seasonCountInput.focus();
    return;
  }

  /** @type {Array<number>} */
  const episodesPerSeason = [];
  for (const input of epInputs) {
    const val = parseInt(input.value, 10);
    if (!Number.isFinite(val) || val <= 0) {
      const sIdx = parseInt(input.dataset.season, 10) + 1;
      showToast('Please enter a valid episode count for Season ' + sIdx + '.');
      input.focus();
      return;
    }
    episodesPerSeason.push(val);
  }

  tracker.addShow(title, episodesPerSeason);
  formEl.reset();
  episodeContainer.innerHTML = '';
  showToast('Show added!', 'success');
}

/**
 * Handles input events on the form (for dynamic season inputs).
 * @param {Event} e
 */
function onFormInput(e) {
  if (e.target.id === 'season-count') {
    updateSeasonInputs();
  }
}

/**
 * Handles delegated click events on the shows list.
 * @param {MouseEvent} e
 */
function onShowsClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const showId = target.dataset.showId;

  switch (action) {
    case 'toggle-episode': {
      const si = parseInt(target.dataset.season, 10);
      const ei = parseInt(target.dataset.episode, 10);
      tracker.toggleEpisode(showId, si, ei);
      break;
    }
    case 'toggle-season': {
      const si = parseInt(target.dataset.season, 10);
      const key = showId + '-' + si;
      if (expandedSeasons.has(key)) {
        expandedSeasons.delete(key);
      } else {
        expandedSeasons.add(key);
      }
      render(tracker.getShows());
      break;
    }
    case 'delete': {
      pendingDeleteId = showId;
      render(tracker.getShows());
      break;
    }
    case 'confirm-delete': {
      pendingDeleteId = null;
      tracker.deleteShow(showId);
      break;
    }
    case 'cancel-delete': {
      pendingDeleteId = null;
      render(tracker.getShows());
      break;
    }
  }
}

// --- Initialization ---

/**
 * Initializes the application: binds events and performs first render.
 */
function init() {
  // Add wheel blur to static number inputs
  document.querySelectorAll('input[type="number"]').forEach(addWheelBlur);

  // Bind events with guard wrappers
  formEl.addEventListener('submit', guard(onSubmit));
  formEl.addEventListener('input', guard(onFormInput));
  showsList.addEventListener('click', guard(onShowsClick));

  // Subscribe to state changes
  tracker.subscribe(guard(render));

  // Initial render
  render(tracker.getShows());
}

init();
