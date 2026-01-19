## 2024-05-22 - [High Frequency State in List Views]
**Learning:** Views like RecipesPage combine high-frequency state (e.g., scaling slider) with large lists in the same component. This causes the entire list to re-render on every slider move. Extracting list items to memoized components is critical here.
**Action:** When adding interactive sliders or inputs to list views, always memoize the list items or move the high-frequency state to a separate child component.
