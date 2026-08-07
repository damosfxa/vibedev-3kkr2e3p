# TV Series Episode Tracker

## Description
A single-page application that lets binge-watchers keep track of which TV show episodes they have watched. It offers a clean interface to monitor progress through multi-season series.

## Problem Solved
Keeping track of watched episodes across complex, multi-season shows can be confusing and cumbersome. This app provides a visually clear, grid-based tracking system to easily mark episodes as watched and see overall show progress without needing an external database.

## Key Features
- Add shows with dynamic inputs for variable episode counts per season
- Mark individual episodes as watched by clicking tiles in a grid view
- View per-show progress bars showing percentage of total episodes watched
- Expand and collapse seasons within a show card
- Two-step confirmation for deleting shows
- Persistent data storage using localStorage

## Screenshots
TODO: add after UI complete

## Tech Stack and Reasoning
- HTML5: Semantic structure and native accessibility features
- CSS3: Native variables for dark glassmorphism theme, prefers-reduced-motion support, no bloated framework required
- Vanilla JavaScript (ES Modules): Zero dependencies to stay within the 40 KB cap, pure logic factory pattern for testability
- node:test: Built-in Node.js testing for zero-dependency automated tests

## How to Install and Run
1. Clone the repository or download the files
2. Open index.html in a modern web browser to run the app
3. To run the automated tests, ensure Node.js is installed
4. Execute `npm run test` in your terminal (or run `node --test test.js`)
