## 2024-05-23 - List Selection Re-renders
**Learning:** In `RecipesPage`, the list of recipes was re-rendering entirely whenever a recipe was selected. This is because the selection state (`selectedId`) was in the parent, and the `map` function was creating new `onClick` handlers and calculating `isActive` inline, causing all list items to re-render.
**Action:** Extract list items into memoized components (`React.memo`) and use `useCallback` for event handlers passed to them. Pass primitive props (boolean `isActive`) instead of derived state when possible.
