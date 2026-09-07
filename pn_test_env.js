"use strict";
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const classList = {
  add(){}, remove(){}, toggle(){}, contains(){ return false; },
};

function makeEl(){
  return {
    id:'', className:'', tagName:'DIV', textContent:'', innerHTML:'', value:'', nodeType:1,
    style:{ setProperty(){}, },
    dataset:{},
    children:[], childNodes:[],
    classList,
    setAttribute(){}, getAttribute(){ return null; },
    appendChild(){}, removeChild(){}, insertBefore(){},
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; }, closest(){ return null; },
    getBoundingClientRect(){ return { width:0, height:0, top:0, left:0 }; },
    previousElementSibling:null, nextElementSibling:null, parentNode:null,
    click(){}, focus(){},
  };
}

function createSandbox(){
  const storage = {};
  const localStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
  };

  const rootEl = makeEl();
  const bodyEl = makeEl();
  const headEl = makeEl();
  const docListeners = {};

  const document = {
    readyState: 'complete',
    documentElement: Object.assign(makeEl(), { clientWidth: 1280, clientHeight: 900 }),
    body: bodyEl,
    head: headEl,
    addEventListener(ev, fn){ (docListeners[ev] = docListeners[ev] || []).push(fn); },
    removeEventListener(){},
    getElementById(id){ return id === 'root' ? rootEl : null; },
    createElement(){ return makeEl(); },
    createTextNode(){ return { textContent: '' }; },
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
  };

  let uuidN = 0;
  const crypto = { randomUUID: () => 'test-uuid-' + (uuidN++) };

  const window = {
    claude: undefined,
    addEventListener(){}, removeEventListener(){},
    innerWidth: 1280, innerHeight: 900,
    getComputedStyle(){ return { borderTopWidth: '0px', borderBottomWidth: '0px' }; },
    ResizeObserver: undefined,
    requestAnimationFrame(){ return 0; }, cancelAnimationFrame(){},
  };

  class MutationObserver { constructor(cb){ this.cb = cb; } observe(){} disconnect(){} takeRecords(){ return []; } }
  class ResizeObserver { observe(){} disconnect(){} }

  const sandbox = {
    console, localStorage, crypto, window, document,
    MutationObserver, ResizeObserver,
    setInterval(){ return 0; }, clearInterval(){},
    setTimeout(){ return 0; }, clearTimeout(){},
    requestAnimationFrame(){ return 0; }, cancelAnimationFrame(){},
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    CSS: { escape(s){ return String(s); } },
    URL: { createObjectURL(){ return 'blob:mock'; }, revokeObjectURL(){} },
    Blob: function(){},
    FileReader: function(){},
    fetch(){ return Promise.resolve({ ok:false, status:404, json(){ return Promise.resolve({}); }, text(){ return Promise.resolve(''); } }); },
    __pnDocListeners: docListeners,
    __pnRoot: rootEl,
  };

  vm.createContext(sandbox);
  return sandbox;
}

function manifestEntries(sandbox, dir){
  const manifestCode = fs.readFileSync(path.join(dir, 'pn_scripts.js'), 'utf8');
  vm.runInContext(manifestCode, sandbox, { filename: 'pn_scripts.js' });
  const list = sandbox.window && sandbox.window.__PN_SCRIPTS;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('pn_scripts.js did not populate window.__PN_SCRIPTS');
  }
  return list;
}

function loadAll(sandbox, dir){
  const entries = manifestEntries(sandbox, dir);
  for (const entry of entries){
    const file = entry.split('?')[0];
    const code = fs.readFileSync(path.join(dir, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
  return entries;
}

function run(sandbox, code){
  return vm.runInContext(code, sandbox, { filename: 'probe.js' });
}

function fireDOMContentLoaded(sandbox){
  const handlers = (sandbox.__pnDocListeners && sandbox.__pnDocListeners.DOMContentLoaded) || [];
  handlers.slice().forEach(fn => fn());
}

module.exports = { createSandbox, manifestEntries, loadAll, run, fireDOMContentLoaded };