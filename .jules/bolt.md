## 2024-05-22 - [Frontend Verification limitations]
**Learning:** Frontend verification with Playwright is limited when the backend is not available (e.g. Supabase). Screenshots may be empty or show error states.
**Action:** When backend is unavailable, focus on verifying that the app loads and doesn't crash, rather than verifying data-dependent UI.

## 2024-05-22 - [Lockfile ambiguity]
**Learning:** Repository contains `package-lock.json` but `package.json` scripts use `pnpm`. Running `pnpm install` generates `pnpm-lock.yaml`.
**Action:** Verify which package manager is authoritative before committing lockfiles.
