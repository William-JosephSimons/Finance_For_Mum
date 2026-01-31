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

1.  **Redundant Sorting:** `addTransactions` sorts the entire `transactions` list on every call. If importing multiple small batches, this becomes a major bottleneck.
2.  **Linear Rule Matching:** `applyRules` uses `.find()` on a sorted array of rules for every transaction. For large rule sets, a Trie or Regex-based matcher would be faster.
3.  **Immer Overhead:** While `immer` is great for DX, using it to push large arrays into state can be slower than native spread for very large datasets.
4.  **LLM Batching Delay:** The current LLM implementation has a fixed `DELAY_PER_CHUNK_MS = 2000` to avoid rate limits. We should verify if this can be safely reduced or if we can parallelize chunks within rate limits.
5.  **UI Re-renders:** Every store update triggers a full re-render of listeners. We should use batched updates if multiple transactions are updated sequentially.

