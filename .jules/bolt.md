# BOLT'S JOURNAL - CRITICAL LEARNINGS ONLY

## 2024-05-22 - [Initial Entry]
**Learning:** Supabase PostgREST allows ordering by columns not present in the SELECT clause, enabling optimizing payload size by selecting only necessary fields while maintaining sort order.
**Action:** Always audit `select('*')` calls and replace with explicit column selection where possible, especially in list views.
