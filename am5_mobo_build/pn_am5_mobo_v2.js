"use strict";
/* PROFITNODE AM5 Motherboard rating engine — PN_AM5_MOBO_V2
   Weights: VRM 25 / Expansion 15 / Storage 15 / Memory 10 /
            Connectivity 10 / I/O 10 / PCB 10 / Features 5  (total 100)
   Capability/quality only. Price, value and chipset prestige are never used.
   Unknown fields are stored as UNKNOWN and reduce rating_confidence. */

const TIERS = { SCRAPBLADE: [0, 29], SCRAPWRAITH: [30, 44], REVENANT: [45, 59], GHOUL: [60, 79], ALGHOUL: [80, 100] };
function tierOfScore(s){
  for (const k of Object.keys(TIERS)){ const r = TIERS[k]; if (s >= r[0] && s <= r[1]) return k; }
  return "SCRAPWRAITH";
}
const UNK = "UNKNOWN";
function n(x){ const v = Number(x); return Number.isFinite(v) ? v : null; }
function has(x){ return x !== null && x !== undefined && !(typeof x === "string" && (!x.trim() || x.trim().toUpperCase() === UNK)); }
function str(x){ return has(x) ? String(x) : null; }
function parseMaxMts(s){ // "8600+MT/s(OC)" etc -> number
  const v = str(s); if (!v) return null;
  const m = v.match(/(\d{3,5})\s*\+?\s*MT/); if (!m) return null;
  let n2 = parseInt(m[1], 10); if (v.indexOf("+") !== -1) n2 = Math.max(n2, Math.min(10000, n2 + 400));
  return n2;
}
function wifiScore(w){
  const s = str(w); if (!s) return 55;
  if (/WIFI\s*7|WI-FI\s*7|802\.11be|BE2/i.test(s)) return 100;
  if (/WIFI\s*6E|WI-FI\s*6E|802\.11ax\s*6|6E/i.test(s)) return 82;
  if (/WIFI\s*6|WI-FI\s*6|802\.11ax|AX/i.test(s)) return 70;
  return 30;
}
function ethScore(e){
  const s = str(e); if (!s) return 50;
  if (/10G/i.test(s)) return 100;
  if (/5G/i.test(s)) return 90;
  if (/2\.5G/i.test(s)) return 78;
  if (/1G/i.test(s)) return 55;
  return 55;
}
function epsScore(eps){
  const s = str(eps); if (!s) return 80;
  const e = s.toUpperCase();
  if (/\b2\s*[X×*]?\s*8\b|DUAL\s+8|2X8|8\+8/.test(e)) return 100;
  if (/\b1\s*[X×*]?\s*8\b|SINGLE\s+8\b/.test(e)) return 76;
  if (/4\+4|6-PIN|6 PIN/.test(e)) return 50;
  return 80;
}
function ampScore(a){ const v = n(a); if (v === null) return 50; if (v >= 110) return 100; if (v >= 90) return 85; if (v >= 80) return 74; if (v >= 70) return 64; if (v >= 60) return 55; if (v >= 50) return 45; return 32; }
function phaseScore(p){
  const v = n(p); if (v === null) return 50;
  if (v >= 20) return 100; if (v >= 16) return 90; if (v >= 14) return 80; if (v >= 12) return 70;
  if (v >= 10) return 62; if (v >= 8) return 53; if (v === 6) return 44; return 36;
}
function m2MaxGen(d){
  const s = str(d); if (!s) return null;
  const m = s.match(/PCIE\s*(\d)\s*[X×]?\s*\d?/); return m ? parseInt(m[1], 10) : null;
}
function genScore(g){ const v = n(g); if (v === null) return 50; if (v >= 5) return 100; if (v === 4) return 72; if (v === 3) return 46; return 30; }

function vrmSub(b){
  const ph = phaseScore(b.vrm_phases), amp = ampScore(b.power_stage_rating), eps = epsScore(b.eps_connectors);
  const hs = b.vrm_heatsink === true ? 100 : b.vrm_heatsink === false ? 55 : 65;
  if (has(b.vrm_phases)) return Math.round(0.45 * ph + 0.25 * amp + 0.2 * eps + 0.1 * hs);
  return Math.round(0.35 * amp + 0.25 * eps + 0.2 * hs + 0.2 * 50);
}
function expSub(b){
  const g = genScore(b.primary_pcie_generation);
  const lanes = /x16/i.test(str(b.primary_pcie_lanes) || "") ? 100 : /x8/i.test(str(b.primary_pcie_lanes) || "") ? 72 : /x4/i.test(str(b.primary_pcie_lanes) || "") ? 50 : 60;
  const slots = n(b.pcie_x16_slots); const sc = slots === null ? 70 : slots >= 2 ? 96 : slots === 1 ? 78 : 50;
  return Math.round(0.55 * g + 0.28 * lanes + 0.17 * sc);
}
function stSub(b){
  const m2 = n(b.m2_slots); const mc = m2 === null ? 50 : m2 >= 5 ? 100 : m2 === 4 ? 92 : m2 === 3 ? 80 : m2 === 2 ? 62 : m2 === 1 ? 42 : 10;
  const g5 = /PCIE\s*5/i.test(str(b.m2_details) || "") ? 100 : has(b.m2_details) ? 64 : 65;
  const sata = n(b.sata_ports); const sc = sata === null ? 62 : sata >= 4 ? 100 : sata === 3 ? 86 : sata === 2 ? 68 : 40;
  const hs = b.m2_heatsinks === true ? 100 : b.m2_heatsinks === false ? 45 : 65;
  let out = Math.round(0.35 * mc + 0.25 * g5 + 0.2 * sc + 0.2 * hs);
  if (/shar|disabl|degrad|reduc|x8 mode|shared/i.test(str(b.lane_sharing) || "")) out = Math.max(0, out - 10);
  return out;
}
function memSub(b){
  const slots = n(b.memory_slots); let sc;
  if (slots === null) sc = 70;
  else if (slots === 4) sc = 92;
  else if (slots === 2) sc = /ROG|ITX|I GAMING/i.test((str(b.family) || "") + " " + (str(b.form_factor) || "") + " " + (str(b.model) || "")) ? 90 : 68;
  else sc = 70;
  const mt = parseMaxMts(b.max_memory_speed);
  let sp; if (mt === null) sp = 55; else if (mt >= 9000) sp = 100; else if (mt >= 8000) sp = 92; else if (mt >= 7200) sp = 82; else if (mt >= 6400) sp = 72; else if (mt >= 5600) sp = 64; else sp = 50;
  return Math.round(0.5 * sc + 0.5 * sp);
}
function conSub(b){
  const e = ethScore(b.ethernet_speed), w = wifiScore(b.wifi_standard);
  let usb4 = 55;
  if (b.usb4 === true) usb4 = 100;
  else if (b.usb4 === false) usb4 = /X870E|X670E|X670|X870/.test(str(b.chipset) || "") ? 35 : 60;
  const uc = /USB.*C|TYPEC|Type-C/i.test((str(b.rear_usb) || "") + " " + (str(b.front_usb_c_header) || "")) ? 72 : 50;
  return Math.round(0.28 * e + 0.27 * w + 0.27 * usb4 + 0.18 * uc);
}
function ioSub(b){
  const fb = b.bios_flashback === true ? 100 : b.bios_flashback === false ? 40 : 60;
  const cc = b.clear_cmos === true ? 96 : 55;
  const dl = b.debug_led === true ? 85 : 55;
  const pc = b.post_code === true ? 95 : 55;
  const bt = b.onboard_buttons === true ? 90 : 55;
  const au = /ALC4082|ALC4080|ESS|SUPREME/i.test(str(b.audio_codec) || "") ? 88 : str(b.audio_codec) ? 68 : 55;
  return Math.round(0.3 * fb + 0.2 * cc + 0.15 * dl + 0.15 * pc + 0.1 * bt + 0.1 * au);
}
function pcbSub(b){
  const vhs = b.vrm_heatsink === true ? 100 : b.vrm_heatsink === false ? 50 : 65;
  const mh = b.m2_heatsinks === true ? 100 : b.m2_heatsinks === false ? 40 : 65;
  const pl = n(b.pcb_layers); let lp; if (pl === null || b.pcb_layers === "UNKNOWN") lp = 60; else if (pl >= 10) lp = 100; else if (pl === 8) lp = 85; else if (pl === 6) lp = 65; else lp = 50;
  return Math.round(0.4 * vhs + 0.4 * mh + 0.2 * lp);
}
function featPoints(b){
  let s = 0;
  if (b.usb4 === true) s += 18;
  const eth = str(b.ethernet_speed) || "";
  if (/10G/i.test(eth)) s += (/10G/i.test(eth) && (eth.match(/10G/g) || []).length >= 2) ? 16 : 12;
  if (/5G/i.test(eth)) s += 8;
  if (/BTF|BACK.?CONNECT|HIDDEN.?CONNECTOR/i.test(str(b.full_model_name) || "")) s += 12;
  if (/ALC4082|ALC4080|ESS|SUPREME/i.test(str(b.audio_codec) || "")) s += 10;
  if (/FLEXKEY|LN2|START BUTTON|PROBEIT|EXTREME OC/i.test(str(b.rating_notes_extra) || "") || b.onboard_buttons === true) s += 8;
  if (/PROART|PRO WS/i.test(str(b.family) || "")) s += 10;
  if (/LCD|OLED/i.test(str(b.rating_notes_extra) || "")) s += 5;
  if (/Q-RELEASE|NITROPATH|AEMP/i.test(str(b.rating_notes_extra) || "") || (b.rating_notes_extra && /PCIE.*Q|Q-SLOT/i.test(b.rating_notes_extra))) s += 4;
  return Math.min(100, s);
}
function feaSub(b){
  const raw = b._featOverride || featPoints(b);
  if (has(b._featOverride)) return Math.min(100, Math.round(Number(b._featOverride)));
  return Math.min(100, raw);
}

function penalties(b, subs){
  const notes = [];
  const ph = n(b.vrm_phases);
  if (ph !== null && ph < 8 && !/A620|B840|B650/.test(str(b.chipset) || "")) notes.push("WEAK VRM for the platform class");
  if (b.vrm_heatsink === false) notes.push("weak VRM heatsinks");
  if (/x8 mode|shared|shar/i.test(str(b.lane_sharing) || "") && /X870|X670/i.test(str(b.chipset) || "")) notes.push("severe lane conflict on a flagship-class board");
  const md = str(b.m2_details) || "", mmax = m2MaxGen(md);
  if (/B850|X670/.test(str(b.chipset) || "") && mmax !== null && mmax < 5 && !/X670\b/.test(str(b.chipset) || "")) notes.push("crippled M.2 config — no Gen 5 M.2 on a Gen-5-M.2 chipset");
  const eth = str(b.ethernet_speed) || "";
  if (/X670E|X870E/.test(str(b.chipset) || "") && eth && !/10G|5G|2\.5G/.test(eth)) notes.push("weak networking relative to flagship chipset class");
  if (/X670|X870/.test(str(b.chipset) || "") && b.bios_flashback === false) notes.push("missing BIOS FlashBack on a higher-class board");
  return notes;
}
function confidenceOf(b){
  let unk = 0, tot = 0;
  const keys = ["vrm_phases","power_stage_rating","eps_connectors","primary_pcie_generation","primary_pcie_lanes","pcie_x16_slots","m2_slots","m2_details","sata_ports","memory_slots","max_memory_speed","ethernet_speed","wifi_standard","usb4","rear_usb","bios_flashback","clear_cmos","audio_codec"];
  keys.forEach(k => { tot++; if (!has(b[k])) unk++; });
  const ratio = tot ? unk / tot : 1;
  if (b._claim === "HIGH") return "HIGH";
  if (b._claim === "LOW") return "LOW";
  if (ratio > 0.42) return "LOW";
  if (ratio > 0.2) return "MEDIUM";
  return "HIGH";
}
function pinOverride(s){ const v = n(s); return v !== null ? Math.max(0, Math.min(100, v)) : null; }

function rateBoard(b){
  const subs = { vrm: vrmSub(b), expansion: expSub(b), storage: stSub(b), memory: memSub(b),
    connectivity: conSub(b), io: ioSub(b), pcb: pcbSub(b), features: feaSub(b) };
  let score = Math.round(0.25 * subs.vrm + 0.15 * subs.expansion + 0.15 * subs.storage + 0.10 * subs.memory +
    0.10 * subs.connectivity + 0.10 * subs.io + 0.10 * subs.pcb + 0.05 * subs.features);
  const pen = penalties(b, subs);
  const pin = pinOverride(b._pnScore); if (pin !== null) { score = pin; }
  score = Math.max(0, Math.min(100, score));
  return { pn_score: score, pn_tier: tierOfScore(score), subs, penalties: pen, confidence: confidenceOf(b) };
}

function normalize(board){
  const m = str(board.model) || "UNKNOWN BOARD";
  const canonKey = m.replace(/\s+/g, " ").toUpperCase().replace(/\bREV\.? ?\d+(\.\d+)?\b/g, "").trim();
  const revM = m.match(/\bREV\.? ?(\d+(?:\.\d+)?)\b/i);
  const dedupKey = (str(board.manufacturer) || "UNKNOWN") + "::" + canonKey;
  return { canonKey, revision: revM ? revM[1] : null, dedupKey };
}
function dedupe(boards){
  const seen = new Map(), out = [];
  for (const b of boards){ const d = normalize(b); const k = d.canonKey;
    if (seen.has(k)){ continue; } seen.set(k, true);
    out.push(Object.assign({ _norm: d }, b));
  }
  return out;
}

module.exports = { rateBoard, normalize, dedupe, tierOfScore, UNK };