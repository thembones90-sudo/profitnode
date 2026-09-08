"use strict";
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ------------------------------------------------------------------
   Minimal stateful fake DOM: enough for behavioral probes to dispatch
   real listeners (input / change / click / keydown) against a
   hand-built tree. Existing suites keep working because tree-less
   documents still resolve every query to null, as before.
------------------------------------------------------------------ */

function makeKlass(seed){
  const s = new Set(seed || []);
  return {
    add(k){ s.add(k); return this; },
    remove(k){ s.delete(k); return this; },
    toggle(k, force){
      if (force === undefined){ s.has(k) ? s.delete(k) : s.add(k); }
      else if (force){ s.add(k); } else { s.delete(k); }
      return s.has(k);
    },
    contains(k){ return s.has(k); },
    toString(){ return Array.from(s).join(' '); },
  };
}

function makeStyle(){
  return {
    setProperty(k, v){ this[k] = v; },
    getPropertyValue(k){ return this[k] !== undefined ? String(this[k]) : ''; },
  };
}

/* Parse one compound selector: optional tag, then .class / #id / [attr][=val]. */
function parseCompound(sel){
  const c = { tag: null, id: null, classes: [], attrs: [] };
  const tagRe = /^([a-zA-Z][\w-]*|\*)/;
  const m = tagRe.exec(sel);
  if (m){ c.tag = m[1].toLowerCase(); sel = sel.slice(m[0].length); }
  while (sel.length){
    if (sel[0] === '.'){
      const re = /^\.([\w-]+)/.exec(sel);
      if (!re) break;
      c.classes.push(re[1]); sel = sel.slice(re[0].length);
    } else if (sel[0] === '#'){
      const re = /^#([\w-]+)/.exec(sel);
      if (!re) break;
      c.id = re[1]; sel = sel.slice(re[0].length);
    } else if (sel[0] === '['){
      const close = sel.indexOf(']');
      if (close === -1) break;
      const inner = sel.slice(1, close).trim();
      sel = sel.slice(close + 1);
      const eq = inner.indexOf('=');
      if (eq === -1){ c.attrs.push([inner, null]); }
      else {
        let name = inner.slice(0, eq).trim();
        let val = inner.slice(eq + 1).trim();
        if ((val[0] === '"' && val[val.length - 1] === '"') || (val[0] === "'" && val[val.length - 1] === "'")){
          val = val.slice(1, -1);
        }
        c.attrs.push([name, val]);
      }
    } else { sel = sel.slice(1); }
  }
  return c;
}

function getAttr(el, name){
  if (name === 'class') name = 'className';
  if (el.attrs && Object.prototype.hasOwnProperty.call(el.attrs, name)) return el.attrs[name];
  if (name.slice(0, 5) === 'data-'){
    const prop = name.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    return (el.dataset && prop in el.dataset) ? String(el.dataset[prop]) : null;
  }
  const props = { name:'name', value:'value', type:'type', id:'id', className:'className',
    role:'role', placeholder:'placeholder', disabled:'disabled', checked:'checked', required:'required' };
  const p = props[name];
  if (p && el[p] !== undefined){
    if (typeof el[p] === 'boolean') return el[p] ? 'true' : null;
    return String(el[p]);
  }
  return null;
}

function matchesEl(el, compound){
  if (!el || el.nodeType !== 1) return false;
  if (compound.tag && compound.tag !== '*' && (el.tagName || 'DIV').toLowerCase() !== compound.tag) return false;
  if (compound.id && el.id !== compound.id) return false;
  for (const c of compound.classes){ if (!el.classList.contains(c)) return false; }
  for (const [name, val] of compound.attrs){
    const g = getAttr(el, name);
    if (val === null){ if (g === null) return false; }
    else if (g !== val) return false;
  }
  return true;
}

function matchesSel(el, sel){
  return String(sel).split(',').some(part => {
    const chain = part.trim().split(/\s+/).map(parseCompound).filter(c => c.tag || c.id || c.classes.length || c.attrs.length);
    if (chain.length === 0) return false;
    if (chain.length === 1) return matchesEl(el, chain[0]);
    if (!matchesEl(el, chain[chain.length - 1])) return false;
    let idx = chain.length - 2;
    let cur = el.parentNode;
    while (cur && idx >= 0){
      if (matchesEl(cur, chain[idx])) idx--;
      cur = cur.parentNode;
    }
    return idx < 0;
  });
}

function collect(node, sel, out){
  for (const child of (node.children || [])){
    if (matchesSel(child, sel)) out.push(child);
    collect(child, sel, out);
  }
}

function makeEl(props){
  props = props || {};
  const node = {
    id: props.id || '',
    tagName: String(props.tag || props.tagName || 'div').toUpperCase(),
    className: String(props.className || props.class || ''),
    textContent: props.textContent || '',
    innerHTML: props.innerHTML || '',
    value: props.value !== undefined ? props.value : '',
    name: props.name !== undefined ? props.name : undefined,
    type: props.type !== undefined ? props.type : undefined,
    role: props.role !== undefined ? props.role : undefined,
    placeholder: props.placeholder || '',
    required: !!props.required,
    checked: !!props.checked,
    disabled: !!props.disabled,
    nodeType: 1,
    children: [],
    childNodes: [],
    parentNode: null,
    previousElementSibling: null,
    nextElementSibling: null,
    style: makeStyle(),
    attrs: {},
    dataset: {},
    classList: makeKlass(),
    listeners: {},
  };
  node.children = node.children;
  node.childNodes = node.children;

  node.setAttribute = function(k, v){
    v = String(v);
    node.attrs[k] = v;
    if (k.slice(0, 5) === 'data-'){
      const prop = k.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      node.dataset[prop] = v;
    }
    if (k === 'class' || k === 'className'){ node.className = v; node.classList = makeKlass(v.split(/\\s+/).filter(Boolean)); }
    if (k === 'id') node.id = v;
    if (k === 'name') node.name = v;
    if (k === 'type') node.type = v;
  };
  node.getAttribute = function(k){ return getAttr(node, k); };
  node.hasAttribute = function(k){ return getAttr(node, k) !== null; };
  node.matches = function(sel){ return matchesSel(node, sel); };
  node.closest = function(sel){
    let cur = node;
    while (cur){
      if (matchesSel(cur, sel)) return cur;
      cur = cur.parentNode;
    }
    return null;
  };
  node.querySelector = function(sel){
    const out = [];
    collect(node, sel, out);
    return out[0] || null;
  };
  node.querySelectorAll = function(sel){
    const out = [];
    collect(node, sel, out);
    return out;
  };
  node.appendChild = function(child){
    if (child && child.nodeType){
      if (child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = node;
      node.children.push(child);
    }
    return child;
  };
  node.removeChild = function(child){
    const i = node.children.indexOf(child);
    if (i > -1){ node.children.splice(i, 1); child.parentNode = null; }
    return child;
  };
  node.insertBefore = function(child){ return node.appendChild(child); };
  node.remove = function(){ if (node.parentNode) node.parentNode.removeChild(node); };
  node.contains = function(other){
    let cur = other;
    while (cur){ if (cur === node) return true; cur = cur.parentNode; }
    return false;
  };
  node.addEventListener = function(ev, fn){ (node.listeners[ev] = node.listeners[ev] || []).push(fn); };
  node.removeEventListener = function(ev, fn){
    const list = node.listeners[ev] || [];
    const i = list.indexOf(fn);
    if (i > -1) list.splice(i, 1);
  };
  node.dispatchEvent = function(ev){
    ev = ev || {};
    if (ev.target === undefined) ev.target = node;
    (node.listeners[ev.type] || []).slice().forEach(fn => fn(ev));
  };
  node.click = function(){
    node.dispatchEvent({ type:'click', target:node, _prevented:false, preventDefault(){ this._prevented = true; }, stopPropagation(){} });
  };
  node.focus = function(){ node.focused = true; };
  node.blur = function(){ node.focused = false; };
  node.select = function(){};
  node.setSelectionRange = function(){};
  node.scrollIntoView = function(){};
  node.getBoundingClientRect = function(){ return { width:0, height:0, top:0, left:0, right:0, bottom:0 }; };

  if (props.attrs){
    Object.keys(props.attrs).forEach(k => node.setAttribute(k, props.attrs[k]));
  }
  if (props.dataset){
    Object.keys(props.dataset).forEach(k => { node.dataset[k] = String(props.dataset[k]); });
  }
  node.className.split(/\s+/).filter(Boolean).forEach(c => node.classList.add(c));
  return node;
}

function createSandbox(){
  const storage = {};
  const localStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
  };

  const docListeners = {};
  const timers = [];

  const rootEl = makeEl();
  const bodyEl = makeEl();
  const headEl = makeEl();
  const extraRoots = [];

  const document = {
    readyState: 'complete',
    documentElement: Object.assign(makeEl(), { clientWidth: 1280, clientHeight: 900 }),
    body: bodyEl,
    head: headEl,
    addEventListener(ev, fn){ (docListeners[ev] = docListeners[ev] || []).push(fn); },
    removeEventListener(ev, fn){
      const list = docListeners[ev] || [];
      const i = list.indexOf(fn);
      if (i > -1) list.splice(i, 1);
    },
    getElementById(id){ return id === 'root' ? rootEl : null; },
    createElement(tag){ return makeEl({ tag: tag }); },
    createTextNode(){ return { textContent: '' }; },
    querySelector(sel){
      const out = [];
      collectWrap([].concat(document.documentElement, document.body, document.head, extraRoots), sel, out);
      return out[0] || null;
    },
    querySelectorAll(sel){
      const out = [];
      collectWrap([].concat(document.documentElement, document.body, document.head, extraRoots), sel, out);
      return out;
    },
  };

  function collectWrap(roots, sel, out){
    roots.forEach(r => {
      if (matchesSel(r, sel)) out.push(r);
      collect(r, sel, out);
    });
  }

  let uuidN = 0;
  const crypto = { randomUUID: () => 'test-uuid-' + (uuidN++) };

  const window = {
    claude: undefined,
    addEventListener(){}, removeEventListener(){},
    innerWidth: 1280, innerHeight: 900,
    getComputedStyle(){ return { borderTopWidth: '0px', borderBottomWidth: '0px' }; },
    ResizeObserver: undefined,
    requestAnimationFrame(){ return 0; }, cancelAnimationFrame(){},
    __pnTree: extraRoots,
    __pnDocListeners: docListeners,
  };

  class MutationObserver { constructor(cb){ this.cb = cb; } observe(){} disconnect(){} takeRecords(){ return []; } }
  class ResizeObserver { observe(){} disconnect(){} }

  const sandbox = {
    console, localStorage, crypto, window, document,
    MutationObserver, ResizeObserver,
    setInterval(){ return 0; }, clearInterval(){},
    setTimeout(fn){ timers.push(fn); return timers.length; },
    clearTimeout(id){ if (id && id > 0) timers[id - 1] = null; },
    requestAnimationFrame(){ return 0; }, cancelAnimationFrame(){},
    Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
    CSS: { escape(s){ return String(s); } },
    URL: { createObjectURL(){ return 'blob:mock'; }, revokeObjectURL(){} },
    Blob: function(){},
    FileReader: function(){},
    fetch(){ return Promise.resolve({ ok:false, status:404, json(){ return Promise.resolve({}); }, text(){ return Promise.resolve(''); } }); },
    FormData: function(form){
      const kv = {};
      if (form){
        form.querySelectorAll('input,select,textarea').forEach(el => {
          if (el.name && el.type !== 'checkbox') kv[el.name] = el.value;
          else if (el.name && el.checked) kv[el.name] = el.value;
        });
      }
      return { forEach(cb){ Object.keys(kv).forEach(k => cb(kv[k], k)); }, get(k){ return k in kv ? kv[k] : null; } };
    },
    __pnDocListeners: docListeners,
    __pnRoot: rootEl,
    __pnEl: makeEl,
    __pnTree: extraRoots,
    __pnFlushTimers(){ const pending = timers.splice(0); pending.forEach(fn => { if (typeof fn === 'function') fn(); }); },
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