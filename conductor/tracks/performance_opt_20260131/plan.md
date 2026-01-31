# Implementation Plan: Global Performance Optimization

This plan follows the "Tiger Beetle" philosophy, focusing on mechanical sympathy, explicit batching, and resource sketches to achieve global optimization across the codebase.

## Phase 1: Performance Audit & Resource Sketching [checkpoint: 15c8d51]
- [x] Task: Conduct back-of-the-envelope sketches for core resources (Network, Disk, Memory, CPU) for the Import, Engine, and UI layers. a98ec02
- [x] Task: Profile current CSV import and categorization engine performance to establish a baseline. 2040d64
- [x] Task: Identify "hot paths" and high-allocation zones in the Zustand store and transaction filtering logic. a5f62f5
- [x] Task: Conductor - User Manual Verification 'Phase 1: Performance Audit' (Protocol in workflow.md) a98ec02

## Phase 2: Data Plane & Engine Optimization (Batching & Mechanical Sympathy)
- [ ] Task: Refactor `lib/engine/categorization.ts` and `rules.ts` to use batched processing instead of per-transaction calls.
- [ ] Task: Optimize transaction data structures in `lib/store/index.ts` to minimize serialization overhead and improve cache locality.
- [ ] Task: Extract hot loops from engine logic into stand-alone functions with primitive arguments to assist compiler optimization.
- [ ] Task: Implement batching for transaction state updates to prevent redundant UI re-renders.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Engine Optimization' (Protocol in workflow.md)

## Phase 3: UI Rendering & Responsiveness (60fps Target)
- [ ] Task: Audit and optimize transaction list rendering using virtualization and targeted memoization.
- [ ] Task: Refactor state selectors in screens to ensure only necessary components re-render on data changes.
- [ ] Task: Optimize navigation transitions and input feedback to meet the <100ms response target.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI Responsiveness' (Protocol in workflow.md)

## Phase 4: Integration & LLM Optimization
- [ ] Task: Batch LLM prompts and optimize Cerebras Cloud SDK usage for faster insight generation.
- [ ] Task: Implement a lightweight caching layer for recurring bill calculations and LLM-generated insights.
- [ ] Task: Final verification of the entire system against the performance sketches and baseline.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification' (Protocol in workflow.md)
