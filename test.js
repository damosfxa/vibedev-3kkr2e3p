import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackerLogic } from './logic.js';
import { createMemoryStorage } from './storage.js';

/**
 * Creates a fresh tracker instance with in-memory storage for testing.
 * @returns {Object} Tracker API
 */
function createTestTracker() {
  return createTrackerLogic(createMemoryStorage());
}

test('addShow creates a show with correct structure', () => {
  const tracker = createTestTracker();
  const id = tracker.addShow('Breaking Bad', [7, 13, 13, 13, 16]);
  const shows = tracker.getShows();
  assert.equal(shows.length, 1);
  assert.equal(shows[0].title, 'Breaking Bad');
  assert.equal(shows[0].seasons.length, 5);
  assert.equal(shows[0].seasons[0].length, 7);
  assert.equal(shows[0].seasons[4].length, 16);
  assert.equal(shows[0].seasons[0][0].number, 1);
  assert.equal(shows[0].seasons[0][0].watched, false);
});

test('addShow trims whitespace from title', () => {
  const tracker = createTestTracker();
  tracker.addShow('  The Wire  ', [13]);
  assert.equal(tracker.getShows()[0].title, 'The Wire');
});

test('addShow rejects empty title', () => {
  const tracker = createTestTracker();
  assert.throws(() => tracker.addShow('', [10]), { message: /title is required/i });
  assert.throws(() => tracker.addShow('   ', [10]), { message: /title is required/i });
});

test('addShow rejects invalid episode counts', () => {
  const tracker = createTestTracker();
  assert.throws(() => tracker.addShow('Test', [0]), { message: /positive whole number/i });
  assert.throws(() => tracker.addShow('Test', [-5]), { message: /positive whole number/i });
  assert.throws(() => tracker.addShow('Test', [1.5]), { message: /positive whole number/i });
  assert.throws(() => tracker.addShow('Test', []), { message: /at least one season/i });
});

test('addShow rejects episode count over 200', () => {
  const tracker = createTestTracker();
  assert.throws(() => tracker.addShow('Test', [201]), { message: /cannot exceed 200/i });
});

test('toggleEpisode flips watched state', () => {
  const tracker = createTestTracker();
  tracker.addShow('Test', [5]);
  const showId = tracker.getShows()[0].id;
  assert.equal(tracker.getShows()[0].seasons[0][0].watched, false);
  tracker.toggleEpisode(showId, 0, 0);
  assert.equal(tracker.getShows()[0].seasons[0][0].watched, true);
  tracker.toggleEpisode(showId, 0, 0);
  assert.equal(tracker.getShows()[0].seasons[0][0].watched, false);
});

test('toggleEpisode rejects invalid indices', () => {
  const tracker = createTestTracker();
  tracker.addShow('Test', [5]);
  const showId = tracker.getShows()[0].id;
  assert.throws(() => tracker.toggleEpisode(showId, -1, 0), { message: /invalid season/i });
  assert.throws(() => tracker.toggleEpisode(showId, 0, 99), { message: /invalid episode/i });
  assert.throws(() => tracker.toggleEpisode('fake-id', 0, 0), { message: /not found/i });
});

test('deleteShow removes a show', () => {
  const tracker = createTestTracker();
  tracker.addShow('Show A', [10]);
  tracker.addShow('Show B', [8]);
  assert.equal(tracker.getShows().length, 2);
  const idA = tracker.getShows()[0].id;
  tracker.deleteShow(idA);
  assert.equal(tracker.getShows().length, 1);
  assert.equal(tracker.getShows()[0].title, 'Show B');
});

test('deleteShow rejects unknown show ID', () => {
  const tracker = createTestTracker();
  assert.throws(() => tracker.deleteShow('nonexistent'), { message: /not found/i });
});

test('getShowProgress calculates correctly', () => {
  const tracker = createTestTracker();
  tracker.addShow('Test', [3, 2]);
  const showId = tracker.getShows()[0].id;
  let progress = tracker.getShowProgress(showId);
  assert.equal(progress.watched, 0);
  assert.equal(progress.total, 5);
  assert.equal(progress.percentage, 0);
  tracker.toggleEpisode(showId, 0, 0);
  tracker.toggleEpisode(showId, 0, 1);
  tracker.toggleEpisode(showId, 1, 0);
  progress = tracker.getShowProgress(showId);
  assert.equal(progress.watched, 3);
  assert.equal(progress.total, 5);
  assert.equal(progress.percentage, 60);
});

test('getShowProgress returns zero for unknown show', () => {
  const tracker = createTestTracker();
  const progress = tracker.getShowProgress('fake');
  assert.equal(progress.watched, 0);
  assert.equal(progress.total, 0);
  assert.equal(progress.percentage, 0);
});

test('getShows returns deep-cloned data', () => {
  const tracker = createTestTracker();
  tracker.addShow('Test', [3]);
  const shows1 = tracker.getShows();
  shows1[0].title = 'Mutated';
  shows1[0].seasons[0][0].watched = true;
  const shows2 = tracker.getShows();
  assert.equal(shows2[0].title, 'Test');
  assert.equal(shows2[0].seasons[0][0].watched, false);
});

test('subscribe notifies on state changes', () => {
  const tracker = createTestTracker();
  let callCount = 0;
  let lastSnapshot = null;
  tracker.subscribe((shows) => {
    callCount++;
    lastSnapshot = shows;
  });
  tracker.addShow('Test', [5]);
  assert.equal(callCount, 1);
  assert.equal(lastSnapshot.length, 1);
  const showId = lastSnapshot[0].id;
  tracker.toggleEpisode(showId, 0, 0);
  assert.equal(callCount, 2);
  assert.equal(lastSnapshot[0].seasons[0][0].watched, true);
});

test('subscribe returns working unsubscribe function', () => {
  const tracker = createTestTracker();
  let callCount = 0;
  const unsub = tracker.subscribe(() => { callCount++; });
  tracker.addShow('Test', [5]);
  assert.equal(callCount, 1);
  unsub();
  tracker.addShow('Test 2', [3]);
  assert.equal(callCount, 1);
});

test('data persists through storage round-trip', () => {
  const storage = createMemoryStorage();
  const tracker1 = createTrackerLogic(storage);
  tracker1.addShow('Persisted Show', [10, 8]);
  const showId = tracker1.getShows()[0].id;
  tracker1.toggleEpisode(showId, 0, 0);
  tracker1.toggleEpisode(showId, 1, 3);

  const tracker2 = createTrackerLogic(storage);
  const shows = tracker2.getShows();
  assert.equal(shows.length, 1);
  assert.equal(shows[0].title, 'Persisted Show');
  assert.equal(shows[0].seasons[0][0].watched, true);
  assert.equal(shows[0].seasons[1][3].watched, true);
  assert.equal(shows[0].seasons[0][1].watched, false);
});
