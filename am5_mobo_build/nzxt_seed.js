"use strict";
/* NZXT AM5 seed — all 4 official motherboard SKUs from the aggregated discovery.
   Dense entry format; the builder merges over a chipset base.
   Facts verified against NZXT store/spec pages and TechPowerUp / Igor'sLab reviews
   (2026-09). UNKNOWN = not verified. */

const U = "UNKNOWN";
const E = (m, o, cls) => {
  const base = { m, cls: "consumer" };
  if (typeof cls === "string") base.cls = cls;
  else if (cls && typeof cls === "object") Object.assign(base, cls);
  return Object.assign(base, o);
};

const W7 = { wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4" };
const W6E = { wifi: true, wifi_standard: "Wi-Fi 6E", bluetooth: "BT 5.2" };

const B650E = {
  memory_slots: 4, max_memory: 128, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 3,
  secondary_pcie_slots: "2 x PCIe 4.0 x16", m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: false, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "ATX", eps_connectors: "1x 8-pin + 1x 4-pin"
};
const B850 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 3,
  secondary_pcie_slots: "2 x PCIe 4.0 x16", m2_slots: 3,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 8, form_factor: "ATX", eps_connectors: "1x 8-pin + 1x 4-pin"
};
const X870E = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 4.0 x16 (x2)", m2_slots: 4,
  m2_details: "1x PCIe 5.0 x4 M.2, 3x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126CG",
  audio_codec: "Realtek ALC4082", wifi: false, wifi_standard: U, bluetooth: U, usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: true, onboard_buttons: true, pcb_layers: 8, form_factor: "ATX", eps_connectors: U
};

function boards() {
  /* order mirrors the official NZXT AM5 sitemap */
  return [
    { chipset: "B650E", family: "N7", rec: E("N7 B650E", {
      vrm: "16+2+1", vrm_phases: 19, power_stage_rating: 90,
      audio_codec: "Realtek ALC1220", usb4: false,
      m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x2 M.2",
      _claim: "HIGH", _src: "NZXT N7 B650E spec page (verified), TechPowerUp N7 B850 context"
    }, Object.assign({}, B650E, W6E)) },
    { chipset: "B850", family: "N7", rec: E("N7 B850", {
      vrm: "16+2+1", vrm_phases: 19, power_stage_rating: 80,
      memory_slots: 4, max_memory: 256, pcb_layers: 8,
      _claim: "HIGH", _src: "TechPowerUp NZXT N7 B850 review (verified)"
    }, Object.assign({}, B850, W6E)) },
    { chipset: "X870E", family: "N9", rec: E("N9 X870E", {
      vrm: "20+2+1", vrm_phases: 23, power_stage_rating: 110, pcb_layers: 8,
      max_memory: 192, audio_codec: "Realtek ALC4082",
      _claim: "HIGH", _src: "TechPowerUp + Igor'sLab NZXT N9 X870E reviews (verified)"
    }, Object.assign({}, X870E, W7)) },
    { chipset: "X870E", family: "N9", rec: E("N9 X870E + Kraken Elite 360 RGB", {
      vrm: "20+2+1", vrm_phases: 23, power_stage_rating: 110, pcb_layers: 8,
      max_memory: 192, audio_codec: "Realtek ALC4082",
      _claim: "MEDIUM", _src: "NZXT bundle listing (same board as N9 X870E)"
    }, Object.assign({}, X870E, W7)) }
  ];
}

module.exports = { boards };