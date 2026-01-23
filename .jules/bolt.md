## 2025-02-18 - Vite Config Compatibility
**Learning:** The `minWorkers` property in `vite.config.ts` (under `test` config) causes build failures with the current Vite/Vitest versions in this project.
**Action:** Remove `minWorkers` from `vite.config.ts` if encountered in similar setups to ensure successful builds.
