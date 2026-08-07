/**
 * @typedef {Object} Episode
 * @property {number} number - Episode number (1-indexed)
 * @property {boolean} watched - Whether the episode has been watched
 */

/**
 * @typedef {Object} Show
 * @property {string} id - Unique identifier
 * @property {string} title - Show title
 * @property {Array<Array<Episode>>} seasons - Array of seasons, each containing episodes
 */

/**
 * @typedef {Object} ShowProgress
 * @property {number} watched - Number of watched episodes
 * @property {number} total - Total number of episodes
 * @property {number} percentage - Percentage watched (0-100, rounded)
 */

/**
 * Creates the tracker logic factory with pub/sub.
 * Pure state management - zero DOM references.
 * @param {import('./storage.js').StorageAdapter} storage
 * @returns {Object} Tracker API
 */
export function createTrackerLogic(storage) {
  /** @type {Array<Show>} */
  let shows = [];
  /** @type {Array<function(Array<Show>): void>} */
  const listeners = [];

  /**
   * Generates a unique ID.
   * @returns {string}
   */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Notifies all subscribers with a deep-cloned snapshot.
   */
  function notify() {
    const snapshot = getShows();
    listeners.forEach(fn => fn(snapshot));
  }

  /**
   * Persists current state and notifies subscribers.
   */
  function persist() {
    storage.save(shows);
    notify();
  }

  /**
   * Validates and sanitizes show data loaded from storage.
   * Drops any entries that do not match the expected schema.
   * @param {*} data - Raw data from storage
   * @returns {Array<Show>}
   */
  function validateShows(data) {
    if (!Array.isArray(data)) return [];
    return data.filter(s =>
      s &&
      typeof s.id === 'string' && s.id.length > 0 &&
      typeof s.title === 'string' && s.title.length > 0 &&
      Array.isArray(s.seasons) && s.seasons.length > 0
    ).map(s => ({
      id: s.id,
      title: s.title,
      seasons: s.seasons.map(season =>
        Array.isArray(season)
          ? season.filter(ep =>
              ep &&
              typeof ep.number === 'number' && Number.isFinite(ep.number) &&
              typeof ep.watched === 'boolean'
            )
          : []
      ).filter(season => season.length > 0)
    })).filter(s => s.seasons.length > 0);
  }

  /**
   * Adds a new show to the tracker.
   * @param {string} title - Show title
   * @param {Array<number>} episodesPerSeason - Number of episodes in each season
   * @returns {string} The new show's ID
   * @throws {Error} If title is empty or episode counts are invalid
   */
  function addShow(title, episodesPerSeason) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Show title is required.');
    }
    if (!Array.isArray(episodesPerSeason) || episodesPerSeason.length === 0) {
      throw new Error('At least one season is required.');
    }
    for (let i = 0; i < episodesPerSeason.length; i++) {
      const count = episodesPerSeason[i];
      if (!Number.isFinite(count) || count <= 0 || !Number.isInteger(count)) {
        throw new Error('Season ' + (i + 1) + ' must have a positive whole number of episodes.');
      }
      if (count > 200) {
        throw new Error('Season ' + (i + 1) + ' cannot exceed 200 episodes.');
      }
    }

    const show = {
      id: generateId(),
      title: title.trim(),
      seasons: episodesPerSeason.map(count =>
        Array.from({ length: count }, (_, i) => ({ number: i + 1, watched: false }))
      )
    };
    shows.push(show);
    persist();
    return show.id;
  }

  /**
   * Toggles the watched state of an episode.
   * @param {string} showId - Show ID
   * @param {number} seasonIndex - Season index (0-based)
   * @param {number} episodeIndex - Episode index (0-based)
   * @throws {Error} If show, season, or episode is not found
   */
  function toggleEpisode(showId, seasonIndex, episodeIndex) {
    const show = shows.find(s => s.id === showId);
    if (!show) throw new Error('Show not found.');
    if (!Number.isFinite(seasonIndex) || seasonIndex < 0 || seasonIndex >= show.seasons.length) {
      throw new Error('Invalid season index.');
    }
    const season = show.seasons[seasonIndex];
    if (!Number.isFinite(episodeIndex) || episodeIndex < 0 || episodeIndex >= season.length) {
      throw new Error('Invalid episode index.');
    }
    season[episodeIndex].watched = !season[episodeIndex].watched;
    persist();
  }

  /**
   * Deletes a show from the tracker.
   * @param {string} showId - Show ID to delete
   * @throws {Error} If show is not found
   */
  function deleteShow(showId) {
    const index = shows.findIndex(s => s.id === showId);
    if (index === -1) throw new Error('Show not found.');
    shows.splice(index, 1);
    persist();
  }

  /**
   * Returns a deep-cloned snapshot of all shows.
   * @returns {Array<Show>}
   */
  function getShows() {
    return shows.map(s => ({
      id: s.id,
      title: s.title,
      seasons: s.seasons.map(season =>
        season.map(ep => ({ number: ep.number, watched: ep.watched }))
      )
    }));
  }

  /**
   * Calculates watch progress for a show.
   * @param {string} showId - Show ID
   * @returns {ShowProgress}
   */
  function getShowProgress(showId) {
    const show = shows.find(s => s.id === showId);
    if (!show) return { watched: 0, total: 0, percentage: 0 };
    let watched = 0;
    let total = 0;
    show.seasons.forEach(season => {
      total += season.length;
      watched += season.filter(ep => ep.watched).length;
    });
    const percentage = total === 0 ? 0 : Math.round((watched / total) * 100);
    return { watched, total, percentage };
  }

  /**
   * Subscribes a listener to state changes.
   * @param {function(Array<Show>): void} fn - Callback receiving show snapshot
   * @returns {function(): void} Unsubscribe function
   */
  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  // Load and validate initial data from storage
  shows = validateShows(storage.load());

  return { addShow, toggleEpisode, deleteShow, getShows, getShowProgress, subscribe };
}
