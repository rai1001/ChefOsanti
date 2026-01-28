## 2025-02-12 - Vite MinWorkers
**Learning:** The `minWorkers` property in `vite.config.ts` causes build failures with the current Vite/Vitest version in this environment.
**Action:** Remove `minWorkers` from `vite.config.ts` if encountered.

## 2025-02-12 - Form State Isolation
**Learning:** Large `<select>` lists (e.g., products) in forms cause massive re-render costs when typing in other inputs if state is not isolated.
**Action:** Always extract forms with large lists or expensive rendering into separate, memoized components to isolate state changes.
