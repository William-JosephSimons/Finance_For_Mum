# Specification: android_fixes_and_cleanup_20260131

## Overview
This track addresses several issues identified during Android manual testing, removes the unnecessary PayID feature, fixes a data consistency bug between transactions and bills, and improves the test suite's robustness and app performance.

## Functional Requirements

### Android UI & Performance
- **Shadow Prop Fix:** Resolve the "shadowOffset as a prop" error by correctly nesting shadow styles within the `style` object or using `Platform.select` to use `elevation` on Android. This error is likely contributing to UI jank.
- **Render Optimization:** `useMemo`ize expensive financial calculations (Safe Balance, Recurring Patterns, Round-ups, Surcharges) in the Dashboard and Bills screens to prevent redundant work on every render.
- **Button Accessibility:** Ensure category buttons and other interactive elements in the categorization modal meet minimum touch target requirements (44x44px).

### Bug Fixes
- **Bills Sync:** Ensure that when a transaction is categorized as "Utilities" or "Subscriptions" (or "Bills" if added), it is automatically marked as `isRecurring: true` so it appears on the Bills page.
- **Data Refresh:** Verify that changing a transaction category immediately triggers a re-calculation of recurring patterns on the Bills page.

### Feature Removal
- **PayID Removal:** Completely remove the PayID feature from the application.
  - Delete `app/(tabs)/payid.tsx`.
  - Remove "PayID" tab from `app/(tabs)/_layout.tsx`.
  - Remove `PayIDContact` interface and associated state/actions from `lib/store/index.ts`.
  - Clean up factories and tests related to PayID.

### Test Suite Refinement
- **Integration Tests:** Add a new integration test that simulates:
  1. Importing a transaction.
  2. Changing its category to a recurring-type category.
  3. Verifying it now appears in the projected bills on the Bills page.
- **Test Robustness:** Fix any existing broken tests (e.g., Bayesian engine module resolution issues identified in logs).

## Acceptance Criteria
- [ ] No "shadowOffset" console errors on Android.
- [ ] App interactions (scrolling, button presses) feel fluid on Android.
- [ ] Categorizing a transaction as "Utilities" makes it appear on the Bills page.
- [ ] PayID tab and all related code are completely removed.
- [ ] All tests pass, including new integration tests.
