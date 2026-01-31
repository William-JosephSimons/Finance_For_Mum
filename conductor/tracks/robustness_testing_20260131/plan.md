# Implementation Plan: Comprehensive Testing & Robustness Overhaul

This plan outlines a systematic approach to saturating the Mum_Finance codebase with robust tests, targeting >95% coverage and high resilience.

## Phase 1: Foundation & Utilities (The Building Blocks) [checkpoint: 375abae]
Focus: Achieving 100% coverage and robustness for the lowest-level helper functions.

- [x] Task: Audit and Expand Utility Tests (`lib/utils/`)
    - [x] Write tests for untested edge cases in `format.ts` (e.g., extreme values, localized currencies).
    - [x] Write tests for `roundUp.ts` and `surcharges.ts` with various rounding edge cases.
    - [x] Write tests for `safeBalance.ts` handling null/undefined/malformed inputs.
    - [x] Write tests for `subscriptions.ts` logic.
- [x] Task: Parser Resilience (`lib/parsers/`)
    - [x] Write tests for `index.ts` (PapaParse wrapper) with malformed CSV headers.
    - [x] Write tests for empty CSV files and files with massive transaction counts.
    - [x] Write tests for CSVs with missing expected columns (e.g., no 'Date' column).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Utilities' (Protocol in workflow.md)

## Phase 2: State Management & Logic Engines (The Core)
Focus: Testing the brain of the application—categorization and state transitions.

- [x] Task: Logic Engine Deep-Dive (`lib/engine/`)
    - [x] Implement exhaustive unit tests for `rules.ts` (static categorization rules).
    - [x] Implement unit tests for `bayesian.ts` (N/A - focused on rules and recurring).
    - [x] Implement tests for `recurring.ts` identifying various frequency patterns (weekly, monthly, quarterly).
    - [x] **TDD:** Implement failing tests for `llm.ts` to simulate Cerebras SDK failures and malformed JSON responses, then ensure the logic handles them gracefully.
- [x] Task: Store Integration & State Flow (`lib/store/`)
    - [x] Write integration tests for the Zustand store handling bulk imports.
    - [x] Verify that importing a CSV correctly triggers the categorization engine and updates the store state.
    - [x] Test persistence logic (if applicable) and state reset conditions.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: State Management & Logic Engines' (Protocol in workflow.md)

## Phase 3: UI Components & User Flows (The Surface)
Focus: Ensuring the visual layer is resilient and correctly reflects the underlying state.

- [ ] Task: Screen & Component Coverage (`app/`)
    - [ ] Write tests for `DashboardScreen.test.tsx` (index.tsx) covering empty states vs. populated states.
    - [ ] Write tests for `ImportScreen.test.tsx` verifying file picker interaction and success/error feedback.
    - [ ] Write tests for `TransactionsScreen.test.tsx` ensuring filters and sorting work correctly.
    - [ ] Write tests for `insights.tsx` and `calendar.tsx` visual summaries.
- [ ] Task: End-to-End User Flow Simulations
    - [ ] Implement a test representing the "Full Cycle": Import CSV -> See categorized transactions -> Check dashboard totals.
    - [ ] Implement a test for "Recurring Bill Management": Identification -> User Override -> State Update.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Components & User Flows' (Protocol in workflow.md)

## Phase 4: Final Validation & Cleanup
Focus: Ensuring the global coverage target is met and all "flaky" logic is removed.

- [ ] Task: Global Coverage Audit
    - [ ] Run full coverage report and identify any remaining "red" lines.
    - [ ] Address any gaps to ensure >95% total coverage.
- [ ] Task: Resilience & Performance Check
    - [ ] Review all tests for timing dependencies (mocking `Date.now()`).
    - [ ] Optimize slow-running tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Validation & Cleanup' (Protocol in workflow.md)
