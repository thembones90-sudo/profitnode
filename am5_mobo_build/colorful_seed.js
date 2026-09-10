"use strict";
/* Colorful AM5 seed — current AM5 DDR5 motherboard lineup across iGame, CVN,
   COLORFIRE, BATTLE-AX, and COLORFUL series.
   Dense entry format; the builder merges over a chipset/class base.
   Facts verified against Colorful official product pages, TechPowerUp, WCCFTech,
   eTeknix, Back2Gaming, CGMagazine, and videocardz reviews (2026-09).
   UNKNOWN = not verified. */

const U = "UNKNOWN";
const E = (m, o, cls) => {
  const base = { m, cls: "consumer" };
  if (typeof cls === "string") base.cls = cls;
  else if (cls && typeof cls === "object") Object.assign(base, cls);
  return Object.assign(base, o);
};

const W7 = { wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4" };
const W6 = { wifi: true, wifi_standard: "Wi-Fi 6", bluetooth: "BT 5.2" };

const X870E = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 4.0 x16 (x4)", m2_slots: 5,
  m2_details: "3x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126-CG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: true,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: 10, form_factor: "ATX", eps_connectors: "2x 8-pin"
};
const X870 = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 4.0 x16 (x4)", m2_slots: 3,
  m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 5GbE", ethernet_speed: "5G", ethernet_controller: "Realtek RTL8126-CG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: true,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: true, post_code: false, onboard_buttons: false, pcb_layers: 8, form_factor: "ATX", eps_connectors: "2x 8-pin"
};
const B850 = {
  memory_slots: 4, max_memory: 256, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 4.0 x16 (x4)", m2_slots: 2,
  m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: 8, form_factor: "Micro-ATX", eps_connectors: "2x 8-pin"
};
const B650 = {
  memory_slots: 4, max_memory: 192, memory_type: "DDR5",
  primary_pcie_generation: 5, primary_pcie_lanes: "x16", pcie_x16_slots: 2,
  secondary_pcie_slots: "1 x PCIe 4.0 x16 (x4)", m2_slots: 2,
  m2_details: "2x PCIe 5.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125",
  audio_codec: U, wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: true, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin + 1x 4-pin"
};
const A620 = {
  memory_slots: 2, max_memory: 96, memory_type: "DDR5",
  primary_pcie_generation: 4, primary_pcie_lanes: "x16", pcie_x16_slots: 1,
  secondary_pcie_slots: U, m2_slots: 2,
  m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
  sata_ports: 4, ethernet: "Realtek 2.5GbE", ethernet_speed: "2.5G", ethernet_controller: "Realtek RTL8125BG",
  audio_codec: "Realtek ALC897", wifi: false, wifi_standard: U, bluetooth: U, usb4: false,
  vrm_heatsink: true, m2_heatsinks: false, bios_flashback: true, clear_cmos: false,
  debug_led: false, post_code: false, onboard_buttons: false, pcb_layers: U, form_factor: "Micro-ATX", eps_connectors: "1x 8-pin"
};

function boards() {
  return [
    /* ── X870E ── */
    { chipset: "X870E", family: "iGame", rec: E("iGame X870E VULCAN OC V14", {
      vrm: "18+2+2", vrm_phases: 22, power_stage_rating: 110,
      memory_slots: 2, max_memory: 128,
      m2_details: "3x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC1220", ethernet_controller: "Realtek RTL8126-CG",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "TechPowerUp + Tom's Hardware + Back2Gaming reviews (verified)"
    }, Object.assign({}, X870E, W7)) },

    { chipset: "X870E", family: "CVN", rec: E("CVN X870E ARK FROZEN V14", {
      vrm: "16+2+1", vrm_phases: 19, power_stage_rating: 80,
      memory_slots: 4, max_memory: 192,
      m2_details: "3x PCIe 5.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC1220", ethernet_controller: "Realtek RTL8126-CG",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "Colorful official page + XiaomiToday + videocardz + WCCFTech (verified)"
    }, Object.assign({}, X870E, W7)) },

    /* ── X870 ── */
    { chipset: "X870", family: "iGame", rec: E("iGame X870 Senna V14", {
      vrm: "14+2+1", vrm_phases: 17, power_stage_rating: 80,
      memory_slots: 4, max_memory: 192,
      m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC1220", ethernet_controller: "Realtek RTL8126-CG", ethernet_speed: "5G",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "Colorful official page + GTStore.pk + Infinity Store specs (verified)"
    }, Object.assign({}, X870, W7)) },

    { chipset: "X870", family: "CVN", rec: E("CVN X870 ARK FROZEN V14", {
      vrm: "14+2+1", vrm_phases: 17, power_stage_rating: 80,
      memory_slots: 4, max_memory: 192,
      m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC1220", ethernet_controller: "Realtek RTL8126-CG",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "WCCFTech review + CGMagazine review + Back2Gaming review (verified)"
    }, Object.assign({}, X870, W7)) },

    /* ── B850 ── */
    { chipset: "B850", family: "CVN", rec: E("CVN B850M ARK FROZEN V14", {
      vrm: "14+2+1", vrm_phases: 17, power_stage_rating: 80,
      memory_slots: 4, max_memory: 192, m2_slots: 3,
      m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC1220", ethernet_controller: "Realtek RTL8125BG",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5, pcb_layers: 8,
      _claim: "HIGH", _src: "Colorful official page + TechPowerUp press + Chinese review (koolcenter/pconline, verified)"
    }, Object.assign({}, B850, W7)) },

    { chipset: "B850", family: "BATTLE-AX", rec: E("BATTLE-AX B850M-PLUS S WIFI7 V14", {
      vrm: "10+2+1", vrm_phases: 13, power_stage_rating: 55,
      memory_slots: 4, max_memory: 192,
      m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC897", ethernet_controller: "Realtek RTL8126-CG", ethernet_speed: "5G",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "Colorful official page + WCCFTech press + multiple retailer spec sheets (verified)"
    }, Object.assign({}, B850, W7)) },

    { chipset: "B850", family: "COLORFIRE", rec: E("COLORFIRE B850M-MEOW WIFI7 V14", {
      vrm: "10+2+1", vrm_phases: 13, power_stage_rating: 55,
      memory_slots: 4, max_memory: 192,
      m2_details: "1x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC897", ethernet_controller: "Realtek RTL8126-CG", ethernet_speed: "5G",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "Colorful official page + videocardz comparison table + WCCFTech press (verified)"
    }, Object.assign({}, B850, W7)) },

    { chipset: "B850", family: "iGame", rec: E("iGame B850M ULTRA-S V14", {
      vrm: "14+2+1", vrm_phases: 17, power_stage_rating: 80,
      memory_slots: 4, max_memory: 256, m2_slots: 3,
      m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC1220", ethernet_controller: "Realtek RTL8125BG",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5,
      _claim: "HIGH", _src: "Colorful official page + TechPowerUp press + eTeknix + KitGuru + PCVenus (verified)"
    }, Object.assign({}, B850, W7)) },

    { chipset: "B850", family: "iGame", rec: E("iGame B850M ULTRA-OC V14", {
      vrm: "10+2+1", vrm_phases: 13, power_stage_rating: 60,
      memory_slots: 2, max_memory: 128, m2_slots: 4,
      m2_details: "2x PCIe 5.0/4.0 x4 M.2, 2x PCIe 4.0 x4 M.2",
      sata_ports: 2, audio_codec: "Realtek ALC897", ethernet_controller: "Realtek RTL8126-CG", ethernet_speed: "5G",
      wifi: true, wifi_standard: "Wi-Fi 7", bluetooth: "BT 5.4",
      primary_pcie_generation: 5, eps_connectors: "1x 8-pin + 1x 4-pin",
      _claim: "HIGH", _src: "Colorful official page + TechPowerUp press + eTeknix + PCVenus (verified)"
    }, Object.assign({}, B850, W7)) },

    /* ── B650 ── */
    { chipset: "B650", family: "CVN", rec: E("CVN B650M GAMING FROZEN V14", {
      vrm: "12+2+1", vrm_phases: 15, power_stage_rating: 55,
      memory_slots: 4, max_memory: 192,
      m2_details: "2x PCIe 5.0 x4 M.2",
      audio_codec: "Realtek ALC897", ethernet_controller: "Realtek RTL8125",
      wifi: true, wifi_standard: "Wi-Fi 6", bluetooth: "BT 5.2",
      primary_pcie_generation: 5, secondary_pcie_slots: "1 x PCIe 4.0 x16 (x4)",
      _claim: "HIGH", _src: "Colorful official page + WCCFTech launch article + Datablitz spec sheet (verified)"
    }, Object.assign({}, B650, W6)) },

    { chipset: "B650", family: "CVN", rec: E("CVN B650 GAMING FROZEN V14", {
      vrm: "16+2+1", vrm_phases: 19, power_stage_rating: 55,
      memory_slots: 4, max_memory: 192, form_factor: "ATX", m2_slots: 3,
      m2_details: "2x PCIe 5.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC897", ethernet_controller: "Realtek RTL8125",
      wifi: true, wifi_standard: "Wi-Fi 6", bluetooth: "BT 5.2",
      primary_pcie_generation: 5, secondary_pcie_slots: "1 x PCIe 4.0 x16 (x4)",
      _claim: "MEDIUM", _src: "SL Techie spec sheet + Nanotek LK listing + WCCFTech context (not independently reviewed)"
    }, Object.assign({}, B650, W6)) },

    /* ── A620 ── */
    { chipset: "A620", family: "BATTLE-AX", rec: E("BATTLE-AX A620M-GHA WIFI V14", {
      vrm: "7+2+1", vrm_phases: 10, power_stage_rating: 60,
      memory_slots: 2, max_memory: 96,
      m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      audio_codec: "Realtek ALC897",
      wifi: true, wifi_standard: "Wi-Fi 6", bluetooth: "BT 5.2",
      primary_pcie_generation: 4,
      _claim: "HIGH", _src: "Colorful official page + Adrenaline BR spec sheet + Onliner.by detailed specs (verified)"
    }, Object.assign({}, A620, W6)) },

    { chipset: "A620", family: "BATTLE-AX", rec: E("BATTLE-AX A620M-D PRO V14", {
      vrm: "7+2+1", vrm_phases: 10, power_stage_rating: 60,
      memory_slots: 2, max_memory: 96,
      m2_details: "1x PCIe 4.0 x4 M.2, 1x PCIe 4.0 x4 M.2",
      ethernet_controller: "Realtek RTL8125BG",
      primary_pcie_generation: 4,
      _claim: "MEDIUM", _src: "Colorful official page + PConline.cn listing (basic specs confirmed, not independently reviewed)"
    }, Object.assign({}, A620)) }
  ];
}

module.exports = { boards };
