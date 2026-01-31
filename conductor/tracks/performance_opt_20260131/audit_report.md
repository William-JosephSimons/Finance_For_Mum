# Performance Audit & Resource Sketches: Mum_Finance

## 1. Resource Sketches (Back-of-the-Envelope)

| Resource | Operation | Metric | Target | Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Network** | LLM Insight Request | Latency | <2s | Batching, Prompt Minification |
| **Disk** | Store Persistence (10k tx) | Size/Latency | 5MB / <100ms | Efficient Serialization, Batched I/O |
| **Memory** | Transaction Store (10k tx) | Footprint | <20MB | Flat Structures, Immutable Updates |
| **CPU** | Categorization (500 tx) | Execution Time | <200ms | Batching, Hot Loop Extraction |
| **CPU** | UI Rendering (Transaction List) | Frame Time | <16ms (60fps) | Virtualization, Memoization |

## 2. Identified Hot Paths

1.  **CSV Import Flow:** `PapaParse` -> `Store.addTransactions` -> `Engine.categorize`. Currently per-item updates trigger multiple store listeners.
2.  **Categorization Engine:** Iterating over all rules for every single transaction.
3.  **Recurring Bill Detection:** Complex date logic and filtering over the entire transaction history.
4.  **Transaction List Rendering:** Potential for unnecessary re-renders of the entire list when a single transaction status changes.

## 3. Optimization Targets

- **CSV Import (500+ rows):** <1s total time (Parsing + Categorization + Persistence).
- **UI Responsiveness:** <100ms for all interactions.
- **Memory Footprint:** Keep total app memory <100MB even with large datasets.
