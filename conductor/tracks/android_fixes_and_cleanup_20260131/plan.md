# Implementation Plan: android_fixes_and_cleanup_20260131

This plan addresses Android-specific UI fixes, removal of the PayID feature, and ensuring data consistency between transactions and the Bills page.

## Phase 1: PayID Feature Removal
Goal: Completely remove all code related to the PayID contact management feature.

- [x] Task: Remove `app/(tabs)/payid.tsx` and its references in `app/(tabs)/_layout.tsx`
- [x] Task: Remove `PayIDContact` interface and `contacts` state/actions from `lib/store/index.ts`
- [x] Task: Remove PayID-related factories from `__tests__/factories.ts`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: PayID Removal' (Protocol in workflow.md)

## Phase 2: Android UI & Performance Fixes
Goal: Resolve console errors and optimize rendering for a smoother experience on Android.

- [ ] Task: Fix `shadowOffset` warning in `app/(tabs)/_layout.tsx` by using `Platform.select` for shadow styles
- [ ] Task: `useMemo`ize financial calculations in `app/(tabs)/index.tsx` (Dashboard)
- [ ] Task: Increase touch targets for category buttons in `app/(tabs)/transactions.tsx` categorization modal
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Android UI & Performance' (Protocol in workflow.md)

## Phase 3: Bills Page Sync & Consistency
Goal: Ensure manual categorization updates are reflected on the Bills page.

- [ ] Task: Update `handleCategorize` in `app/(tabs)/transactions.tsx` to automatically set `isRecurring: true` for "Utilities" and "Subscriptions"
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Bills Page Sync' (Protocol in workflow.md)

## Phase 4: Integration Testing & Quality Gate
Goal: Verify the fixes with automated tests and ensure no regressions.

- [ ] Task: Create End-to-End integration test covering "Import -> Categorize -> Bills Page Update"
- [ ] Task: Run full test suite and verify all tests pass
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Quality Gate' (Protocol in workflow.md)
