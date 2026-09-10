"use strict";
/* BIOSTAR AM5 seed — all 22 socket AM5 (DDR5) SKUs from the discovery list.
   Dense entry format; the builder merges over a chipset base.
   `m` = full model name. Facts verified against biostar.com.tw / biostar-usa.com
   spec + intro pages (2026-09). MEDIUM = official chipset-class spec but not
   every detail re-checked; LOW = board only seen in launch listings (no detail
   page) or spec unverifiable. UNKNOWN = not verified. */

const U = "UNKNOWN";
const E = (m, o, cls) => {
  const base = { m, cls: "consumer" };
  if (typeof cls === "string") base.cls = cls;
  else if (cls && typeof cls === "object") Object.assign(base, cls);
  return Object.assign(base, o);
};

const W7 = { wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4" };
const W6E = { wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2" };

const B840 = {
  memory_slots: 2, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin"
};
const B850 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 6, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin"
};
const X870E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: true, onboard_buttons: true, pcb_layers: 8, form_factor: "ATX", eps_connectors: U
};
const X670E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2",
  sata_ports: 6, ethernet: "Intel 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Intel I225V",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: true, onboard_buttons: true, pcb_layers: 8, form_factor: "ATX", eps_connectors: U
};
const B650E = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125B",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 8, form_factor: "ATX", eps_connectors: "1x 8-pin + 1x 4-pin"
};
const B650 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 6, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin"
};
const A620 = {
  memory_slots: 2, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 1,
  m2_details: "1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin"
};
const A620A = {
  memory_slots: 2, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "2x PCIe 4.0 x4 M.2",
  sata_ports: 2, ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin"
};

function boards() {
  /* order mirrors the official discovery list */
  return [
    { chipset: "B840", family: "Standard", rec: E("B840MT-E", {
      memory_slots: 2, max_memory: 128,
      _claim: "LOW", _src: "Biostar Computex 2026 launch listing; no detail page, chipset-class spec"
    }, Object.assign({}, B840)) },
    { chipset: "B850", family: "Silver", rec: E("B850M-SILVER", {
      memory_slots: 4, max_memory: 256, m2_slots: 2,
      m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: U,
      _claim: "HIGH", _src: "Biostar B850M-SILVER spec page (verified)"
    }, Object.assign({}, B850, W7)) },
    { chipset: "B850", family: "Standard", rec: E("B850MS-E", {
      memory_slots: 2, max_memory: 128, m2_slots: 2,
      m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
      audio_codec: "Realtek ALC897", debug_led: true, bios_flashback: true,
      _claim: "HIGH", _src: "Biostar B850MS-E launch news + spec page (verified)"
    }, Object.assign({}, B850, W7)) },
    { chipset: "B850", family: "Standard", rec: E("B850MT-E PRO", {
      memory_slots: 4, max_memory: 256, m2_slots: 2,
      m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: U,
      _claim: "HIGH", _src: "Biostar B850MT-E PRO spec page (verified)"
    }, Object.assign({}, B850, W7)) },
    { chipset: "B850", family: "Standard", rec: E("B850MT2-E DJ", {
      memory_slots: 2, max_memory: 128, m2_slots: 1,
      m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: U,
      _claim: "HIGH", _src: "Biostar B850MT2-E DJ spec page (verified)"
    }, Object.assign({}, B850, W7)) },
    { chipset: "X870E", family: "Valkyrie", rec: E("X870E VALKYRIE", {
      vrm: "18+2+2", vrm_phases: 22, power_stage_rating: 110,
      audio_codec: "Realtek ALC1220-VB2", usb4: true, sata_ports: 6,
      pcie_x16_slots: 2, secondary_pcie_slots: "1 x PCIe 5.0 x16, 1 x PCIe 4.0 x16",
      form_factor: "ATX",
      _claim: "HIGH", _src: "Biostar-USA X870E VALKYRIE spec page (verified)"
    }, Object.assign({}, X870E)) },
    { chipset: "A620A", family: "Standard", rec: E("A620MH AURORA", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
      _claim: "HIGH", _src: "Biostar A620MH AURORA spec page + Tom's Hardware (verified)"
    }, Object.assign({}, A620A)) },
    { chipset: "A620A", family: "Standard", rec: E("A620MHC", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      _claim: "LOW", _src: "Not on Biostar AM5 sitemap; A620A chipset-class spec only"
    }, Object.assign({}, A620A)) },
    { chipset: "A620A", family: "Standard", rec: E("A620MS-E", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
      _claim: "HIGH", _src: "Biostar A620MS-E spec page (verified)"
    }, Object.assign({}, A620A, W7)) },
    { chipset: "A620A", family: "Standard", rec: E("A620MT-E 2.0", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
      _claim: "HIGH", _src: "Biostar A620MT-E 2.0 spec page (verified)"
    }, Object.assign({}, A620A)) },
    { chipset: "A620", family: "Standard", rec: E("A620MP-E PRO", {
      memory_slots: 4, max_memory: 256, m2_slots: 2,
      m2_details: "2x PCIe 4.0 x4 M.2",
      _claim: "HIGH", _src: "Biostar A620MP-E PRO spec page (verified)"
    }, Object.assign({}, A620)) },
    { chipset: "A620", family: "Standard", rec: E("A620MS", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      _claim: "HIGH", _src: "Biostar A620MS spec page (verified)"
    }, Object.assign({}, A620)) },
    { chipset: "A620", family: "Standard", rec: E("A620MT", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
      _claim: "HIGH", _src: "Biostar A620MT spec page (verified)"
    }, Object.assign({}, A620)) },
    { chipset: "B650", family: "Silver", rec: E("B650M-SILVER", {
      memory_slots: 4, max_memory: 256, vrm: "14", vrm_phases: 14, power_stage_rating: 90,
      m2_slots: 2, m2_details: "2x PCIe 4.0 x4 M.2", sata_ports: 4,
      audio_codec: "Realtek ALC1220", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125B",
      _claim: "HIGH", _src: "Biostar B650M-SILVER spec page (verified)"
    }, Object.assign({}, B650)) },
    { chipset: "B650", family: "Standard", rec: E("B650M X3D PRO+", {
      memory_slots: 4, max_memory: 256, m2_slots: 2,
      m2_details: "2x PCIe 4.0 x4 M.2",
      _claim: "HIGH", _src: "Biostar B650M X3D PRO+ spec page (verified)"
    }, Object.assign({}, B650)) },
    { chipset: "B650", family: "Standard", rec: E("B650MP-E PRO", {
      memory_slots: 4, max_memory: 256, m2_slots: 2,
      m2_details: "2x PCIe 4.0 x4 M.2",
      _claim: "HIGH", _src: "Biostar B650MP-E PRO spec page (verified)"
    }, Object.assign({}, B650)) },
    { chipset: "B650", family: "Standard", rec: E("B650MS2", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "2.5GbE", ethernet_speed: "2.5G", ethernet_controller: U,
      _claim: "HIGH", _src: "Biostar B650MS2 spec page + manual (verified)"
    }, Object.assign({}, B650)) },
    { chipset: "B650", family: "Standard", rec: E("B650MS2-E", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "2.5GbE", ethernet_speed: "2.5G", ethernet_controller: U,
      _claim: "LOW", _src: "Not on Biostar AM5 sitemap; B650 chipset-class spec (B650MS2-context)"
    }, Object.assign({}, B650)) },
    { chipset: "B650", family: "Standard", rec: E("B650MT", {
      memory_slots: 2, max_memory: 128, m2_slots: 1, m2_details: "1x PCIe 4.0 x4 M.2",
      ethernet: "Realtek 1GbE", ethernet_speed: "1G", ethernet_controller: "Realtek RTL8111H",
      audio_codec: "Realtek ALC897",
      _claim: "HIGH", _src: "Biostar B650MT spec page + manual (verified)"
    }, Object.assign({}, B650)) },
    { chipset: "B650", family: "Standard", rec: E("B650MT-E PRO", {
      memory_slots: 4, max_memory: 256, m2_slots: 2,
      m2_details: "2x PCIe 4.0 x4 M.2",
      _claim: "HIGH", _src: "Biostar B650MT-E PRO spec page (verified)"
    }, Object.assign({}, B650)) },
    { chipset: "X670E", family: "Valkyrie", rec: E("X670E VALKYRIE", {
      vrm: "22", vrm_phases: 22, power_stage_rating: 105,
      audio_codec: "Realtek ALC1220", usb4: false, sata_ports: 6,
      m2_details: "2x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
      pcie_x16_slots: 2, secondary_pcie_slots: "1 x PCIe 5.0 x16, 1 x PCIe 4.0 x16",
      form_factor: "ATX",
      _claim: "HIGH", _src: "Biostar (JP) X670E VALKYRIE spec page (verified)"
    }, Object.assign({}, X670E)) },
    { chipset: "B650E", family: "Standard", rec: E("B650EGTQ", {
      memory_slots: 4, max_memory: 256, vrm: "14", vrm_phases: 14, power_stage_rating: 90,
      m2_slots: 3, m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2", sata_ports: 4,
      pcie_x16_slots: 2, secondary_pcie_slots: "1 x PCIe 4.0 x16",
      audio_codec: "Realtek ALC1220", ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125B",
      form_factor: "Micro-ATX",
      _claim: "HIGH", _src: "Biostar B650EGTQ spec page + TechPowerUp intro (verified, 244x244mm u-ATX)"
    }, Object.assign({}, B650E)) }
  ];
}

module.exports = { boards };