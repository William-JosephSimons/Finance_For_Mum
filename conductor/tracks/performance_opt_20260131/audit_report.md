# Performance Audit & Resource Sketches: Mum_Finance

## 1. Resource Sketches (Back-of-the-Envelope)

| Resource | Operation | Metric | Target | Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Network** | LLM Insight Request | Latency | <2s | Batching, Prompt Minification |
| **Disk** | Store Persistence (10k tx) | Size/Latency | 5MB / <100ms | Efficient Serialization, Batched I/O |
| **Memory** | Transaction Store (10k tx) | Footprint | <20MB | Flat Structures, Immutable Updates |
| **CPU** | Categorization (500 tx) | Execution Time | <200ms | Batching, Hot Loop Extraction |
| **CPU** | UI Rendering (Transaction List) | Frame Time | <16ms (60fps) | Virtualization, Memoization |

## 2. Baseline Performance Results (1000 Transactions)

| Operation | Time (Baseline) | Complexity |
| :--- | :--- | :--- |
| `applyRules` (100 rules) | 9ms | O(N * M) |
| `store.addTransactions` | 18ms | O((N+K) log (N+K)) |
| `store.reapplyRules` (Mocked LLM) | 19ms | O(N * M) + O(N) merge |

*Note: Baseline measured on dev machine with Node.js/Jest. Real mobile devices may be 5-10x slower.*

## 3. Concrete Hot Paths & Inefficiencies

### Logic & Engine
1.  **Redundant Sorting:** `addTransactions` in `lib/store/index.ts` sorts the entire list on every insertion.
2.  **O(N) Deduplication:** `addTransactions` maps the entire list to a Set of IDs for every insertion.
3.  **Linear Rule Matching:** `applyRules` uses `transactions.map` + `rules.find`. Complexity is `O(N * M)`.
4.  **Synchronous Engine Workflow:** `runCategorizationWorkflow` processes everything on the JS thread, potentially blocking UI frames.

### UI & Rendering
1.  **Nested List Rendering:** `TransactionsScreen` renders transactions using `.map()` inside a `FlatList` month group. This bypasses virtualization for transactions within a month.
2.  **Heavy Dashboard Calcs:** `DashboardScreen` recalculates Safe Balance, Recurring Patterns, Round-ups, and Surcharges on every transaction change.
3.  **Global Store Listeners:** Components like `TransactionsScreen` listen to the entire `transactions` array, triggering re-renders even when unrelated transactions change.

### Allocation Zones
1.  **Object Spreading:** Frequent use of `{ ...txn, category: '...' }` in `applyRules` and `runCategorizationWorkflow` creates many short-lived objects.
2.  **Date Object Creation:** `sortTransactions` and `groupedTransactions` create new `Date` objects repeatedly during iteration.
3.  **String Normalization:** `applyRules` calls `.toUpperCase()` on every transaction description and every rule keyword during the search.


