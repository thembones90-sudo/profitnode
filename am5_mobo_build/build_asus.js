"use strict";
/* PROFITNODE ASUS AM5 build pipeline.
   Loads seed -> assembles full records (UNKNOWN defaults) -> dedupes ->
   rates with PN_AM5_MOBO_V2 -> merges into production board catalog
   (replaces the 9 legacy ASUS AM5 rows) -> writes standalone registry.
   Prints completeness / rating / outlier audits. */

const fs = require("fs");
const path = require("path");
const { boards } = require("./asus_seed.js");
const { rateBoard, dedupe, UNK } = require("./pn_am5_mobo_v2.js");

const ROOT = path.join(__dirname, "..");
const CAT = path.join(ROOT, "profitnode_motherboard_catalog_v1.json");
const REG = path.join(ROOT, "profitnode_am5_motherboard_registry_asus_v1.json");
const TODAY = "2026-09-10";

const REQUIRED = [
  "id","manufacturer","family","model","full_model_name","manufacturer_part_number","socket","chipset",
  "form_factor","canonical_model","revision","revisions","color_variant","region","availability_status",
  "memory_type","memory_slots","max_memory","max_memory_speed","primary_pcie_generation","primary_pcie_lanes",
  "pcie_x16_slots","secondary_pcie_slots","lane_sharing","m2_slots","m2_details","sata_ports","wifi",
  "wifi_standard","bluetooth","ethernet","ethernet_speed","ethernet_controller","audio_codec","usb4",
  "rear_usb","rear_usb_c","front_usb_c_header","vrm","vrm_phases","power_stage_rating","eps_connectors",
  "bios_flashback","clear_cmos","debug_led","post_code","onboard_buttons","pcb_layers","vrm_heatsink",
  "m2_heatsinks","source_url","secondary_source_url","last_verified","pn_score","pn_tier","rating_method",
  "rating_notes","rating_confidence"
];

function pnNorm(s){ return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function ff(x){ const t = String(x || "").trim().toUpperCase();
  if (/E-ATX|EATX/.test(t)) return "E-ATX"; if (/MINI-ITX|ITX/.test(t)) return "Mini-ITX";
  if (/MICRO-ATX|MATX/.test(t)) return "Micro-ATX"; if (/ATX/.test(t)) return "ATX"; return UNK; }

function featuresString(r){
  const s = r; const out = [];
  if (s.usb4) out.push("USB4"); if (/WIFI\s*7/i.test(s.wifi_standard || "")) out.push("Wi-Fi 7");
  else if (/WIFI\s*6E/i.test(s.wifi_standard || "")) out.push("Wi-Fi 6E");
  else if (s.wifi) out.push("Onboard Wi-Fi"); else if (s.wifi === false) out.push("No onboard Wi-Fi");
  if (/10G/i.test(s.ethernet_speed || "10G")) out.push("10G LAN"); else if (/5G/i.test(s.ethernet_speed || "")) out.push("5G LAN");
  if (/PCIE 5/i.test(s.m2_details || "")) out.push("Gen5 M.2"); if (s.bios_flashback) out.push("BIOS FlashBack");
  if (s.post_code) out.push("POST code"); if (s.pcie_x16_slots >= 2) out.push(s.pcie_x16_slots + "x PCIe x16");
  if (/BTF/.test(r.full_model_name || "")) out.push("BTF back-connect"); if (/WIFI-CSM|M-CSM|K-CSM|R-CSM/.test(r.model || "")) out.push("CSM commercial");
  return out.join(" · ") || UNK;
}
function notesOf(r, res){
  const parts = [];
  if (res.penalties.length) parts.push(res.penalties.join("; "));
  if (res.confidence !== "HIGH") parts.push("Limited verified data at time of rating.");
  if (res.confidence === "LOW") parts.push("Values marked UNKNOWN are reference-fallback, not verified.");
  parts.push("AMD " + r.chipset + " platform, " + r.form_factor + ". Capability-based PN_AM5_MOBO_V2 rating; price and value excluded.");
  if (!parts.length) parts.push("Spec sheet verified.");
  return parts.join(" ");
}

const raw = boards();
const assembled = raw.map(({ chipset, family, rec }) => {
  const m = rec.m;
  const canon = m.replace(/\s+REV\.?\s*\d+(\.\d+)?\b/i, "").trim();
  const revM = m.match(/\sREV\.?\s*(\d+(?:\.\d+)?)\s*$/i);
  const recBase = Object.assign({}, rec);
  delete recBase.m;
  const record = {
    id: "asus-" + pnNorm(m).replace(/ /g, "-"),
    manufacturer: "ASUS", brand: "ASUS", family, model: m, full_model_name: "ASUS " + m,
    manufacturer_part_number: UNK, socket: "AM5", chipset, form_factor: ff(recBase.form_factor || UNK),
    canonical_model: canon, revision: null, revisions: [], color_variant: null,
    region: "global", availability_status: "RELEASED",
    memory_type: "DDR5", memory_slots: recBase.memory_slots || UNK, max_memory: recBase.max_memory || UNK, max_memory_speed: UNK,
    primary_pcie_generation: recBase.primary_pcie_generation, primary_pcie_lanes: recBase.primary_pcie_lanes,
    pcie_x16_slots: recBase.pcie_x16_slots, secondary_pcie_slots: recBase.secondary_pcie_slots || UNK,
    lane_sharing: recBase.lane_sharing || UNK, m2_slots: recBase.m2_slots, m2_details: recBase.m2_details || UNK,
    sata_ports: recBase.sata_ports, wifi: recBase.wifi, wifi_standard: recBase.wifi_standard || UNK,
    bluetooth: recBase.bluetooth || UNK, ethernet: recBase.ethernet || UNK, ethernet_speed: recBase.ethernet_speed || UNK,
    ethernet_controller: recBase.ethernet_controller || UNK, audio_codec: recBase.audio_codec || UNK,
    usb4: recBase.usb4, rear_usb: UNK, rear_usb_c: UNK, front_usb_c_header: UNK,
    vrm: recBase.vrm || UNK, vrm_phases: recBase.vrm_phases || UNK, power_stage_rating: recBase.power_stage_rating || UNK,
    eps_connectors: recBase.eps_connectors || UNK, bios_flashback: recBase.bios_flashback,
    clear_cmos: recBase.clear_cmos, debug_led: recBase.debug_led, post_code: recBase.post_code,
    onboard_buttons: recBase.onboard_buttons, pcb_layers: recBase.pcb_layers || UNK,
    vrm_heatsink: recBase.vrm_heatsink, m2_heatsinks: recBase.m2_heatsinks,
    source_url: "https://www.asus.com/search/?searchKey=" + encodeURIComponent(m),
    secondary_source_url: recBase._src || null, last_verified: TODAY,
    rating_method: "PN_AM5_MOBO_V2"
  };
  if (recBase._claim) record._claim = recBase._claim;
  if (recBase._featOverride !== undefined) record._featOverride = recBase._featOverride;
  if (recBase.rating_notes_extra) record.rating_notes_extra = recBase.rating_notes_extra;
  return record;
});

const deduped = dedupe(assembled);

const rated = deduped.map(b => {
  const res = rateBoard(b);
  b.pn_score = res.pn_score; b.pn_tier = res.pn_tier;
  b.rating_confidence = res.confidence;
  b.rating_notes = notesOf(b, res);
  b.overall = res.pn_score;
  b.vrm_power = res.subs.vrm;
  b.upgrade_headroom = Math.round(0.5 * res.subs.storage + 0.5 * res.subs.expansion);
  b.features = featuresString(b);
  b.confidence = res.confidence;
  b.vrm = b.vrm || UNK;
  delete b._claim; delete b._featOverride; delete b.rating_notes_extra;
  return b;
});

/* ---- validation ---- */
function validate(list){
  const NULLABLE = new Set(["revision", "color_variant", "secondary_source_url"]);
  const missing = {}, nullCount = {};
  list.forEach(b => { REQUIRED.forEach(k => {
    if (b[k] === undefined) (missing[k] = missing[k] || []).push(b.model);
    if (b[k] === null && !NULLABLE.has(k)) (nullCount[k] = nullCount[k] || []).push(b.model);
  }); });
  const unrated = list.filter(b => b.pn_score === undefined || b.pn_score === null || !b.pn_tier ||
    b.rating_method !== "PN_AM5_MOBO_V2");
  const dupeMap = new Map();
  list.forEach(b => { const k = pnNorm((b.brand || "") + " " + b.model); dupeMap.set(k, (dupeMap.get(k) || 0) + 1); });
  const dupes = [...dupeMap.entries()].filter(([k, n]) => n > 1);
  return { missing, unrated, dupes, nullCount };
}

const val = validate(rated);
const missingCount = Object.keys(val.missing).reduce((a, k) => a + val.missing[k].length, 0);
const nullCount = Object.keys(val.nullCount).reduce((a, k) => a + val.nullCount[k].length, 0);
console.log("== ASUS AM5 build ==");
console.log("seed boards      :", raw.length);
console.log("deduped active   :", rated.length);
console.log("missing metadata :", missingCount, missingCount ? JSON.stringify(val.missing) : "");
console.log("null (nullable)  :", nullCount, nullCount ? JSON.stringify(val.nullCount) : "");
console.log("active unrated   :", val.unrated.length);
console.log("duplicates       :", val.dupes.length, val.dupes.length ? JSON.stringify(val.dupes) : "");

const byChipset = {}, byFamily = {}, byTier = {}, byConf = {}, byFF = {};
rated.forEach(b => {
  byChipset[b.chipset] = (byChipset[b.chipset] || 0) + 1;
  byFamily[b.family] = (byFamily[b.family] || 0) + 1;
  byTier[b.pn_tier] = (byTier[b.pn_tier] || 0) + 1;
  byConf[b.rating_confidence] = (byConf[b.rating_confidence] || 0) + 1;
  byFF[b.form_factor] = (byFF[b.form_factor] || 0) + 1;
});
console.log("\nchipset   :", JSON.stringify(byChipset));
console.log("family    :", JSON.stringify(byFamily, null, 1));
console.log("tiers     :", JSON.stringify(byTier));
console.log("confidence:", JSON.stringify(byConf));
console.log("form      :", JSON.stringify(byFF));

/* ---- rating audit ---- */
const scores = rated.map(b => b.pn_score).sort((a, b) => a - b);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
console.log("\nscore min/median/max/avg:", scores[0], " /", scores[Math.floor(scores.length / 2)], " /", scores[scores.length - 1], " /", avg.toFixed(1));
console.log("\n== outliers (pn_score vs class floor) ==");
const FLOOR = { A620: 30, A620A: 30, B650: 40, B650E: 45, X670: 45, X670E: 55, B840: 35, B850: 50, X870: 55, X870E: 60, "PRO 665": 50, "PRO 600": 50 };
rated.filter(b => b.pn_score < FLOOR[b.chipset] || (b.rating_confidence === "HIGH" && b.pn_score > FLOOR[b.chipset] + 35))
  .map(b => "  " + b.chipset + " " + b.pn_score + " " + b.model + " [" + b.rating_confidence + "]").forEach(l => console.log(l));

/* ---- write standalone registry ---- */
fs.writeFileSync(REG, JSON.stringify({ scope: "ASUS AM5 (phase 1 of AM5 Motherboard Foundation v2)", generated: TODAY, rating_method: "PN_AM5_MOBO_V2", count: rated.length, boards: rated }, null, 2));

/* ---- merge into production catalog ---- */
const cat = JSON.parse(fs.readFileSync(CAT, "utf8"));
const before = cat.boards.length;
const oldAm5Asus = cat.boards.filter(b => /^(b650[m]?|a620|b840|b850|x670|x870|x?87|am5)$/i.test(String(b.model || "").toUpperCase()));
cat.boards = cat.boards.filter(b => !(String(b.socket || "") === "AM5" && String(b.brand || "").toLowerCase() === "asus"));
const dropped = before - cat.boards.length;
cat.boards.push(...rated);
fs.writeFileSync(CAT, JSON.stringify(cat, null, 2));
console.log("\nproduction catalog:", before, "->", cat.boards.length, "( dropped", dropped, "legacy ASUS AM5 rows )");
console.log("registry written  :", REG, "(", rated.length, "boards )");