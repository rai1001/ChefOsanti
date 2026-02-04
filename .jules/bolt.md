## 2025-01-28 - Recipes List Performance
**Learning:** Inline mapping of complex components in large lists triggers unnecessary re-renders of all items when parent state changes (e.g., selection or unrelated form state).
**Action:** Extract list items into `memo`ized components and use `useCallback` for event handlers passed to them.
