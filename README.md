# FORGE — React Assignment

This version preserves the original FORGE frontend and functionality while running it from a React + Vite entry point.

## Run

```bash
npm install
npm run dev
```

The original FORGE HTML, CSS, data, and controller are preserved under the React wrapper so the visual design and interactions stay the same.

## Fixes in this package

- Removed the accidental AUTH SCREEN / MAIN APP / MODALS debug text from the rendered page.
- Prevented duplicate legacy event handlers during Vite development.
- Hardened local Sign Up persistence so account creation reports a clear error if browser storage is unavailable.
- Kept Login, Sign Up, logout, navigation, meals, workouts, weight, goals, achievements, settings, onboarding, water and sleep tracking.
- Added 27 local SVG exercise illustrations, including form guides for all listed gym, cardio and sports exercises.
- Exercise cards now show their local illustration, and selecting an exercise opens its larger form/movement guide.
- No external image hosting is required for the exercise illustrations.

## Notes

- Accounts and tracker data remain browser-local via `localStorage`.
- Chart.js is bundled locally instead of loaded from a CDN.
- `node_modules` is intentionally not included in the ZIP.
