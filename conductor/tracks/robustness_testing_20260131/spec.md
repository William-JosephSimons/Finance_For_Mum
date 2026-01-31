# Track Spec: Comprehensive Testing & Robustness Overhaul

## Overview
This track is a monumental effort to elevate the "Mum_Finance" project's testing suite to a state of maximum robustness. The goal is to move from basic coverage to a comprehensive, resilient, and high-fidelity testing environment that catches edge cases, validates complex user flows, and ensures a stress-free experience for the target user (Mum).

## Functional Requirements
- **Logic Engine Saturation:**
    - 100% Unit test coverage for `lib/engine/` (Categorization, LLM, Recurring, Rules).
    - Property-based testing for categorization to ensure stability across diverse transaction descriptions.
    - Deep mocking of the Cerebras LLM SDK to test all possible response scenarios (success, malformed JSON, timeout, rate limits).
- **State & Data Integrity:**
    - Integration tests for the Zustand store (`lib/store/`) verifying complex state transitions (e.g., import -> auto-categorize -> summary update).
    - Stress testing for `lib/parsers/` with malformed, empty, and massive CSV files.
- **UI & User Flow Validation:**
    - Component testing for all screens in `app/` using React Testing Library.
    - Integration tests for critical user paths:
        - The "Import to Insight" flow: CSV Import -> Processing -> Dashboard Update.
        - Recurring Bill management: Identification -> Calendar Display -> User Override.
    - Testing "Empty States" and "Loading States" for every UI component.
- **Utility Robustness:**
    - Exhaustive unit tests for all utility functions in `lib/utils/` (formatting, rounding, balance logic).

## Non-Functional Requirements
- **Coverage Target:** Minimum 95% line coverage across the entire codebase.
- **Performance:** Ensure the test suite remains fast and CI-friendly by utilizing efficient mocking and parallel execution where possible.
- **Determinism:** Eliminate all "flaky" tests, especially those involving date-time logic or asynchronous state updates.
- **Readability:** Tests should serve as "Living Documentation" for the project's business logic.

## Acceptance Criteria
- [ ] `npm test` runs a comprehensive suite covering all logic, store, and UI modules.
- [ ] Global code coverage report shows >95% total coverage.
- [ ] Every "Key Feature" defined in `product.md` has at least one corresponding integration test.
- [ ] Error handling for LLM failures and malformed CSVs is explicitly verified through tests.
- [ ] The `__tests__` directory structure mirrors the `lib` and `app` structures for clarity.

## Out of Scope
- Integration with live bank APIs (keeping it CSV-import focused as per product definition).
- Performance benchmarking of the app itself (focus is on correctness and robustness).
