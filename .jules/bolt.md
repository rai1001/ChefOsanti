## 2024-05-23 - Recipe Form Isolation
**Learning:** Large forms with select inputs dependent on large datasets (like products list) cause expensive re-renders of the entire parent page on every keystroke if state is lifted too high.
**Action:** Isolate form state and rendering into a dedicated child component (e.g., `RecipeIngredientForm`). Pass heavy data (products) as props, or fetch inside if appropriate, but ensure the parent component doesn't re-render on form local state changes.
