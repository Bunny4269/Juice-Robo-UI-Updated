/* ============================================================
   JUICE ROBO — FEATURE FLAGS
   ============================================================

   Centralized configuration for optional features.
   Change these values to enable or disable a feature globally.

   LOCATION_ENABLED
     1 → Show the Location Selection flow (existing behaviour).
     0 → Bypass Location Selection entirely. No location screen,
         no location confirmation, no location API calls.

   MACHINE_ENABLED
     1 → Show the Machine Selection flow (existing behaviour).
     0 → Bypass Machine Selection entirely. No machine screen,
         no machine confirmation, no machine API calls.

   CURRENT CONFIGURATION
   ---------------------
     LOCATION_ENABLED = 0  (Location selection is disabled)
     MACHINE_ENABLED  = 0  (Machine selection is disabled)

   HOW TO RE-ENABLE
   ----------------
   To re-enable Location:  set LOCATION_ENABLED = 1
   To re-enable Machine:   set MACHINE_ENABLED  = 1

   NOTE: These are frontend-only flags. The backend APIs for
   location and machine are preserved and will function normally
   when the flags are set to 1.
   ============================================================ */

export const LOCATION_ENABLED = 1;
export const MACHINE_ENABLED  = 1;
