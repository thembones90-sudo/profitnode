"use strict";
/* MSI AM5 seed — every verified model + submodel.
   Dense entry format; the builder merges over a chipset/class base.
   `m` = full model name (also full_model_name). UNKNOWN = not verified.
   Facts verified against MSI spec pages/manuals in 2026-09; details marked
   MEDIUM are official but not independently re-verified this session. */

const U = "UNKNOWN";
const E = (m, o, cls) => Object.assign({ m, cls: cls || "consumer" }, o);

const A620M = {
  memory_slots: 2, max_memory: 96, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: "Realtek ALC897", wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "mATX"
};
const B840 = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: "1 x PCIe 3.0 x2", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC897", wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const B850 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: "1 x PCIe 4.0 x4, 1 x PCIe 3.0 x1", m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC897", wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const B650 = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC897", wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const B650E = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X670 = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: U, m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X670E = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: U, m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X870 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: "1 x PCIe 4.0 x4, 1 x PCIe 3.0 x1", m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};
const X870E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 5.0 x4", m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX"
};

function boards(){
  const L = [];
  /* ---- A620 ---- */
  L.push(["A620","PRO",E("PRO A620M-B",{ memory_slots: 2, max_memory: 96, m2_slots: 1, sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", m2_heatsinks: false, _claim: "MEDIUM", _src: "MSI A620 series page" })]);
  L.push(["A620","PRO",E("PRO A620M-C",{ memory_slots: 2, max_memory: 96, m2_slots: 1, sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", m2_heatsinks: false, _claim: "LOW" })]);

  /* ---- B840 ---- */
  L.push(["B840","PRO",E("PRO B840-P WIFI",{ form_factor: "ATX", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", audio_codec: U, _claim: "MEDIUM", _src: "MSI B840 series page" })]);
  L.push(["B840","PRO",E("PRO B840M-P WIFI",{ m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", audio_codec: U, _claim: "MEDIUM" })]);
  L.push(["B840","GAMING",E("B840 GAMING PLUS WIFI",{ form_factor: "ATX", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", _claim: "MEDIUM" })]);

  /* ---- B850 ---- */
  L.push(["B850","MPG",E("MPG B850 EDGE TI WIFI",{ vrm_phases: 14, power_stage_rating: U, vrm: "14+2+1", eps_connectors: "2x 8-pin + 1x 6-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, clear_cmos: true, _claim: "HIGH", _src: "MSI MPG B850 EDGE TI WIFI manual (verified)" })]);
  L.push(["B850","MAG",E("MAG B850 TOMAHAWK WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, clear_cmos: false, _claim: "MEDIUM" })]);
  L.push(["B850","MAG",E("MAG B850 TOMAHAWK MAX WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, clear_cmos: false, _claim: "MEDIUM" })]);
  L.push(["B850","MAG",E("MAG B850M MORTAR WIFI",{ vrm_phases: 12, power_stage_rating: 80, vrm: "12+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: false, clear_cmos: false, _claim: "MEDIUM" })]);
  L.push(["B850","MAG",E("MAG B850M MORTAR MAX WIFI",{ vrm_phases: 12, power_stage_rating: 80, vrm: "12+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: false, clear_cmos: false, _claim: "MEDIUM" })]);
  L.push(["B850","PRO",E("PRO B850-P WIFI",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: U, vrm: "12+2+1", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B850","PRO",E("PRO B850M-A WIFI",{ vrm_phases: 10, power_stage_rating: 60, vrm: "10+2+1", pcie_x16_slots: 2, secondary_pcie_slots: "1 x PCIe 4.0 x4, 1 x PCIe 3.0 x1", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "8200+ MT/s (OC)", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, clear_cmos: true, debug_led: true, _claim: "MEDIUM", _src: "MSI PRO B850M-A WIFI page (verified)" })]);
  L.push(["B850","GAMING",E("B850 GAMING PLUS WIFI",{ form_factor: "ATX", vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, _claim: "MEDIUM" })]);
  L.push(["B850","MAG",E("MAG B850 GUNGNIR WIFI",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, _claim: "LOW" })]);
  L.push(["B850","MAG",E("MAG B850 GUNGNIR MAX WIFI",{ form_factor: "ATX", vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, _claim: "LOW" })]);
  L.push(["B850","MAG",E("MAG B850 PROJECT ZERO",{ form_factor: "ATX", vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, bios_flashback: true, _claim: "LOW", rating_notes_extra: "BTF PROJECT ZERO back-connect" })]);
  L.push(["B850","MAG",E("MAG B850M PROJECT ZERO",{ vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: false, _claim: "LOW", rating_notes_extra: "BTF PROJECT ZERO back-connect" })]);

  /* ---- B650 ---- */
  L.push(["B650","MAG",E("MAG B650 TOMAHAWK WIFI",{ vrm_phases: 16, power_stage_rating: 80, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: true, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["B650","MAG",E("MAG B650 TOMAHAWK MAX WIFI",{ vrm_phases: 16, power_stage_rating: 80, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: true, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["B650","MPG",E("MPG B650 CARBON WIFI",{ form_factor: "ATX", vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: true, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["B650","MAG",E("MAG B650M MORTAR WIFI",{ vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: false, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["B650","MAG",E("MAG B650M MORTAR MAX WIFI",{ vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, debug_led: true, _claim: "LOW" })]);
  L.push(["B650","MAG",E("MAG B650M MORTAR WIFI ICE",{ vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, debug_led: true, _claim: "LOW" })]);
  L.push(["B650","PRO",E("PRO B650-P",{ form_factor: "ATX", vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","PRO",E("PRO B650-P WIFI",{ form_factor: "ATX", vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","PRO",E("PRO B650M-P WIFI",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","PRO",E("PRO B650M-A",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","PRO",E("PRO B650M-A WIFI",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","PRO",E("PRO B650M-B",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "LOW" })]);
  L.push(["B650","PRO",E("PRO B650M-G",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "LOW" })]);
  L.push(["B650","PRO",E("PRO B650M-C",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "LOW" })]);
  L.push(["B650","MAG",E("MAG B650M BAZOOKA",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","MAG",E("MAG B650M BAZOOKA PLUS",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","MAG",E("MAG B650M BAZOOKA WIFI",{ vrm_phases: 8, power_stage_rating: U, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","GAMING",E("B650 GAMING PLUS",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM" })]);
  L.push(["B650","GAMING",E("B650 GAMING PLUS WIFI",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", audio_codec: "Realtek ALC897", usb4: false, _claim: "MEDIUM", _src: "MSI B650 GAMING PLUS WIFI page" })]);
  L.push(["B650","MPG",E("MPG B650I EDGE WIFI",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, vrm_phases: 8, power_stage_rating: 80, vrm: "8+2+1", eps_connectors: "2x 8-pin", m2_slots: 2, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, debug_led: true, _claim: "MEDIUM" })]);

  /* ---- B650E ---- */
  L.push(["B650E","MPG",E("MPG B650E CARBON WIFI",{ form_factor: "ATX", vrm_phases: 16, power_stage_rating: 90, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: true, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["B650E","MAG",E("MAG B650E TOMAHAWK WIFI",{ form_factor: "ATX", vrm_phases: 16, power_stage_rating: 80, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: true, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["B650E","MAG",E("MAG B650E TOMAHAWK MAX WIFI",{ form_factor: "ATX", vrm_phases: 16, power_stage_rating: 80, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2", usb4: false, bios_flashback: true, debug_led: true, _claim: "LOW" })]);

  /* ---- X670 ---- */
  L.push(["X670","MPG",E("MPG X670 CARBON WIFI",{ form_factor: "ATX", vrm_phases: 18, power_stage_rating: 80, vrm: "18+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: false, bios_flashback: true, clear_cmos: true, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["X670","MAG",E("MAG X670 TOMAHAWK WIFI",{ form_factor: "ATX", vrm_phases: 16, power_stage_rating: 80, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: false, bios_flashback: true, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["X670","PRO",E("PRO X670-P",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, bios_flashback: true, _claim: "MEDIUM" })]);
  L.push(["X670","PRO",E("PRO X670-P WIFI",{ form_factor: "ATX", vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", audio_codec: "Realtek ALC897", usb4: false, bios_flashback: true, _claim: "MEDIUM" })]);
  L.push(["X670","PRO",E("PRO X670M-B",{ vrm_phases: 8, power_stage_rating: 60, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 3, m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", wifi: false, wifi_standard: U, bluetooth: U, audio_codec: "Realtek ALC897", usb4: false, _claim: "LOW" })]);

  /* ---- X670E ---- */
  L.push(["X670E","MEG",E("MEG X670E GODLIKE",{ form_factor: "E-ATX", vrm_phases: 24, power_stage_rating: 105, vrm: "24+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: true, onboard_buttons: true, _claim: "MEDIUM" })]);
  L.push(["X670E","MEG",E("MEG X670E ACE",{ form_factor: "E-ATX", vrm_phases: 24, power_stage_rating: 105, vrm: "24+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: true, onboard_buttons: true, _claim: "MEDIUM" })]);
  L.push(["X670E","MPG",E("MPG X670E CARBON WIFI",{ form_factor: "ATX", vrm_phases: 18, power_stage_rating: 90, vrm: "18+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["X670E","MAG",E("MAG X670E TOMAHAWK WIFI",{ form_factor: "ATX", vrm_phases: 16, power_stage_rating: 80, vrm: "16+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "7800+ MT/s (OC)", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.3", usb4: true, bios_flashback: true, clear_cmos: false, debug_led: true, _claim: "MEDIUM" })]);

  /* ---- X870 ---- */
  L.push(["X870","MAG",E("MAG X870 TOMAHAWK WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126-CG", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: false, post_code: false, _claim: "HIGH", _src: "MSI MAG X870 TOMAHAWK WIFI manual (verified)" })]);
  L.push(["X870","MPG",E("MPG X870I EDGE TI EVO WIFI",{ form_factor: "Mini-ITX", memory_slots: 2, max_memory: 128, vrm_phases: 8, power_stage_rating: 110, vrm: "8+2+1", eps_connectors: "1x 8-pin", m2_slots: 2, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", pcb_layers: "12-Layer", max_memory_speed: "10000+ MT/s (OC)", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: true, _claim: "MEDIUM" })]);
  L.push(["X870","GAMING",E("X870 GAMING PLUS WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, _claim: "MEDIUM" })]);

  /* ---- X870E ---- */
  L.push(["X870E","MEG",E("MEG X870E GODLIKE",{ form_factor: "E-ATX", vrm_phases: 24, power_stage_rating: 110, vrm: "24+2+1", eps_connectors: "2x 8-pin", m2_slots: 7, m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 5.0 x4 M.2 via XPANDER-Z SLIDER GEN5 card, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Marvell 10GbE + Realtek 5GbE", ethernet_speed: "10G + 5G", ethernet_controller: "Marvell AQtion AQC113CS + Realtek RTL8126", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: true, onboard_buttons: true, pcb_layers: "8-Layer", _featOverride: 78, _claim: "HIGH", _src: "MSI MEG X870E GODLIKE page + manual (verified)" })]);
  L.push(["X870E","MEG",E("MEG X870E ACE MAX",{ vrm_phases: 18, power_stage_rating: 110, vrm: "18+2+1", eps_connectors: "2x 8-pin", m2_slots: 5, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "8400+ MT/s (OC)", ethernet: "Marvell 10GbE + Realtek 5GbE", ethernet_speed: "10G + 5G", ethernet_controller: "Marvell AQtion AQC113CS + Realtek RTL8126", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, lane_sharing: "M.2_1 & PCI_E3 share bandwidth; M.2_2 & USB 40Gbps Type-C share bandwidth", bios_flashback: true, clear_cmos: true, debug_led: true, onboard_buttons: true, pcb_layers: "8-Layer", _featOverride: 66, _claim: "HIGH", _src: "MSI MEG X870E ACE MAX page + manual (verified)" })]);
  L.push(["X870E","MAG",E("MAG X870E TOMAHAWK MAX WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, clear_cmos: true, _claim: "MEDIUM" })]);
  L.push(["X870E","MAG",E("MAG X870E TOMAHAWK PZ WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, _claim: "LOW", rating_notes_extra: "PROJECT ZERO back-connect" })]);
  L.push(["X870E","GAMING",E("X870E GAMING PLUS WIFI",{ vrm_phases: 14, power_stage_rating: 80, vrm: "14+2+1", eps_connectors: "2x 8-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, _claim: "MEDIUM" })]);
  L.push(["X870E","GAMING",E("X870E GAMING PLUS MAX WIFI",{ vrm_phases: 14, power_stage_rating: 60, vrm: "14+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, _claim: "MEDIUM" })]);
  L.push(["X870E","GAMING",E("X870E GAMING MAX WIFI",{ vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, _claim: "MEDIUM" })]);
  L.push(["X870E","PRO",E("PRO X870E-S EVO WIFI",{ vrm_phases: 12, power_stage_rating: 60, vrm: "12+2+1", eps_connectors: "1x 8-pin + 1x 4-pin", m2_slots: 3, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", audio_codec: "Realtek ALC897", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, _claim: "MEDIUM" })]);
  L.push(["X870E","MPG",E("MPG X870E EDGE TI WIFI",{ vrm_phases: 14, power_stage_rating: U, vrm: "14+2+1", eps_connectors: "2x 8-pin + 1x 6-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, clear_cmos: true, _claim: "MEDIUM" })]);
  L.push(["X870E","MPG",E("MPG X870E CARBON WIFI",{ vrm_phases: 18, power_stage_rating: 110, vrm: "18+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "8400+ MT/s (OC)", ethernet: "Realtek 5GbE + Realtek 2.5GbE", ethernet_speed: "5G + 2.5G", ethernet_controller: "Realtek RTL8126 + Realtek RTL8125", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, lane_sharing: "PCI_E1 & PCI_E2 & M.2_2 share bandwidth", bios_flashback: true, clear_cmos: true, debug_led: true, pcb_layers: "8-Layer", _claim: "HIGH", _src: "MSI MPG X870E CARBON WIFI page (verified)" })]);
  L.push(["X870E","MPG",E("MPG X870E CARBON MAX WIFI",{ vrm_phases: 18, power_stage_rating: 110, vrm: "18+2+1", eps_connectors: "2x 8-pin", m2_slots: 4, m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2", max_memory_speed: "8400+ MT/s (OC)", ethernet: "Realtek 5GbE + Realtek 2.5GbE", ethernet_speed: "5G + 2.5G", ethernet_controller: "Realtek RTL8126 + Realtek RTL8125", audio_codec: U, wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, lane_sharing: "PCI_E1 & PCI_E2 & M.2_2 share bandwidth", bios_flashback: true, clear_cmos: true, debug_led: true, pcb_layers: "8-Layer", _claim: "MEDIUM" })]);
  L.push(["X870E","MEG",E("MEG X870E GODLIKE X EDITION",{ form_factor: "E-ATX", vrm_phases: 24, power_stage_rating: 110, vrm: "24+2+1", eps_connectors: "2x 8-pin", m2_slots: 7, m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 5.0 x4 M.2 via XPANDER-Z SLIDER GEN5 card, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2, 1x PCIe 4.0 x4 M.2", ethernet: "Marvell 10GbE + Realtek 5GbE", ethernet_speed: "10G + 5G", ethernet_controller: "Marvell AQtion AQC113CS + Realtek RTL8126", audio_codec: "Realtek ALC4080", wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4", usb4: true, bios_flashback: true, clear_cmos: true, debug_led: true, onboard_buttons: true, _featOverride: 78, _claim: "LOW", _src: "X EDITION limited; specs mirror GODLIKE" })]);

  const bases = { A620: A620M, B840: B840, B850: B850, B650: B650, B650E: B650E,
    X670: X670, X670E: X670E, X870: X870, X870E: X870E };

  return L.map(([chipset, family, e]) => {
    const base = bases[chipset];
    const rec = Object.assign({}, base, e);
    return { chipset, family, rec };
  });
}

module.exports = { boards };