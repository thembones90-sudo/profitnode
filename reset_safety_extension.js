"use strict";

(function(){
  if (window.__PN_RESET_SAFETY_V1__) return;
  window.__PN_RESET_SAFETY_V1__ = true;

  // Guards the Danger Zone "RESET ALL DATA" button:
  //   1) Auto-saves a timestamped backup (reuses app_core.js's own exportBackup())
  //      immediately before the wipe actually executes — every reset now leaves
  //      a recoverable profitnode-backup-*.json behind, with no change needed
  //      to how the button is used.
  //   2) Enforces a short cooldown between the "arm" click and the "confirm"
  //      click, so two fast/accidental clicks can't land as arm+execute in one
  //      gesture. A deliberate confirm after the pause still works exactly as
  //      before.
  //
  // Pure addition — does not modify app_core.js. Runs in the capture phase so
  // it always sees a click before app_core.js's own bubble-phase handler does.

  const COOLDOWN_MS = 2500;

  document.addEventListener('click', function(e){
    const btn = e.target.closest('[data-reset-all]');
    if (!btn) return;

    if (btn.dataset.armed === '1') {
      // This is the confirm/execute click.
      const armedAt = Number(btn.dataset.armedAt || 0);
      const elapsed = Date.now() - armedAt;

      if (!armedAt || elapsed < COOLDOWN_MS) {
        // Too fast to be a deliberate second click — block it and let the
        // cooldown keep counting down instead of executing the wipe.
        e.preventDefault();
        e.stopImmediatePropagation();
        const remainingS = Math.max(0, (COOLDOWN_MS - elapsed) / 1000);
        const prevText = btn.dataset.resetSafetyPrevText || btn.textContent;
        btn.dataset.resetSafetyPrevText = prevText;
        btn.textContent = 'WAIT ' + remainingS.toFixed(1) + 's…';
        clearTimeout(btn.__pnResetSafetyRestoreTimer);
        btn.__pnResetSafetyRestoreTimer = setTimeout(function(){
          if (btn.dataset.armed === '1') btn.textContent = prevText;
        }, 400);
        return;
      }

      // Deliberate confirm — back up first, then let app_core.js's own
      // bubble-phase handler run and perform the actual wipe.
      try {
        if (typeof exportBackup === 'function') {
          exportBackup();
        } else {
          console.warn('[PROFITNODE] RESET SAFETY V1: exportBackup() not found — reset proceeding without an auto-backup.');
        }
      } catch (err) {
        console.error('[PROFITNODE] RESET SAFETY V1: pre-reset auto-backup failed, reset proceeding anyway:', err);
      }
      return;
    }

    // This is the arming click. app_core.js's own handler (bubble phase,
    // runs after this) is what actually sets dataset.armed = '1' — wait a
    // microtask so it has run before we stamp the time.
    queueMicrotask(function(){
      if (btn.dataset.armed === '1') {
        btn.dataset.armedAt = String(Date.now());
      }
    });
  }, true);

  console.info('[PROFITNODE] RESET SAFETY V1 active · auto-backup + 2.5s cooldown guard the Reset All Data button.');
})();
