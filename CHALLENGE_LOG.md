# CHALLENGE LOG - TV Series Episode Tracker

## Ringkasan
- Challenge: TV Series Episode Tracker
- Tier/Format: Rookie Brawl (60 min, 40 KB cap)
- Tanggal: 2026-08-07
- Repo: https://github.com/damosfxa/vibedev-3kkr2e3p

## Keputusan Desain/Teknis

Arsitektur:
- Pure logic factory pattern (createTrackerLogic) dengan pub/sub, terinspirasi pola pemenang Laundry Load Planner
- 3-layer separation: storage.js (adapter) / logic.js (state) / app.js (DOM)
- Decoupled storage interface (createMemoryStorage) untuk testing tanpa localStorage

Input approach:
- User ketik jumlah season, lalu muncul input dinamis per season untuk episode count (bukan koma-separated manual)
- Dipilih karena lebih intuitif dan minim typo

Delete:
- Two-step confirmation dengan focus management ke tombol confirm (user decision)

Elemen visual non-generic:
- Progress bar berubah warna sesuai persentase (red/yellow/green/glow)
- Badge "COMPLETED" otomatis saat 100% + border card hijau
- Episode tiles glow ungu saat watched

## Tech Stack Final
- HTML5 - semantic structure, aria-live regions
- CSS3 - dark glassmorphism theme, custom tokens, prefers-reduced-motion
- Vanilla JS (ES Modules) - zero dependencies, 40 KB cap friendly
- node:test - built-in Node.js test runner, zero dependency

Alasan: budget 40 KB sangat ketat, framework apapun langsung overcap. Vanilla JS + ES Modules adalah pilihan paling efisien.

## Rekap Gate 2
- ES Modules: OK (import/export, bukan window.X)
- test.js: OK (15/15 pass, node:test)
- JSDoc: OK (semua fungsi)
- Guard wrapper: OK (submit, input, click, render)
- localStorage error toast: OK
- Runtime error toast: OK
- aria-live/role="alert": OK (toast, form-error-row, delete-confirm, episode-inputs-container)
- prefers-reduced-motion: OK
- Input guards: OK (empty, zero, negative, maxLength)
- Wheel blur: OK (static + dynamic)
- Empty state: OK
- Two-step delete + focus: OK
- README bersih: OK (no conflict markers)
- Repo size: 38.34 KB / 40 KB (4% buffer)
- Conflict markers: bersih

## Judge Notes
Menunggu hasil judge.
