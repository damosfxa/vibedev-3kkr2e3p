/**
 * @typedef {Object} StorageAdapter
 * @property {function(): Array} load - Load data from storage
 * @property {function(Array): void} save - Save data to storage
 */

/**
 * Creates a localStorage adapter with error handling.
 * @param {string} key - The localStorage key to use
 * @param {function(string): void} onError - Callback invoked with error message on failure
 * @returns {StorageAdapter}
 */
export function createStorage(key, onError) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        onError('Failed to load data. Storage may be corrupted.');
        return [];
      }
    },
    save(data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        onError('Failed to save. Storage may be full or blocked.');
      }
    }
  };
}

/**
 * Creates an in-memory storage adapter for testing.
 * @returns {StorageAdapter}
 */
export function createMemoryStorage() {
  let data = [];
  return {
    load() { return JSON.parse(JSON.stringify(data)); },
    save(d) { data = JSON.parse(JSON.stringify(d)); }
  };
}
