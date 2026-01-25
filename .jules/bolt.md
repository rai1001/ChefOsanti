## 2025-02-19 - React List Re-renders
**Learning:** Lists in the application (e.g., `RecipesPage`) often lack memoization for list items. Inline calculation of props like `isActive` and inline event handlers inside `map()` force the entire list to re-render upon any state change (like selection), which is a common but easily fixable bottleneck.
**Action:** Extract list items into `memo` components and use `useCallback` for handlers. Check for `@tanstack/react-virtual` usage for larger lists as it is already a dependency.
