"use strict";
/* GIGABYTE AM5 seed — every verified model + submodel.
   Dense entry format; the builder merges over a chipset/class base.
   `m` = full model name (also full_model_name). UNKNOWN = not verified.
   Facts verified against GIGABYTE spec pages/manuals in 2026-09; details marked
   MEDIUM/LOW are official but not independently re-verified this session. */

const U = "UNKNOWN";
const E = (m, o, cls) => {
  const base = { m, cls: "consumer" };
  if (typeof cls === "string") base.cls = cls;
  else if (cls && typeof cls === "object") Object.assign(base, cls);
  return Object.assign(base, o);
};

const A620M = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX"
};
const B840 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const B850 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const B650 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const B650E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X670 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: "1 x PCIe 4.0 x4", m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X670E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 4.0 x4", m2_slots: 4,
  m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Intel 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Intel 2.5GbE",
  audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X870 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 4,
  m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X870E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 5.0 x4", m2_slots: 4,
  m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};

const W5 = { wifi: true, wifi_standard: "Wi-Fi 5", bluetooth: "BT 4.2" };
const W6 = { wifi: true, wifi_standard: "Wi-Fi 6", bluetooth: "BT 5.3" };
const W6E = { wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3" };
const W7 = { wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4" };

function boards(){
  const L = [];
  /* ---- A620 ---- */
  L.push(["A620","DS3H",E("A620M DS3H",{ memory_slots: 4, vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2", _claim: "HIGH", _src: "Gigabyte A620M DS3H rev 2.0 page (verified)" })]);
  L.push(["A620","UD",E("A620M H",{ memory_slots: 2, max_memory: 128, vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", _claim: "HIGH", _src: "Gigabyte A620M H page (verified)" })]);
  L.push(["A620","UD",E("A620M S2H",{ memory_slots: 2, max_memory: 128, vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["A620","UD",E("A620M C",{ memory_slots: 2, max_memory: 128, vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["A620","GAMING",E("A620M GAMING X",{ memory_slots: 4, vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "MEDIUM" })]);
  L.push(["A620","GAMING",E("A620M GAMING X AX",{ memory_slots: 4, vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620","UD",E("A620AM C",{ memory_slots: 2, max_memory: 128, vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["A620","ITX",E("A620I AX",{ memory_slots: 2, max_memory: 128, vrm_phases: 8, power_stage_rating: U, vrm: "5+2+1", form_factor: "Mini-ITX", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG", _claim: "MEDIUM" }, Object.assign({}, W6E))]);

  /* ---- B840 ---- */
  L.push(["B840","EAGLE",E("B840 EAGLE WIFI6E",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B840","GAMING",E("B840 GAMING X WIFI6E",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B840","AORUS",E("B840M AORUS ELITE WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B840","UD",E("B840M D2H",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "LOW" })]);
  L.push(["B840","UD",E("B840M D3HP",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "LOW" })]);
  L.push(["B840","UD",E("B840M D3HP WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B840","DS3H",E("B840M DS3H",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "MEDIUM" })]);
  L.push(["B840","DS3H",E("B840M DS3H WIFI6",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6))]);
  L.push(["B840","EAGLE",E("B840M EAGLE WIFI6",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6))]);
  L.push(["B840","FORCE",E("B840M FORCE WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B840","GAMING",E("B840M GAMING PLUS WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B840","GAMING",E("B840M GAMING X WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", eps_connectors: "1x 8-pin", max_memory_speed: "8200+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte B840M GAMING X WIFI6E page (verified)" }, Object.assign({}, W6E))]);
  L.push(["B840","UD",E("B840M H",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", _claim: "LOW" })]);

  /* ---- B650 (ATX) ---- */
  L.push(["B650","AORUS",E("B650 AORUS ELITE AX",{ vrm_phases: 17, power_stage_rating: 70, vrm: "14+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", pcb_layers: "8-Layer", max_memory_speed: "8000+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte B650 AORUS ELITE AX page (verified)" }, Object.assign({}, W6E))]);
  L.push(["B650","AORUS",E("B650 AORUS ELITE AX ICE",{ vrm_phases: 17, power_stage_rating: 70, vrm: "14+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", pcb_layers: "8-Layer", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","AORUS",E("B650 AORUS ELITE AX V2",{ vrm_phases: 17, power_stage_rating: 70, vrm: "14+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", pcb_layers: "8-Layer", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","AORUS",E("B650 AORUS ELITE",{ vrm_phases: 17, power_stage_rating: 70, vrm: "14+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", _claim: "MEDIUM" })]);
  L.push(["B650","AORUS",E("B650 AORUS ELITE V2",{ vrm_phases: 17, power_stage_rating: 70, vrm: "14+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", _claim: "MEDIUM" })]);
  L.push(["B650","AORUS",E("B650 AORUS PRO AX",{ vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","EAGLE",E("B650 EAGLE",{ vrm_phases: 16, power_stage_rating: U, vrm: "12+2+2", ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", m2_heatsinks: true, pcb_layers: "6-Layer", _claim: "MEDIUM" })]);
  L.push(["B650","EAGLE",E("B650 EAGLE AX",{ vrm_phases: 16, power_stage_rating: U, vrm: "12+2+2", ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", m2_heatsinks: true, pcb_layers: "6-Layer", _claim: "HIGH", _src: "Gigabyte B650 EAGLE AX page (verified)" }, Object.assign({}, W6E))]);
  L.push(["B650","GAMING",E("B650 GAMING X",{ vrm_phases: 12, power_stage_rating: U, vrm: "8+2+2", _claim: "MEDIUM" })]);
  L.push(["B650","GAMING",E("B650 GAMING X AX",{ vrm_phases: 12, power_stage_rating: U, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","GAMING",E("B650 GAMING X AX V2",{ vrm_phases: 12, power_stage_rating: U, vrm: "8+2+2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","UD",E("B650 UD AC",{ m2_slots: 3, vrm_phases: U, power_stage_rating: U, vrm: U, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", _claim: "MEDIUM" }, Object.assign({}, W5))]);
  L.push(["B650","UD",E("B650 UD AX",{ m2_slots: 3, vrm_phases: U, power_stage_rating: U, vrm: U, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", _claim: "MEDIUM" }, Object.assign({}, W6))]);
  L.push(["B650","AERO",E("B650 AERO G",{ vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);

  /* ---- B650M ---- */
  L.push(["B650","AORUS",E("B650M AORUS ELITE",{ m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "MEDIUM" })]);
  L.push(["B650","AORUS",E("B650M AORUS ELITE AX",{ m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "HIGH", _src: "Gigabyte B650M AORUS ELITE AX page + manual (verified)" }, Object.assign({}, W6E))]);
  L.push(["B650","AORUS",E("B650M AORUS ELITE AX ICE",{ m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","AORUS",E("B650M AORUS PRO AX",{ m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650","UD",E("B650M C",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M C V2",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M C V3",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M D2H",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M D2HP",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M D3HP",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", _claim: "MEDIUM" })]);
  L.push(["B650","UD",E("B650M D3HP AX",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","DS3H",E("B650M DS3H",{ memory_slots: 4, vrm_phases: 9, power_stage_rating: 60, vrm: "6+2+1", m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", _claim: "HIGH", _src: "Gigabyte B650M DS3H rev 1.x page (verified)" })]);
  L.push(["B650","GAMING",E("B650M GAMING PLUS WIFI",{ vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", _claim: "HIGH", _src: "Gigabyte B650M GAMING PLUS WIFI page (verified)" }, Object.assign({}, W6E))]);
  L.push(["B650","GAMING",E("B650M GAMING WIFI",{ vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W6))]);
  L.push(["B650","GAMING",E("B650M GAMING WIFI6E",{ vrm_phases: 9, power_stage_rating: U, vrm: "5+2+2", m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","GAMING",E("B650M GAMING X AX",{ m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650","UD",E("B650M H",{ memory_slots: 2, max_memory: 128, m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M K",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M S2H",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);

  /* ---- B650EM ---- */
  L.push(["B650","UD",E("B650EM C",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" })]);
  L.push(["B650","DS3H",E("B650EM DS3H WIFI6E",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","FORCE",E("B650EM FORCE WIFI6E",{ m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", vrm_phases: U, power_stage_rating: U, vrm: U, _claim: "LOW" }, Object.assign({}, W6E))]);

  /* ---- B650I ---- */
  L.push(["B650","AORUS",E("B650I AORUS ULTRA",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, vrm_phases: 11, power_stage_rating: 105, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "12-Layer", ethernet: "Intel 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Intel 2.5GbE", audio_codec: "Realtek ALC4080", _claim: "HIGH", _src: "Gigabyte B650I AORUS ULTRA page + manual (verified)" }, Object.assign({}, W6E))]);
  L.push(["B650","UD",E("B650I AX",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "LOW" }, Object.assign({}, W6E))]);

  /* ---- B650E ---- */
  L.push(["B650E","AORUS",E("B650E AORUS MASTER",{ vrm_phases: 20, power_stage_rating: 105, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "4x PCIe 5.0 x4 M.2", pcb_layers: "8-Layer", ethernet: "Intel 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Intel 2.5GbE", audio_codec: "Realtek ALC1220", _claim: "HIGH", _src: "Gigabyte B650E AORUS MASTER page (verified)" }, Object.assign({}, W6E))]);
  L.push(["B650E","AORUS",E("B650E AORUS PRO X USB4",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG", audio_codec: "Realtek ALC1220", usb4: true, max_memory_speed: "8000+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte B650E AORUS PRO X USB4 page (verified)" }, Object.assign({}, W7))]);
  L.push(["B650E","AORUS",E("B650E AORUS ELITE X AX ICE",{ vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650E","STEALTH",E("B650E AORUS STEALTH ICE",{ vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", _claim: "LOW", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W6E))]);
  L.push(["B650E","TACHYON",E("B650E AORUS TACHYON",{ memory_slots: 2, max_memory: 128, vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "8400+ MT/s (OC)", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650E","EAGLE",E("B650E EAGLE",{ vrm_phases: 16, power_stage_rating: U, vrm: "12+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", _claim: "MEDIUM" })]);
  L.push(["B650E","EAGLE",E("B650E EAGLE WIFI6E",{ vrm_phases: 16, power_stage_rating: U, vrm: "12+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", _claim: "LOW" }, Object.assign({}, W6E))]);

  /* ---- X670 ---- */
  L.push(["X670","AORUS",E("X670 AORUS ELITE AX",{ vrm_phases: 20, power_stage_rating: 70, vrm: "16+2+2", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcie_x16_slots: 1, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "HIGH", _src: "Gigabyte X670 AORUS ELITE AX page (verified)" }, Object.assign({}, W6E))]);
  L.push(["X670","GAMING",E("X670 GAMING X AX",{ vrm_phases: 18, power_stage_rating: U, vrm: "14+2+2", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcie_x16_slots: 1, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["X670","GAMING",E("X670 GAMING X AX V2",{ vrm_phases: 18, power_stage_rating: U, vrm: "14+2+2", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcie_x16_slots: 1, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);

  /* ---- X670E ---- */
  L.push(["X670E","AORUS",E("X670E AORUS MASTER",{ form_factor: "E-ATX", vrm_phases: 20, power_stage_rating: 105, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 6, pcb_layers: "8-Layer", ethernet: "Intel 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Intel 2.5GbE", audio_codec: "Realtek ALC1220", max_memory_speed: "8000+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte X670E AORUS MASTER page (verified)" }, Object.assign({}, W6E))]);
  L.push(["X670E","AORUS",E("X670E AORUS PRO X",{ vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", pcie_x16_slots: 2, secondary_pcie_slots: "1 x PCIe 4.0 x4", max_memory_speed: "8000+ MT/s (OC)", onboard_buttons: true, usb4: false, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["X670E","AORUS",E("X670E AORUS XTREME",{ form_factor: "E-ATX", vrm_phases: 22, power_stage_rating: 105, vrm: "18+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "4x PCIe 5.0 x4 M.2", pcb_layers: "8-Layer", ethernet: "Marvell 10GbE", ethernet_speed: "10G", ethernet_controller: "Marvell AQtion AQC113C", audio_codec: "Realtek ALC1220 + ESS DAC", usb4: false, _claim: "HIGH", _src: "Gigabyte X670E AORUS XTREME page (verified)" }, Object.assign({}, W6E))]);

  /* ---- X870 ---- */
  L.push(["X870","AORUS",E("X870 AORUS ELITE WIFI7",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", pcb_layers: "6-Layer", audio_codec: "Realtek ALC1220", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "HIGH", _src: "Gigabyte X870 AORUS ELITE WIFI7 rev 1.2 page (verified)" }, Object.assign({}, W7))]);
  L.push(["X870","AORUS",E("X870 AORUS ELITE WIFI7 ICE",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", pcb_layers: "6-Layer", audio_codec: "Realtek ALC1220", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","AORUS",E("X870 AORUS ELITE X3D",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", pcb_layers: "6-Layer", audio_codec: "Realtek ALC1220", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870","AORUS",E("X870 AORUS ELITE X3D ICE",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", pcb_layers: "6-Layer", audio_codec: "Realtek ALC1220", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870","INFINITY",E("X870 AORUS INFINITY",{ memory_slots: 2, max_memory: 128, vrm_phases: 22, power_stage_rating: 110, vrm: "18+2+2", eps_connectors: "2x 8-pin + 1x 8-pin PCIe", m2_slots: 3, m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "10-Layer", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126-CG", audio_codec: "Realtek ALC1220P", post_code: true, onboard_buttons: true, max_memory_speed: "8800+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte X870 AORUS INFINITY page + TechPowerUp review (verified)" }, Object.assign({}, W7))]);
  L.push(["X870","STEALTH",E("X870 AORUS STEALTH",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", m2_slots: 4, m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", max_memory_speed: "8200+ MT/s (OC)", _claim: "MEDIUM", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W7))]);
  L.push(["X870","STEALTH",E("X870 AORUS STEALTH ICE",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", m2_slots: 4, m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", max_memory_speed: "8200+ MT/s (OC)", _claim: "MEDIUM", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W7))]);
  L.push(["X870","TACHYON",E("X870 AORUS TACHYON ICE",{ memory_slots: 2, max_memory: 128, vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "8800+ MT/s (OC)", onboard_buttons: true, post_code: true, _claim: "LOW" }, Object.assign({}, W7))]);
  L.push(["X870","EAGLE",E("X870 EAGLE WIFI7",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","GAMING",E("X870 GAMING WIFI6",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", pcb_layers: "6-Layer", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W6))]);
  L.push(["X870","GAMING",E("X870 GAMING WIFI7",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W7))]);
  L.push(["X870","GAMING",E("X870 GAMING X WIFI7",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", eps_connectors: "1x 8-pin + 1x 4-pin", pcb_layers: "6-Layer", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","AORUS",E("X870I AORUS PRO ICE",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, vrm_phases: U, power_stage_rating: U, vrm: U, eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","AORUS",E("X870M AORUS ELITE WIFI7",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","AORUS",E("X870M AORUS ELITE WIFI7 ICE",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W7))]);

  /* ---- X870E ---- */
  L.push(["X870E","AORUS",E("X870E AORUS MASTER",{ vrm_phases: 20, power_stage_rating: 110, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC1220", max_memory_speed: "8600+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte X870E AORUS MASTER page (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS MASTER X3D",{ vrm_phases: 20, power_stage_rating: 110, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC1220", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS MASTER X3D ICE",{ vrm_phases: 20, power_stage_rating: 110, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC1220", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS ELITE WIFI7",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", audio_codec: "Realtek ALC1220", _claim: "HIGH", _src: "Gigabyte X870E AORUS ELITE WIFI7 page (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS ELITE WIFI7 ICE",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", audio_codec: "Realtek ALC1220", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS ELITE X3D",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC1220", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS ELITE X3D ICE",{ vrm_phases: 20, power_stage_rating: 60, vrm: "16+2+2", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC1220", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS PRO",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG", audio_codec: "Realtek ALC1220", _claim: "HIGH", _src: "Gigabyte X870E AORUS PRO rev 1.1 page (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS PRO ICE",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG", audio_codec: "Realtek ALC1220", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS PRO X3D",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC1220", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","AORUS",E("X870E AORUS PRO X3D ICE",{ vrm_phases: 20, power_stage_rating: 80, vrm: "16+2+2", m2_slots: 4, m2_details: "3x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC1220", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","AI TOP",E("X870E AORUS XTREME AI TOP",{ form_factor: "E-ATX", vrm_phases: 22, power_stage_rating: 110, vrm: "18+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcb_layers: "8-Layer", ethernet: "Dual Marvell 10GbE", ethernet_speed: "10G + 10G", ethernet_controller: "Marvell AQtion AQC113C + AQC113C", max_memory_speed: "8800+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte X870E AORUS XTREME AI TOP page (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","AI TOP",E("X870E AORUS XTREME X3D AI TOP",{ form_factor: "E-ATX", vrm_phases: 22, power_stage_rating: 110, vrm: "18+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcb_layers: "8-Layer", ethernet: "Dual Marvell 10GbE", ethernet_speed: "10G + 10G", ethernet_controller: "Marvell AQtion AQC113C + AQC113C", max_memory_speed: "8800+ MT/s (OC)", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["X870E","EAGLE",E("X870E EAGLE WIFI7",{ vrm_phases: 18, power_stage_rating: U, vrm: "14+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcb_layers: "8-Layer", pcie_x16_slots: 1, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870E","EAGLE",E("X870E EAGLE X3D WIFI7",{ vrm_phases: 18, power_stage_rating: U, vrm: "14+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", pcb_layers: "8-Layer", pcie_x16_slots: 1, secondary_pcie_slots: "1 x PCIe 4.0 x4", max_memory_speed: "9000+ MT/s (OC)", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode 2.0" }, Object.assign({}, W7))]);
  L.push(["X870E","AERO",E("X870E AERO X3D WOOD",{ vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", _claim: "LOW", rating_notes_extra: "AERO creator series; WOOD finish" }, Object.assign({}, W7))]);
  L.push(["X870E","AERO",E("X870E AERO X3D DARK WOOD",{ vrm_phases: 20, power_stage_rating: U, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", _claim: "LOW", rating_notes_extra: "AERO creator series; DARK-WOOD finish" }, Object.assign({}, W7))]);

  /* ---- B850 ---- */
  L.push(["B850","AI TOP",E("B850 AI TOP",{ primary_pcie_generation: 5, pcie_x16_slots: 2, secondary_pcie_slots: "1 x PCIe 4.0 x2", vrm_phases: 20, power_stage_rating: 110, vrm: "16+2+2", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "8-Layer", ethernet: "Dual Marvell 10GbE", ethernet_speed: "10G + 10G", ethernet_controller: "Marvell AQtion AQC113C + AQC113C", audio_codec: "Realtek ALC1220", usb4: true, max_memory_speed: "8600+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte B850 AI TOP page + manual (verified)" }, Object.assign({}, W7))]);
  L.push(["B850","AORUS",E("B850 AORUS ELITE P ICE",{ vrm_phases: 18, power_stage_rating: 60, vrm: "14+2+2", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","AORUS",E("B850 AORUS ELITE WIFI7",{ vrm_phases: 18, power_stage_rating: 60, vrm: "14+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC1220", max_memory_speed: "8200+ MT/s (OC)", _claim: "HIGH", _src: "Gigabyte B850 AORUS ELITE WIFI7 page (verified)" }, Object.assign({}, W7))]);
  L.push(["B850","AORUS",E("B850 AORUS ELITE WIFI7 ICE",{ vrm_phases: 18, power_stage_rating: 60, vrm: "14+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC1220", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","AORUS",E("B850 AORUS ELITE X3D",{ vrm_phases: 18, power_stage_rating: 60, vrm: "14+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM", rating_notes_extra: "X3D Turbo mode" }, Object.assign({}, W7))]);
  L.push(["B850","STEALTH",E("B850 AORUS STEALTH",{ vrm_phases: 18, power_stage_rating: 60, vrm: "14+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W7))]);
  L.push(["B850","STEALTH",E("B850 AORUS STEALTH ICE",{ vrm_phases: 18, power_stage_rating: 60, vrm: "14+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W7))]);
  L.push(["B850","EAGLE",E("B850 EAGLE ICE",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "MEDIUM" })]);
  L.push(["B850","EAGLE",E("B850 EAGLE WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek GbE LAN", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","EAGLE",E("B850 EAGLE WIFI7 ICE",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2", eps_connectors: "1x 8-pin + 1x 4-pin", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","GAMING",E("B850 GAMING WIFI6",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6))]);
  L.push(["B850","GAMING",E("B850 GAMING X WIFI6E",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","AORUS",E("B850I AORUS PRO",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, vrm_phases: U, power_stage_rating: U, vrm: U, eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","AORUS",E("B850M AORUS ELITE",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" })]);
  L.push(["B850","AORUS",E("B850M AORUS ELITE WIFI6E",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","AORUS",E("B850M AORUS ELITE WIFI6E ICE",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","AORUS",E("B850M AORUS ELITE WIFI7 ICE P",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W7))]);
  L.push(["B850","AORUS",E("B850M AORUS PRO WIFI7",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W7))]);
  L.push(["B850","STEALTH",E("B850M AORUS STEALTH",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W7))]);
  L.push(["B850","STEALTH",E("B850M AORUS STEALTH ICE",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW", rating_notes_extra: "STEALTH back-connect" }, Object.assign({}, W7))]);
  L.push(["B850","UD",E("B850M C",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" })]);
  L.push(["B850","UD",E("B850M D3HP",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" })]);
  L.push(["B850","DS3H",E("B850M DS3H",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" })]);
  L.push(["B850","DS3H",E("B850M DS3H ICE",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" })]);
  L.push(["B850","EAGLE",E("B850M EAGLE WIFI6E",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "6-Layer", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","EAGLE",E("B850M EAGLE WIFI6E ICE",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","EAGLE",E("B850M EAGLE WIFI7",{ vrm_phases: 12, power_stage_rating: 60, vrm: "8+2+2", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","FORCE",E("B850M FORCE",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" })]);
  L.push(["B850","FORCE",E("B850M FORCE V2",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" })]);
  L.push(["B850","FORCE",E("B850M FORCE WIFI6E",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","FORCE",E("B850M FORCE WIFI6E V2",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","GAMING",E("B850M GAMING X WIFI6E",{ vrm_phases: U, power_stage_rating: U, vrm: U, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", _claim: "LOW" }, Object.assign({}, W6E))]);

  const bases = { A620: A620M, B840: B840, B850: B850, B650: B650, B650E: B650E,
    X670: X670, X670E: X670E, X870: X870, X870E: X870E };

  return L.map(([chipset, family, e]) => {
    const base = bases[chipset];
    const rec = Object.assign({}, base, e);
    return { chipset, family, rec };
  });
}

module.exports = { boards };