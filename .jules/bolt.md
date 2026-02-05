## 2025-05-27 - Memoization of Recipe List Items
**Learning:** Frequent re-renders in large lists caused by inline function definitions and lack of memoization can be easily solved by extracting the list item into a `React.memo` component and passing stable callbacks.
**Action:** Always extract list items into their own memoized components when the list is interactive (e.g., selection) or filtered/searched frequently.

## 2025-05-27 - Package Lockfile Hygiene
**Learning:** Running `npm install` in an environment might modify `package-lock.json` with metadata changes (e.g. `peer` dependencies handling) that are irrelevant to the task.
**Action:** Always verify `git diff` or restore `package-lock.json` if no dependencies were explicitly added/removed, to avoid noise in PRs.
