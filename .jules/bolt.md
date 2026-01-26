## 2025-02-04 - Vite Build Configuration Issue
**Learning:** `vite.config.ts` included `minWorkers: 1` in the `test` configuration, which caused build failures with the current dependencies (`minWorkers` does not exist in `InlineConfig`).
**Action:** Remove `minWorkers` from `vite.config.ts` when encountering this error.

## 2025-02-04 - Frontend Verification without Backend
**Learning:** Frontend verification screenshots via Playwright may show empty or error states if the local Supabase backend is not running. Verification in this context should focus on checking that the application does not crash.
**Action:** When verification fails due to backend connection, verify that the app renders a fallback state (background, loader) instead of crashing.
