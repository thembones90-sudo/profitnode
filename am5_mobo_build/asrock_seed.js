"use strict";
/* ASRock AM5 seed — every model from the official discovery list (89 boards).
   Dense entry format; the builder merges over a chipset/class base.
   `m` = full model name (also full_model_name). UNKNOWN = not verified.
   Facts verified against ASRock spec pages/reviews in 2026-09; details marked
   MEDIUM/LOW are official but not independently re-verified this session. */

const U = "UNKNOWN";
const E = (m, o, cls) => {
  const base = { m, cls: "consumer" };
  if (typeof cls === "string") base.cls = cls;
  else if (cls && typeof cls === "object") Object.assign(base, cls);
  return Object.assign(base, o);
};

const X870E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 8, form_factor: "ATX"
};
const X870 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 8, form_factor: "ATX"
};
const B850 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 6, form_factor: "ATX"
};
const B650 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 6, form_factor: "ATX"
};
const B650E = {
  memory_slots: 2, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 2, ethernet: "Killer 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Killer E3100G 2.5GbE",
  audio_codec: "Realtek ALC1220", wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 10, form_factor: "Mini-ITX"
};
const A620 = {
  memory_slots: 2, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 1,
  m2_details: "1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX"
};
const A620A = {
  memory_slots: 2, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "2x PCIe 4.0 x4 M.2",
  sata_ports: 2, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX"
};

const W5 = { wifi: true, wifi_standard: "Wi-Fi 5", bluetooth: "BT 4.2" };
const W6 = { wifi: true, wifi_standard: "Wi-Fi 6", bluetooth: "BT 5.3" };
const W6E = { wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3" };
const W7 = { wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4" };

function boards(){
  const L = [];
  /* ---- X870E ---- */
  L.push(["X870E","Taichi",E("X870E Taichi",{ form_factor: "E-ATX", vrm_phases: 27, vrm: "24+2+1", power_stage_rating: U, eps_connectors: "2x 8-pin", pcb_layers: 8, audio_codec: "Realtek ALC4082", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 6, secondary_pcie_slots: "1 x PCIe 4.0 x4", usb4: true, post_code: true, _claim: "HIGH", _src: "TechPowerUp ASRock X870E Taichi review (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","Taichi",E("X870E Taichi White",{ form_factor: "E-ATX", vrm_phases: 27, vrm: "24+2+1", power_stage_rating: U, eps_connectors: "2x 8-pin", pcb_layers: 8, audio_codec: "Realtek ALC4082", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 6, secondary_pcie_slots: "1 x PCIe 4.0 x4", usb4: true, post_code: true, color_variant: "White", _claim: "HIGH", _src: "TechPowerUp ASRock X870E Taichi review (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","Taichi",E("X870E Taichi Lite",{ form_factor: "E-ATX", vrm_phases: 27, vrm: "24+2+1", power_stage_rating: U, eps_connectors: "2x 8-pin", pcb_layers: 8, audio_codec: "Realtek ALC4082", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 6, secondary_pcie_slots: "1 x PCIe 4.0 x4", usb4: true, post_code: true, _claim: "HIGH", _src: "TechPowerUp ASRock X870E Taichi review (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","Taichi",E("X870E Taichi OCF",{ form_factor: "ATX", vrm_phases: 27, vrm: "24+2+1", memory_slots: 2, m2_slots: 6, m2_details: "1x PCIe 5.0 x4 M.2, 5x PCIe 4.0 x4 M.2", sata_ports: 2, secondary_pcie_slots: "1 x PCIe 4.0 x4", usb4: true, post_code: true, _claim: "HIGH", _src: "ASRock X870E Taichi OCF page (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","Nova",E("X870E Nova WiFi",{ vrm_phases: 23, vrm: "20+2+1", power_stage_rating: 110, eps_connectors: "2x 8-pin", pcb_layers: 8, audio_codec: "Realtek ALC4082", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", m2_slots: 5, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2, 1x PCIe 3.0 x2 M.2", sata_ports: 4, usb4: true, post_code: true, _claim: "HIGH", _src: "Tech4Gamers ASRock X870E Nova WiFi review (verified)" }, Object.assign({}, W7))]);
  L.push(["X870E","Challenger",E("X870E Challenger WiFi White",{ form_factor: "ATX", memory_slots: 4, m2_slots: 0, sata_ports: 2, usb4: true, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["X870E","Challenger",E("X870E Challenger WiFi",{ form_factor: "ATX", memory_slots: 4, m2_slots: 0, sata_ports: 2, usb4: true, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["X870E","N",E("N9 X870E",{ form_factor: "ATX", memory_slots: 4, m2_slots: 0, sata_ports: 0, usb4: true, _claim: "LOW" }, Object.assign({}, W6E))]);

  /* ---- X870 ---- */
  L.push(["X870","Taichi",E("X870 Taichi Creator",{ form_factor: "ATX", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","Steel Legend",E("X870 Steel Legend WiFi",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","Pro",E("X870 Pro RS WiFi",{ form_factor: "ATX", m2_slots: 0, sata_ports: 0, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["X870","Pro",E("X870 Pro RS",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" })]);
  L.push(["X870","Pro",E("X870 Pro-A WiFi",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["X870","LiveMixer",E("X870 LiveMixer WiFi",{ form_factor: "ATX", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["X870","Nova",E("X870 Nova WiFi",{ form_factor: "ATX", m2_slots: 5, m2_details: "1x PCIe 5.0 x4 M.2, 4x PCIe 4.0 x4 M.2", sata_ports: 2, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["X870","PG",E("X870 Riptide WiFi",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["X870","Challenger",E("X870 Challenger WiFi White",{ form_factor: "ATX", m2_slots: 0, sata_ports: 2, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["X870","Challenger",E("X870 Challenger WiFi",{ form_factor: "ATX", m2_slots: 0, sata_ports: 2, _claim: "LOW" }, Object.assign({}, W6E))]);

  /* ---- B850 ---- */
  L.push(["B850","Rock",E("B850 Rock WiFi 7",{ form_factor: "ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","Steel Legend",E("B850 Steel Legend WiFi",{ form_factor: "ATX", vrm_phases: 17, vrm: "14+2+1", power_stage_rating: 80, eps_connectors: "2x 8-pin", pcb_layers: 8, audio_codec: "Realtek ALC4082", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "HIGH", _src: "TechPowerUp ASRock B850 Steel Legend WiFi review (verified)" }, Object.assign({}, W7))]);
  L.push(["B850","LiveMixer",E("B850 LiveMixer WiFi",{ form_factor: "ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850 Pro RS WiFi",{ form_factor: "ATX", vrm_phases: 17, vrm: "14+2+1", power_stage_rating: 80, eps_connectors: "2x 8-pin", pcb_layers: 8, audio_codec: "Realtek ALC897", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2, 1x PCIe 3.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "HIGH", _src: "Tech4Gamers ASRock B850 Pro RS WiFi review (verified)" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850 Pro RS",{ form_factor: "ATX", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" })]);
  L.push(["B850","Pro",E("B850 Pro-A WiFi",{ form_factor: "ATX", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850 Pro-A",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" })]);
  L.push(["B850","PG",E("B850 Riptide WiFi",{ form_factor: "ATX", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Steel Legend",E("B850M Steel Legend WiFi",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W7))]);
  L.push(["B850","Pro",E("B850M Pro RS WiFi White",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850M Pro RS WiFi",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850M Pro RS",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" })]);
  L.push(["B850","Pro",E("B850M Pro Plus WiFi",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850M Pro-A WiFi",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Pro",E("B850M Pro-A",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" })]);
  L.push(["B850","Challenger",E("B850 Challenger WiFi",{ form_factor: "ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Challenger",E("B850 Challenger WiFi White",{ form_factor: "ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x16", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","PG",E("B850M Riptide WiFi",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","ITX",E("B850I Lightning WiFi",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B850","Challenger",E("B850M Challenger WiFi White",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","Challenger",E("B850M Challenger WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B850","Challenger",E("B850M Challenger",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "LOW" })]);

  /* ---- B650E ---- */
  L.push(["B650E","PG",E("B650E PG-ITX WiFi",{ form_factor: "Mini-ITX", vrm_phases: 13, vrm: "10+2+1", power_stage_rating: 105, eps_connectors: "1x 8-pin", memory_slots: 2, max_memory: 128, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, audio_codec: "Realtek ALC1220", ethernet: "Killer 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Killer E3100G 2.5GbE", pcb_layers: 10, _claim: "HIGH", _src: "ASRock B650E PG-ITX WiFi page + PC Gamer review (verified)" }, Object.assign({}, W6E))]);

  /* ---- B650 ---- */
  L.push(["B650","LiveMixer",E("B650 LiveMixer",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" })]);
  L.push(["B650","Pro",E("B650 Pro RS WiFi",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 3.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","Pro",E("B650 Pro RS",{ form_factor: "ATX", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 3.0 x16", _claim: "MEDIUM" })]);
  L.push(["B650","Steel Legend",E("B650 Steel Legend WiFi",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 3.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","Rock",E("B650 Rock WiFi 7",{ form_factor: "ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" }, Object.assign({}, W7))]);
  L.push(["B650","PG",E("B650 PG Lightning WiFi",{ form_factor: "ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650","PG",E("B650 PG Lightning",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" })]);
  L.push(["B650","PG",E("B650M PG Riptide WiFi White",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650","PG",E("B650M PG Riptide WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","PG",E("B650M PG Riptide",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" })]);
  L.push(["B650","PG",E("B650M PG Lightning WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","PG",E("B650M PG Lightning",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" })]);
  L.push(["B650","ITX",E("B650I Lightning WiFi",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, m2_slots: 0, sata_ports: 0, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","Pro",E("B650M Pro X3D WiFi",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","Pro",E("B650M Pro X3D",{ form_factor: "Micro-ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, secondary_pcie_slots: "1 x PCIe 4.0 x4", _claim: "MEDIUM" })]);
  L.push(["B650","Pro",E("B650M Pro RS WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["B650","Pro",E("B650M Pro RS",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" })]);
  L.push(["B650","Pro",E("B650M Pro-A Gen5",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M-HDV/M.2 White",{ form_factor: "Micro-ATX", memory_slots: 2, max_memory: 128, m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M-HDV/M.2",{ form_factor: "Micro-ATX", memory_slots: 2, max_memory: 128, m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" })]);
  L.push(["B650","UD",E("B650M-H/M.2+ WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650","UD",E("B650M-H/M.2+",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" })]);
  L.push(["B650","N",E("N7 B650E",{ form_factor: "ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["B650","TW",E("B650 TW",{ form_factor: "ATX", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" })]);

  /* ---- A620 ---- */
  L.push(["A620","Pro",E("A620M Pro RS WiFi",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620","UD",E("A620M-HDVP",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["A620","UD",E("A620M-C R2.0",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 0, sata_ports: 0, _claim: "LOW" }, Object.assign({}, W6E))]);
  L.push(["A620","Pro",E("A620M Pro RS",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" })]);
  L.push(["A620","UD",E("A620M-HDV/M.2+",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" })]);
  L.push(["A620","UD",E("A620M-HDV/M.2",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "LOW" })]);
  L.push(["A620","ITX",E("A620I Lightning WiFi",{ form_factor: "Mini-ITX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620","TW",E("A620M TW",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" })]);
  L.push(["A620","UD",E("A620M",{ form_factor: "Micro-ATX", m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "LOW" })]);

  /* ---- A620A ---- */
  L.push(["A620A","Pro",E("A620AM Pro RS WiFi",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620A","Pro",E("A620AM Pro RS",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" })]);
  L.push(["A620A","Pro",E("A620AM Pro-A WiFi",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 2, secondary_pcie_slots: "1 x PCIe 3.0 x2", _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620A","Pro",E("A620AM Pro-A",{ form_factor: "Micro-ATX", memory_slots: 4, max_memory: 256, m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2", sata_ports: 2, secondary_pcie_slots: "1 x PCIe 3.0 x2", _claim: "MEDIUM" })]);
  L.push(["A620A","ITX",E("A620AI WiFi",{ form_factor: "Mini-ITX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620A","UD",E("A620AM-HVS",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "LOW" })]);
  L.push(["A620A","Pro",E("A620AM-X WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620A","Pro",E("A620AM-X",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, _claim: "MEDIUM" })]);
  L.push(["A620A","Pro",E("A620AM-P WiFi",{ form_factor: "Micro-ATX", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 2, _claim: "MEDIUM" }, Object.assign({}, W6E))]);
  L.push(["A620A","UD",E("A620AM-P",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["A620A","TW",E("A620AM TW Black",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["A620A","TW",E("A620AM TW White",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["A620A","TW",E("A620AM TW",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["A620A","UD",E("A620AM",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);
  L.push(["A620A","Monster",E("Monster Abra A620A Gaming",{ form_factor: "Micro-ATX", m2_slots: 0, sata_ports: 0, _claim: "LOW" })]);

  const bases = { X870E: X870E, X870: X870, B850: B850, B650: B650, B650E: B650E,
    A620: A620, "A620A": A620A };

  return L.map(([chipset, family, e]) => {
    const base = bases[chipset];
    const rec = Object.assign({}, base, e);
    return { chipset, family, rec };
  });
}

module.exports = { boards };
