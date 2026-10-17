"use strict";
// Regression test for the cross-tab flicker bug: two PROFITNODE tabs open at
// once would ping-pong into a "LEDGER CHANGED IN ANOTHER TAB" lock + re-render
// loop any time a cloud round-trip (or any other write) re-serialized the SAME
// ledger content with a different JSON key order. The `storage` event listener
// in app_core.js used to compare raw strings; it must now compare canonical
// (content) equality so a cosmetic re-ordering is not mistaken for a real
// external edit, while a genuine external edit still locks the tab as designed.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const env = require('./pn_test_env.js');

const DIR = __dirname;
const sandbox = env.createSandbox();
const code = fs.readFileSync(path.join(DIR, 'app_core.js'), 'utf8');
vm.runInContext(code, sandbox, { filename: 'app_core.js' });

const out = [];
function check(label, cond) { out.push([label, !!cond]); }

env.run(sandbox, `Store.load(); Store.persist();`);

// Simulate another tab's write landing with the SAME ledger content but a
// different top-level JSON key order (exactly what a Supabase/JSONB round
// trip produces versus the app's own locally-authored object order).
env.run(sandbox, `(function(){
  const current = localStorage.getItem(STORAGE_KEY);
  const parsed = JSON.parse(current);
  const reordered = {};
  Object.keys(parsed).reverse().forEach(k => { reordered[k] = parsed[k]; });
  window.dispatchEvent({ type: 'storage', key: STORAGE_KEY, newValue: JSON.stringify(reordered), oldValue: current });
})();`);
check(
  'a reordered-but-content-identical cross-tab write does NOT lock the ledger (no false flicker lock)',
  env.run(sandbox, `Store._writeLocked === false && (!Store.error || Store.error.type !== "EXTERNAL_CHANGE")`)
);

// A genuinely different external write must still trip the real protection.
env.run(sandbox, `(function(){
  const current = localStorage.getItem(STORAGE_KEY);
  const parsed = JSON.parse(current);
  parsed.meta = Object.assign({}, parsed.meta, { __test_marker: 'changed' });
  window.dispatchEvent({ type: 'storage', key: STORAGE_KEY, newValue: JSON.stringify(parsed), oldValue: current });
})();`);
check(
  'a genuinely different cross-tab write still locks the ledger with EXTERNAL_CHANGE',
  env.run(sandbox, `Store._writeLocked === true && Store.error && Store.error.type === "EXTERNAL_CHANGE"`)
);

let failed = 0;
out.forEach(([label, ok]) => {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + label);
  if (!ok) failed++;
});
console.log('\n' + (failed ? failed + ' FAILED' : 'ALL PASSED') + ' (' + out.length + ' assertions)');
process.exit(failed ? 1 : 0);
