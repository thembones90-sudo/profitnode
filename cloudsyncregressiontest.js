"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "cloud_sync_extension.js"), "utf8");
const document = {
  readyState: "loading",
  createElement(){ return {textContent:""}; },
  head: {appendChild(){}},
  addEventListener(){}
};
const sandbox = {window:{}, document, console, localStorage:{}, setTimeout, clearTimeout, addEventListener(){}};
vm.runInNewContext(source, sandbox, {filename:"cloud_sync_extension.js"});
const {authorityDecision, fingerprint} = sandbox.window.__PN_CLOUD_SYNC_TEST__;

const remote = {revision:42, ledger:{
  projects:[{id:"rig",name:"GHOUL",status:"OPEN"}],
  inventory:[{id:"ram",status:"AVAILABLE"}],
  sales:[], timeline:[], treasury:{balances:[{currency:"RSD",amount:1000}]}
}};
const queue = {baseRevision:42,ledger:{
  projects:[{id:"rig",name:"GHOUL",status:"BUILT"}],
  inventory:[{id:"ram",status:"AVAILABLE"}],
  sales:[], timeline:[], treasury:{balances:[{currency:"RSD",amount:1000}]}
}};
const changedLocal = JSON.parse(JSON.stringify(queue.ledger));
changedLocal.treasury.balances[0].amount = 1250;

assert.strictEqual(authorityDecision(changedLocal,null,remote,queue),"CONFLICT",
  "newer browser edits must not be replaced by an older queued snapshot");
assert.strictEqual(authorityDecision(queue.ledger,null,remote,queue),"RESUME_QUEUE",
  "matching local queue can still resume its unchanged cloud revision");
assert.strictEqual(authorityDecision(remote.ledger,{fingerprint:fingerprint(remote.ledger),revision:42},remote,null),"CURRENT");
assert.strictEqual(authorityDecision(null,null,remote,null),"APPLY_REMOTE");
assert.match(source, /OPEN BROWSER WORKSPACE · SYNC OFF/);
assert.match(source, /function enterLocalWorkspace\(\)/);
assert.match(source, /if\(!user\|\|checking\|\|localWorkspace\)return/);
assert.match(source, /hydrated&&!localWorkspace&&phase!=="CONFLICT"/);
assert.match(source, /RESOLVE SYNC/);

const escapeFunction=source.slice(source.indexOf("function enterLocalWorkspace()"),source.indexOf("function conflictGate(remote)"));
assert.doesNotMatch(escapeFunction,/casWrite\(|seedCloud\(|applyRemote\(|localStorage\.removeItem\(/,
  "opening local workspace must never replace or write a ledger");
console.log("CLOUD SYNC REGRESSION: 9 checks passed");
