## 2024-05-23 - React List Virtualization/Memoization
**Learning:** Large lists rendered inline within a complex parent component (like `RecipesPage`) are susceptible to unnecessary re-renders when parent state changes (e.g., scaling sliders, filters). Extracting list items into `React.memo` components effectively isolates them from parent updates.
**Action:** When working with lists that have interactive parent controls, always prefer extracting the list item component and memoizing it, ensuring callback props are stable.
