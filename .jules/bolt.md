## 2024-05-22 - Large List Rendering & Client-Side Filtering
**Learning:** Several modules (e.g., `ProductsPage`) fetch entire tables via Supabase and filter client-side using `useMemo`. This creates massive render payloads and frequent re-renders when selection state changes.
**Action:** When optimizing lists, prioritize 1) Server-side filtering/pagination where possible, and 2) Strict `React.memo` isolation for list items to prevent O(N) re-renders on selection changes.
