"use strict";

/* PROFITNODE RIG ENCLOSURE v1.
   Loaded after app_core.js and psu_extension.js.
   CASE and COOLER are capability profiles, not exhaustive catalogs:
   known-model lookup, generic-profile fallback, or a fully manual custom
   model. A missing/unknown profile always grades UNVERIFIED — it never
   auto-fails a build and never touches the raw performance score or tier. */

HardwareCatalog.cases = HardwareCatalog.cases || [];
HardwareCatalog.coolers = HardwareCatalog.coolers || [];
HardwareCatalog.caseError = null;
HardwareCatalog.coolerError = null;

const PN_ENCLOSURE_FORM_FACTORS = ["ITX","MATX","ATX","EATX"];
const PN_ENCLOSURE_FF_LABELS = {ITX:"ITX",MATX:"mATX",ATX:"ATX",EATX:"E-ATX"};
const PN_ENCLOSURE_PSU_FORM = ["ATX","SFX"];
const PN_ENCLOSURE_AIRFLOW = ["POOR","FAIR","GOOD","EXCELLENT"];
const PN_ENCLOSURE_BUILD_QUALITY = ["BASIC","SOLID","GOOD","PREMIUM"];
const PN_ENCLOSURE_SIDE_PANEL = ["steel","acrylic","tempered glass","mesh"];
const PN_ENCLOSURE_RADIATOR = ["none","120","140","240","280","360","420"];
const PN_ENCLOSURE_COOLER_TYPE = ["STOCK","AIR","AIO"];
const PN_ENCLOSURE_COOLING_CLASS = ["BASIC","MID","HIGH"];
const PN_COOLING_RANK = {BASIC:0,MID:1,HIGH:2};

const PN_GENERIC_CASES = [
  {id:"generic-itx-airflow",label:"Generic ITX Airflow Case",caps:{formFactors:["ITX"],maxGpuLengthMm:260,maxCoolerHeightMm:130,psuSupport:"SFX",maxPsuLengthMm:null,radiator:{front:"none",top:"240",rear:"none"},includedFans:1,maxFanPositions:4,airflow:"FAIR",buildQuality:"BASIC",sidePanel:"steel",notes:"Generic SFF profile — verify the exact chassis dimensions."}},
  {id:"generic-matx-airflow",label:"Generic mATX Airflow Case",caps:{formFactors:["ITX","MATX"],maxGpuLengthMm:310,maxCoolerHeightMm:155,psuSupport:"ATX",maxPsuLengthMm:null,radiator:{front:"240",top:"240",rear:"none"},includedFans:2,maxFanPositions:5,airflow:"GOOD",buildQuality:"BASIC",sidePanel:"mesh",notes:"Generic mATX profile — typical budget-to-mid chassis."}},
  {id:"generic-atx-airflow",label:"Generic ATX Airflow Case",caps:{formFactors:["ITX","MATX","ATX"],maxGpuLengthMm:330,maxCoolerHeightMm:160,psuSupport:"ATX",maxPsuLengthMm:null,radiator:{front:"280",top:"240",rear:"120"},includedFans:2,maxFanPositions:6,airflow:"GOOD",buildQuality:"SOLID",sidePanel:"mesh",notes:""}},
  {id:"generic-atx-high-airflow",label:"Generic ATX High-Airflow Case",caps:{formFactors:["ITX","MATX","ATX"],maxGpuLengthMm:380,maxCoolerHeightMm:180,psuSupport:"ATX",maxPsuLengthMm:null,radiator:{front:"360",top:"360",rear:"120"},includedFans:3,maxFanPositions:8,airflow:"EXCELLENT",buildQuality:"SOLID",sidePanel:"mesh",notes:""}},
  {id:"generic-eatx-full-tower",label:"Generic E-ATX Full Tower Case",caps:{formFactors:["ITX","MATX","ATX","EATX"],maxGpuLengthMm:420,maxCoolerHeightMm:185,psuSupport:"ATX",maxPsuLengthMm:null,radiator:{front:"360",top:"360",rear:"120"},includedFans:3,maxFanPositions:9,airflow:"EXCELLENT",buildQuality:"PREMIUM",sidePanel:"mesh",notes:""}},
  {id:"generic-sfx-sff",label:"Generic SFF / Mini Tower Case",caps:{formFactors:["ITX"],maxGpuLengthMm:200,maxCoolerHeightMm:70,psuSupport:"SFX",maxPsuLengthMm:null,radiator:{front:"none",top:"none",rear:"120"},includedFans:1,maxFanPositions:3,airflow:"FAIR",buildQuality:"BASIC",sidePanel:"steel",notes:"Bare-bones small form factor profile."}}
];

const PN_GENERIC_COOLERS = [
  {id:"generic-stock",label:"Stock / Bundled Cooler",caps:{type:"STOCK",radiator:null,heightMm:70,sockets:[],coolingClass:"LIGHT",fanCount:1,noiseClass:"LOUD",tdpClass:"LIGHT",ramClearance:"NO",notes:"Bundled units only suit low-heat CPUs."}},
  {id:"generic-low-profile",label:"Low-Profile Cooler",caps:{type:"LOW PROFILE",radiator:null,heightMm:55,sockets:[],coolingClass:"LIGHT",fanCount:1,noiseClass:"NORMAL",tdpClass:"LIGHT",ramClearance:"NO",notes:""}},
  {id:"generic-120-mm-tower",label:"Standard 120 mm Tower Cooler",caps:{type:"SINGLE TOWER",radiator:null,heightMm:155,sockets:[],coolingClass:"STANDARD",fanCount:1,noiseClass:"NORMAL",tdpClass:"STANDARD",ramClearance:"NO",notes:""}},
  {id:"generic-strong-tower",label:"Strong Tower Cooler",caps:{type:"SINGLE TOWER",radiator:null,heightMm:158,sockets:[],coolingClass:"STRONG",fanCount:1,noiseClass:"NORMAL",tdpClass:"STRONG",ramClearance:"NO",notes:""}},
  {id:"generic-dual-tower",label:"Dual-Tower Air Cooler",caps:{type:"DUAL TOWER",radiator:null,heightMm:160,sockets:[],coolingClass:"STRONG",fanCount:2,noiseClass:"NORMAL",tdpClass:"STRONG",ramClearance:"UNKNOWN",notes:"Tall dual-tower coolers commonly overhang the first DIMM slots."}},
  {id:"generic-dual-tower-extreme",label:"Dual-Tower Extreme Air Cooler",caps:{type:"DUAL TOWER",radiator:null,heightMm:165,sockets:[],coolingClass:"EXTREME",fanCount:2,noiseClass:"NORMAL",tdpClass:"EXTREME",ramClearance:"UNKNOWN",notes:"NH-D15-class performance without a liquid loop."}},
  {id:"generic-aio-120",label:"120 mm AIO Liquid Cooler",caps:{type:"AIO",radiator:"120",heightMm:null,sockets:[],coolingClass:"LIGHT",fanCount:1,noiseClass:"NORMAL",tdpClass:"LIGHT",ramClearance:"NO",notes:""}},
  {id:"generic-aio-240",label:"240 mm AIO Liquid Cooler",caps:{type:"AIO",radiator:"240",heightMm:null,sockets:[],coolingClass:"STRONG",fanCount:2,noiseClass:"NORMAL",tdpClass:"STRONG",ramClearance:"NO",notes:""}},
  {id:"generic-aio-280",label:"280 mm AIO Liquid Cooler",caps:{type:"AIO",radiator:"280",heightMm:null,sockets:[],coolingClass:"EXTREME",fanCount:2,noiseClass:"NORMAL",tdpClass:"EXTREME",ramClearance:"NO",notes:""}},
  {id:"generic-aio-360",label:"360 mm AIO Liquid Cooler",caps:{type:"AIO",radiator:"360",heightMm:null,sockets:[],coolingClass:"EXTREME",fanCount:3,noiseClass:"NORMAL",tdpClass:"EXTREME",ramClearance:"NO",notes:""}}
];

function caseGenericById(id){ return PN_GENERIC_CASES.find(p=>p.id===id)||null; }
function coolerGenericById(id){ return PN_GENERIC_COOLERS.find(p=>p.id===id)||null; }

function normalizeCaseCaps(raw){
  raw = raw || {};
  return {
    formFactors:Array.isArray(raw.formFactors)?raw.formFactors.filter(Boolean):[],
    maxGpuLengthMm:raw.maxGpuLengthMm==null||raw.maxGpuLengthMm===""?null:Number(raw.maxGpuLengthMm),
    maxCoolerHeightMm:raw.maxCoolerHeightMm==null||raw.maxCoolerHeightMm===""?null:Number(raw.maxCoolerHeightMm),
    psuSupport:raw.psuSupport||null,
    maxPsuLengthMm:raw.maxPsuLengthMm==null||raw.maxPsuLengthMm===""?null:Number(raw.maxPsuLengthMm),
    radiator:Object.assign({front:"none",top:"none",rear:"none"},raw.radiator||{}),
    includedFans:raw.includedFans==null||raw.includedFans===""?null:Number(raw.includedFans),
    maxFanPositions:raw.maxFanPositions==null||raw.maxFanPositions===""?null:Number(raw.maxFanPositions),
    airflow:raw.airflow||null,
    buildQuality:raw.buildQuality||null,
    sidePanel:raw.sidePanel||null,
    notes:raw.notes||""
  };
}

function normalizeCoolerCaps(raw){
  raw = raw || {};
  const rawType=String(raw.type||"").toUpperCase();
  const rawClass=String(raw.coolingClass||raw.tdpClass||"").toUpperCase();
  return {
    type:rawType==="STOCK"?"STOCK":rawType==="AIO"?"AIO":rawType?"AIR":null,
    radiator:raw.radiator||null,
    heightMm:raw.heightMm==null||raw.heightMm===""?null:Number(raw.heightMm),
    sockets:Array.isArray(raw.sockets)?raw.sockets.map(s=>String(s).trim().toUpperCase()).filter(Boolean):stringToSockets(raw.sockets),
    coolingClass:["LIGHT","BASIC"].includes(rawClass)?"BASIC":["STANDARD","STRONG","MID"].includes(rawClass)?"MID":["EXTREME","HIGH"].includes(rawClass)?"HIGH":null
  };
}

function stringToSockets(v){
  if(!v) return [];
  return String(v).split(",").map(s=>String(s).trim().toUpperCase()).filter(Boolean);
}

function caseRadHasAny(caps){
  if(!caps||!caps.radiator) return false;
  return ["front","top","rear"].some(p=>caps.radiator[p]&&caps.radiator[p]!=="none");
}

function radSize(s){
  if(!s||String(s).toLowerCase()==="none") return 0;
  const n=parseInt(String(s).replace(/\D/g,""),10);
  return isNaN(n)?0:n;
}

function isEmptyCaseCaps(caps){
  if(!caps) return true;
  return !(
    (Array.isArray(caps.formFactors)&&caps.formFactors.length) ||
    (caps.maxGpuLengthMm!=null&&caps.maxGpuLengthMm!=="") ||
    (caps.maxCoolerHeightMm!=null&&caps.maxCoolerHeightMm!=="") ||
    caps.psuSupport||caps.airflow||caps.buildQuality||caps.sidePanel ||
    (caps.maxPsuLengthMm!=null&&caps.maxPsuLengthMm!=="") ||
    (caps.includedFans!=null&&caps.includedFans!=="") ||
    (caps.maxFanPositions!=null&&caps.maxFanPositions!=="") ||
    caseRadHasAny(caps)
  );
}

function isEmptyCoolerCaps(caps){
  if(!caps) return true;
  return !( caps.type||caps.radiator||
    (caps.heightMm!=null&&caps.heightMm!=="") ||
    (Array.isArray(caps.sockets)&&caps.sockets.length)||
    caps.coolingClass );
}

function caseEntryFor(slot){
  if(!slot||!slot.label) return null;
  if(slot.catalogKey){
    const byKey=(HardwareCatalog.cases||[]).find(e=>catalogKey("CASE",e)===slot.catalogKey);
    if(byKey) return byKey;
  }
  return catalogFind("CASE",slot.label);
}

function coolerEntryFor(slot){
  if(!slot||!slot.label) return null;
  if(slot.catalogKey){
    const byKey=(HardwareCatalog.coolers||[]).find(e=>catalogKey("COOLER",e)===slot.catalogKey);
    if(byKey) return byKey;
  }
  return catalogFind("COOLER",slot.label);
}

function caseCapabilities(slot,resolvedLabel){
  if(!slot) return null;
  if(slot.caps&&!isEmptyCaseCaps(slot.caps)) return normalizeCaseCaps(slot.caps);
  if(slot.source==="MANUAL") return normalizeCaseCaps(slot.caps);
  let entry=null;
  if(slot.catalogKey) entry=(HardwareCatalog.cases||[]).find(e=>catalogKey("CASE",e)===slot.catalogKey);
  if(!entry){
    const label=(resolvedLabel||slot.label||"").trim();
    if(label) entry=catalogFind("CASE",label);
  }
  if(entry){
    slot.caps=normalizeCaseCaps(entry.caps||{});
    slot.source="CATALOG";
    slot.catalogKey=catalogKey("CASE",entry);
    return slot.caps;
  }
  if(slot.genericId){
    const preset=caseGenericById(slot.genericId);
    if(preset){ slot.caps=normalizeCaseCaps(preset.caps); slot.source="GENERIC"; return slot.caps; }
  }
  return null;
}

function coolerCapabilities(slot,resolvedLabel){
  if(!slot) return null;
  if(slot.caps&&!isEmptyCoolerCaps(slot.caps)) return normalizeCoolerCaps(slot.caps);
  if(slot.source==="MANUAL") return normalizeCoolerCaps(slot.caps);
  let entry=null;
  if(slot.catalogKey) entry=(HardwareCatalog.coolers||[]).find(e=>catalogKey("COOLER",e)===slot.catalogKey);
  if(!entry){
    const label=(resolvedLabel||slot.label||"").trim();
    if(label) entry=catalogFind("COOLER",label);
  }
  if(entry){
    slot.caps=normalizeCoolerCaps(entry.caps||{});
    slot.source="CATALOG";
    slot.catalogKey=catalogKey("COOLER",entry);
    return slot.caps;
  }
  if(slot.genericId){
    const preset=coolerGenericById(slot.genericId);
    if(preset){ slot.caps=normalizeCoolerCaps(preset.caps); slot.source="GENERIC"; return slot.caps; }
  }
  return null;
}

function numOrNull(v){ if(v==null||v==="") return null; const n=Number(v); return isNaN(n)?null:n; }

function caseRadText(caps){
  if(!caps||!caps.radiator) return "";
  const parts=["front","top","rear"].map(p=>{
    const v=caps.radiator[p];
    return (v&&v!=="none")?p+" "+v:null;
  }).filter(Boolean);
  return parts.length?parts.join(" · "):"";
}

function caseCapsText(caps){
  if(!caps||isEmptyCaseCaps(caps)) return "No capabilities recorded";
  const bits=[];
  if(caps.formFactors&&caps.formFactors.length) bits.push(caps.formFactors.map(f=>PN_ENCLOSURE_FF_LABELS[f]||f).join("/"));
  if(caps.maxGpuLengthMm) bits.push(caps.maxGpuLengthMm+"mm GPU");
  if(caps.maxCoolerHeightMm) bits.push(caps.maxCoolerHeightMm+"mm cooler");
  if(caps.airflow) bits.push(caps.airflow+" airflow");
  if(caps.psuSupport) bits.push(caps.psuSupport+" PSU");
  const rad=caseRadText(caps);
  if(rad) bits.push(rad);
  if(caps.includedFans!=null) bits.push(caps.includedFans+" fans");
  return bits.join(" · ");
}

function coolerCapsText(caps){
  if(!caps||isEmptyCoolerCaps(caps)) return "No capabilities recorded";
  const bits=[];
  if(caps.type) bits.push(caps.type);
  if(caps.type==="AIO"&&caps.radiator) bits.push(caps.radiator+"mm rad");
  else if(caps.heightMm) bits.push(caps.heightMm+"mm");
  if(caps.coolingClass) bits.push(caps.coolingClass);
  if(caps.sockets&&caps.sockets.length) bits.push(caps.sockets.join("/"));
  return bits.join(" · ");
}

function caseCapText(caps){ return caps&&!isEmptyCaseCaps(caps)?"CASE CAPABILITY":"CASE ?"; }

function cpuThermalDemand(cpuResolved){
  if(!cpuResolved) return "UNKNOWN";
  const t=pnNorm(cpuResolved.label||"");
  if(!t) return "UNKNOWN";
  if(/X3D\b/.test(t)||/RYZEN\s?[79]\b/.test(t)||/I[79]\b/.test(t)) return "HIGH";
  if(/RYZEN\s?5\b/.test(t)||/I5\b/.test(t)) return "MID";
  if(/RYZEN\s?3\b/.test(t)||/I3\b/.test(t)||/ATHLON|PENTIUM|CELERON/.test(t)) return "BASIC";
  return "UNKNOWN";
}

function cpuRequiresSeparateCooler(cpuResolved){
  if(!cpuResolved) return null;
  const t=pnNorm(cpuResolved.label||"");
  if(!t) return null;
  if(/INTEL/.test(t)||/CORE\s?I[3579]|\bI[3579][ -]/.test(t)) return /\bK(F|S)?\b|\d{4,5}K(F|S)?\b/.test(t);
  if(/THREADRIPPER|X3D\b|\bXT\b/.test(t)) return true;
  const ryzen=t.match(/RYZEN\s?[3579]\s?(\d{4})\s*X\b/);
  if(ryzen){
    const model=Number(ryzen[1]);
    if(model>=7000||model===5700||model>=5800&&model<6000) return true;
    return false;
  }
  if(/RYZEN|ATHLON|PENTIUM|CELERON/.test(t)) return false;
  return null;
}

const RYZEN_STOCK_AM4={1600:"SPIRE","1600X":"SPIRE",1700:"SPIRE","1700X":"SPIRE","1800X":"SPIRE",
  "2200G":"STEALTH","2400G":"STEALTH",2600:"STEALTH","2600X":"SPIRE",
  "3200G":"STEALTH","3300X":"STEALTH","3400G":"SPIRE",3600:"STEALTH","3600X":"SPIRE","3700X":"PRISM","3800X":"PRISM","3900X":"PRISM",
  "4300G":"STEALTH",4500:"STEALTH","4600G":"STEALTH","4650G":"STEALTH",
  5500:"STEALTH",5600:"STEALTH","5600G":"STEALTH","5700G":"STEALTH"};

function stockCoolerMatch(cpuResolved,coolerCaps,coolerLabel){
  if(!cpuResolved||!coolerCaps) return false;
  if(String(coolerCaps.type||"").toUpperCase()!=="STOCK") return false;
  if(cpuRequiresSeparateCooler(cpuResolved)===true) return false;
  const t=pnNorm(cpuResolved.label||"");
  if(detectCpuSocket(t)!=="AM4") return false;
  const m=t.match(/RYZEN\s?[3579]?\s?(\d{3,4})\b/),model=m?m[1]:null,expected=model?RYZEN_STOCK_AM4[Number(model)]:null;
  if(!expected) return false;
  const lab=pnNorm(coolerLabel||"");
  const isStealth=/\bSTEALTH\b/.test(lab),isSpire=/\bSPIRE\b/.test(lab),isPrism=/\bPRISM\b/.test(lab);
  if(expected==="PRISM") return isPrism;
  if(expected==="SPIRE") return isSpire||isPrism;
  return true;
}

function gpuLengthMm(gpuResolved){
  const profile=gpuLengthProfile(gpuResolved);
  return profile?profile.lengthMm:null;
}

const PN_GPU_GENERIC_ENVELOPES=[
  {model:"GTX 1070 8GB",match:/\bGTX 1070(?: 8GB)?\b/,lengthMm:300,basis:"MSI 279 mm / Gigabyte 280 mm representative cards + 20 mm fit buffer"}
];

function gpuLengthProfile(gpuResolved){
  if(!gpuResolved) return null;
  const data=gpuResolved.pn&&gpuResolved.pn.data;
  const raw=data&&data.length_mm;
  if(raw!=null&&!isNaN(Number(raw))) return {lengthMm:Number(raw),source:"EXACT",basis:"Exact catalog dimension"};
  const m=String(gpuResolved.label||"").match(/(\d{3})\s*mm/i);
  if(m) return {lengthMm:Number(m[1]),source:"EXACT",basis:"Explicit selected-card dimension"};
  const label=pnNorm((data&&data.model)||gpuResolved.label||"");
  const envelope=PN_GPU_GENERIC_ENVELOPES.find(item=>item.match.test(label));
  return envelope?{lengthMm:envelope.lengthMm,source:"GENERIC_ENVELOPE",model:envelope.model,basis:envelope.basis}:null;
}

function psuFormFactor(psuResolved){
  if(!psuResolved) return null;
  const raw=String((psuResolved.pn&&psuResolved.pn.data&&psuResolved.pn.data.atx_spec)||"").toUpperCase();
  const lab=String(psuResolved.label||"").toUpperCase();
  const hay=raw+" "+lab;
  if(/\bATX\b/.test(hay)) return "ATX";
  if(/\bSFX\b/.test(hay)) return "SFX";
  const w=psuResolvedWattage(psuResolved);
  if(w&&w>=250) return "ATX";
  return null;
}

function socketMatches(coolerSocket,cpuSocket){
  const a=String(coolerSocket).toUpperCase().replace(/[^A-Z0-9X]/g,"");
  const b=String(cpuSocket).toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(a===b) return true;
  if(/\d+X$/.test(a)) return b.startsWith(a.slice(0,-2));
  return false;
}

function isAioCaps(caps){ return caps&&String(caps.type||"").toUpperCase()==="AIO"; }

function rigEnclosureScope(rig){
  const slots=rig&&rig.slots?rig.slots:{};
  return !!(slots.CASE||slots.COOLER||slots.PSU);
}

function rigIntegrity(rig){
  const out={state:"UNVERIFIED",checks:[],warnings:[]};
  if(!rig||!rig.slots) return out;
  const currency=rig.currency||"RSD";
  const s=rig.slots;
  const cpu=rigSlotResolved(s.CPU,currency,"CPU");
  const gpu=rigSlotResolved(s.GPU,currency,"GPU");
  const mobo=rigSlotResolved(s.MOBO,currency,"MOBO");
  const ram=rigSlotResolved(s.RAM,currency,"RAM");
  const psu=rigSlotResolved(s.PSU,currency,"PSU");
  const caseResolved=rigSlotResolved(s.CASE,currency,"CASE");
  const coolerResolved=rigSlotResolved(s.COOLER,currency,"COOLER");
  const storage=rigSlotResolved(s.STORAGE,currency,"STORAGE");
  const caseCap=caseCapabilities(s.CASE,caseResolved&&caseResolved.label);
  const coolerCap=coolerCapabilities(s.COOLER,coolerResolved&&coolerResolved.label);
  const checks=[];
  const push=(id,status,label,detail)=>checks.push({id:id,status:status,label:label,detail:detail});

  if(s.CPU&&s.MOBO){
    const cs=detectCpuSocket(pnNorm(cpu&&cpu.label||"")),ms=detectMoboSocket(pnNorm(mobo&&mobo.label||""));
    if(cs&&ms&&cs===ms){
      push("CPU_PLATFORM","PASS","CPU platform",cs+" CPU on a "+ms+" motherboard — verified compatible.");
      const chip=(pnNorm(mobo.label||"").match(/(B\d{3}|A\d{3}|X\d{3})/)||[])[1];
      if(chip&&/B350|B450|A320|X370|X470/.test(chip)&&/(^|[^0-9])3\d{3}/.test(pnNorm(cpu.label||""))){
        push("CPU_BIOS","INFO","BIOS note","A "+chip+"-class board may need a BIOS update to boot a Zen 2 CPU — confirm the installed BIOS before assembly.");
      }
    }else if(cs&&ms&&cs!==ms){
      push("CPU_PLATFORM","FAIL","CPU platform",cs+" CPU does not fit the "+ms+" motherboard platform.");
    }else{
      push("CPU_PLATFORM","UNVERIFIED","CPU platform","CPU/MOTHERBOARD PLATFORM UNVERIFIED — "+(cs?"motherboard":ms?"CPU":"CPU or motherboard")+" socket could not be read.");
    }
  }

  if(s.RAM&&s.MOBO){
    const cfg=s.RAM.ram||null,ramLabel=pnNorm(s.RAM.label||""),moboLabel=pnNorm(mobo&&mobo.label||"");
    const ramDdr=/DDR3/.test(ramLabel)?"DDR3":/DDR4/.test(ramLabel)?"DDR4":/DDR5/.test(ramLabel)?"DDR5":cfg?"DDR4"===(cfg.technology||"")||/DDR4/.test(String(cfg.notes||"").toUpperCase())?"DDR4":"DDR5"===(cfg.technology||"")||/DDR5/.test(String(cfg.notes||"").toUpperCase())?"DDR5":null:null;
    const cpuT=pnNorm(cpu&&cpu.label||""),moboDdr=/DDR3/.test(moboLabel)?"DDR3":/DDR4/.test(moboLabel)?"DDR4":/DDR5/.test(moboLabel)?"DDR5":detectCpuSocket(cpuT)==="AM5"?"DDR5":detectCpuSocket(cpuT)==="AM4"?"DDR4":null;
    if(!ramDdr||!moboDdr){
      push("RAM_PLATFORM","UNVERIFIED","RAM platform","RAM/MOTHERBOARD PLATFORM UNVERIFIED — could not read a memory generation.");
    }else if(ramDdr!==moboDdr){
      push("RAM_PLATFORM","FAIL","RAM platform","RAM IS "+ramDdr+" BUT THE MOTHERBOARD IS A "+moboDdr+" PLATFORM — INCOMPATIBLE MEMORY GENERATION.");
    }else{
      push("RAM_PLATFORM","PASS","RAM platform","Verified "+ramDdr+" memory platform — CPU and motherboard both accept "+ramDdr+".");
      if(cfg&&null==cfg.xmp&&ramDdr==="DDR4") push("RAM_XMP","INFO","XMP profile","XMP STATUS UNKNOWN — DDR4 kits run at base speed until XMP is enabled in BIOS.");
    }
  }

  if(s.GPU&&s.MOBO){
    const gen=moboGpuPcieGen(mobo&&mobo.pn&&mobo.pn.data)||detectMoboPcieGeneration(pnNorm(mobo&&mobo.label||""));
    if(!gen){
      push("GPU_PLATFORM","UNVERIFIED","GPU platform","GPU/MOTHERBOARD PLATFORM UNVERIFIED — could not read the motherboard PCIe generation.");
    }else{
      push("GPU_PLATFORM","PASS","GPU platform","GPU mounts on this motherboard via PCIe Gen "+gen+". No platform-level conflict.");
    }
  }

  if(s.MOBO&&s.STORAGE){
    const iface=storage&&storage.pn&&storage.pn.data&&String(storage.pn.data.interface||"").toUpperCase();
    const labelI=pnNorm(String(s.STORAGE.label||""));
    const known=iface||(/SATA/.test(labelI)?"SATA":/NVME|NVM EXPRESS|PCIE/.test(labelI)?"PCIE":null);
    if(!known){
      push("STORAGE_INTERFACE","UNVERIFIED","Storage interface","STORAGE INTERFACE UNVERIFIED — no interface data for the primary storage drive.");
    }else{
      push("STORAGE_INTERFACE","PASS","Storage interface","Primary storage uses "+known+" — supported by this motherboard.");
    }
  }

  if(s.CASE&&s.MOBO){
    const moboFF=motherboardCatalogFormFactor(mobo);
    const FFs=caseCap&&Array.isArray(caseCap.formFactors)?caseCap.formFactors:[];
    if(!caseCap||!FFs.length){
      push("MOBO_FORM_FACTOR","UNVERIFIED","Case form factor","MOBO/CASE FORM FACTOR UNVERIFIED — no case capability record.");
    }else if(!moboFF){
      push("MOBO_FORM_FACTOR","UNVERIFIED","Case form factor","MOBO/CASE FORM FACTOR UNVERIFIED — canonical motherboard form factor is missing or unknown.");
    }else if(FFs.includes(moboFF)){
      push("MOBO_FORM_FACTOR","PASS","Case form factor",(PN_ENCLOSURE_FF_LABELS[moboFF]||moboFF)+" motherboard fits this case (supports "+FFs.map(f=>PN_ENCLOSURE_FF_LABELS[f]||f).join("/")+").");
    }else{
      push("MOBO_FORM_FACTOR","FAIL","Case form factor","MOTHERBOARD FORM FACTOR MISMATCH — "+(PN_ENCLOSURE_FF_LABELS[moboFF]||moboFF)+" board does not fit a case that supports "+FFs.map(f=>PN_ENCLOSURE_FF_LABELS[f]||f).join("/")+".");
    }
  }

  if(s.CASE&&s.GPU){
    const maxGpu=caseCap?numOrNull(caseCap.maxGpuLengthMm):null;
    const gpuProfile=gpuLengthProfile(gpu),gpuLen=gpuProfile&&gpuProfile.lengthMm;
    if(!caseCap||!maxGpu){
      push("GPU_CLEARANCE","UNVERIFIED","GPU length","GPU CLEARANCE UNVERIFIED — the case has no max GPU length record.");
    }else if(!gpuLen){
      push("GPU_CLEARANCE","UNVERIFIED","GPU length","GPU CLEARANCE UNVERIFIED — could not read a length from the GPU model.");
    }else if(gpuProfile.source==="GENERIC_ENVELOPE"&&maxGpu<gpuLen+10){
      push("GPU_CLEARANCE","UNVERIFIED","GPU length","GPU CLEARANCE UNVERIFIED — "+maxGpu+" mm case clearance is too close to the "+gpuLen+" mm "+gpuProfile.model+" generic envelope; exact card model required.");
    }else if(gpuLen>maxGpu){
      push("GPU_CLEARANCE","WARN","GPU length","GPU EXCEEDS CASE CLEARANCE — "+gpuLen+" mm GPU does not fit the "+maxGpu+" mm case limit.");
    }else if(gpuProfile.source==="GENERIC_ENVELOPE"){
      push("GPU_CLEARANCE","PASS","GPU length",gpuLen+" mm conservative "+gpuProfile.model+" family envelope fits within the "+maxGpu+" mm case limit (generic envelope).");
    }else{
      push("GPU_CLEARANCE","PASS","GPU length",gpuLen+" mm GPU fits within the "+maxGpu+" mm case limit.");
    }
  }

  if(s.CASE&&s.COOLER){
    const maxH=caseCap?numOrNull(caseCap.maxCoolerHeightMm):null;
    const coolerH=coolerCap?numOrNull(coolerCap.heightMm):null;
    if(isAioCaps(coolerCap)){
      push("COOLER_HEIGHT","PASS","Cooler height","AIO cooler — pump/block height is not a case clearance factor.");
    }else if(!caseCap||!maxH){
      push("COOLER_HEIGHT","UNVERIFIED","Cooler height","CPU COOLER HEIGHT UNVERIFIED — the case has no max cooler height record.");
    }else if(!coolerCap||!coolerH){
      push("COOLER_HEIGHT","UNVERIFIED","Cooler height","CPU COOLER HEIGHT UNVERIFIED — the cooler has no height record.");
    }else if(coolerH>maxH){
      push("COOLER_HEIGHT","FAIL","Cooler height","CPU COOLER HEIGHT EXCEEDS CASE LIMIT — "+coolerH+" mm cooler vs "+maxH+" mm case limit.");
    }else{
      push("COOLER_HEIGHT","PASS","Cooler height",coolerH+" mm cooler fits within the "+maxH+" mm case limit.");
    }
  }

  if(s.COOLER&&isAioCaps(coolerCap)){
    const rad=coolerCap.radiator;
    if(!rad||rad==="none"){
      push("RADIATOR_FIT","UNVERIFIED","AIO radiator","AIO RADIATOR SIZE UNVERIFIED — no radiator size recorded for the cooler.");
    }else if(!s.CASE||!caseCap||!caseCap.radiator){
      push("RADIATOR_FIT","UNVERIFIED","AIO radiator","AIO RADIATOR FIT UNVERIFIED — no radiator support record for the case.");
    }else{
      const fits=["front","top","rear"].filter(pos=>radSize(caseCap.radiator[pos])>0&&radSize(caseCap.radiator[pos])>=radSize(rad));
      if(fits.length){
        push("RADIATOR_FIT","PASS","AIO radiator",rad+" mm AIO fits the case "+fits[0]+" mount.");
      }else{
        push("RADIATOR_FIT","FAIL","AIO radiator","AIO RADIATOR FIT — a "+rad+" mm radiator has no listed mount position in this case.");
      }
    }
  }else if(s.CASE&&s.COOLER&&coolerCap){
    push("RADIATOR_FIT","INFO","AIO radiator","Not applicable — selected cooler does not require a radiator mount.");
  }

  if(s.CASE&&s.PSU){
    const support=caseCap?String(caseCap.psuSupport||"").toUpperCase():null;
    const psuForm=psuFormFactor(psu);
    if(!support){
      push("PSU_FORM_FACTOR","UNVERIFIED","PSU form factor","PSU FORM FACTOR UNVERIFIED — the case has no PSU support record.");
    }else if(!psuForm){
      push("PSU_FORM_FACTOR","UNVERIFIED","PSU form factor","PSU FORM FACTOR UNVERIFIED — could not read a form factor from the PSU.");
    }else if(support==="BOTH"||support===psuForm){
      push("PSU_FORM_FACTOR","PASS","PSU form factor",psuForm+" PSU is supported by this case.");
    }else{
      push("PSU_FORM_FACTOR","WARN","PSU form factor","PSU FORM FACTOR MISMATCH — "+psuForm+" PSU does not fit a case listed for "+support+" PSUs.");
    }
  }

  if(s.COOLER&&cpu){
    const cs=detectCpuSocket(pnNorm(cpu.label||""));
    const sockets=Array.isArray(coolerCap&&coolerCap.sockets)?coolerCap.sockets:[];
    if(!coolerCap||!sockets.length){
      push("CPU_SOCKET","UNVERIFIED","Cooler socket","COOLER SOCKET SUPPORT UNVERIFIED — no socket list recorded for this cooler.");
    }else if(!cs){
      push("CPU_SOCKET","UNVERIFIED","Cooler socket","COOLER SOCKET SUPPORT UNVERIFIED — could not read the CPU socket.");
    }else if(sockets.some(sock=>socketMatches(sock,cs))){
      push("CPU_SOCKET","PASS","Cooler socket","Cooler supports "+cs+".");
    }else{
      push("CPU_SOCKET","FAIL","Cooler socket","CPU SOCKET MISMATCH — cooler socket list ("+sockets.join("/")+") does not include "+cs+".");
    }
  }

  if(s.COOLER&&cpu){
    const demand=cpuThermalDemand(cpu);
    const cap=String(coolerCap&&coolerCap.coolingClass||"").toUpperCase();
    if(!coolerCap){
      push("COOLER_SUFFICIENCY","UNVERIFIED","Cooler coverage","COOLER CAPABILITY UNVERIFIED — no cooler profile recorded.");
    }else if(stockCoolerMatch(cpu,coolerCap,coolerResolved&&coolerResolved.label)){
      push("COOLER_SUFFICIENCY","PASS","Cooler coverage","VERIFIED · OEM STOCK COOLING — this is the AMD stock cooler for this CPU; adequate for stock operation.");
      push("COOLER_OPERATING_NOTE","INFO","Cooling note","Suitable for stock operation — not rated for aggressive overclocking or heavy all-core loads.");
    }else if(demand==="UNKNOWN"){
      push("COOLER_SUFFICIENCY","UNVERIFIED","Cooler coverage","CPU THERMAL DEMAND UNKNOWN — cannot grade cooler coverage.");
    }else if(!PN_COOLING_RANK.hasOwnProperty(cap)){
      push("COOLER_SUFFICIENCY","UNVERIFIED","Cooler coverage","COOLER CLASS UNKNOWN — cannot grade cooler coverage.");
    }else if(PN_COOLING_RANK[cap]>=PN_COOLING_RANK[demand]){
      push("COOLER_SUFFICIENCY","PASS","Cooler coverage","Cooler class ("+cap+") covers the "+demand+" CPU thermal demand.");
    }else{
      push("COOLER_SUFFICIENCY","WARN","Cooler coverage","CPU COOLER CAPABILITY SUSPECT — "+cap+" class cooler looks light for a "+demand+"-demand CPU.");
    }
  }

  if(!s.COOLER&&cpu){
    const separate=cpuRequiresSeparateCooler(cpu);
    if(separate===true) push("MISSING_COOLER","FAIL","Cooler","MISSING COOLER — this CPU requires a separate cooler.");
    else if(separate===false) push("MISSING_COOLER","PASS","Cooler","Bundled stock cooling is normally adequate for this CPU; no aftermarket cooler required.");
    else push("MISSING_COOLER","UNVERIFIED","Cooler","COOLER REQUIREMENT UNVERIFIED — could not determine whether this CPU includes adequate stock cooling.");
  }

  if(s.CASE&&(s.CPU||s.GPU)){
    const airflow=caseCap?String(caseCap.airflow||"").toUpperCase():null;
    const hotGPU=gpu&&gpu.pn&&(gpu.pn.tierIndex!=null&&gpu.pn.tierIndex>=3);
    const hotCPU=cpu&&(PN_COOLING_RANK[cpuThermalDemand(cpu)]||0)>=2;
    if(!airflow||!["POOR","FAIR","GOOD","EXCELLENT"].includes(airflow)){
      push("AIRFLOW","UNVERIFIED","Case airflow","AIRFLOW UNVERIFIED — no airflow class recorded for this case.");
    }else if(airflow==="POOR"||(airflow==="FAIR"&&(hotGPU||hotCPU))){
      push("AIRFLOW","WARN","Case airflow","AIRFLOW MARGINAL — "+airflow+" airflow case"+(hotGPU?" with a high-heat GPU tier build":"")+"; expect warmer component temps.");
    }else{
      push("AIRFLOW","PASS","Case airflow",airflow+" airflow"+(hotGPU?" with a high-heat GPU — watch temps":"")+".");
    }
  }

  if(s.PSU){
    const mp=psuMatchProfile(rig);
    if(mp.final==="NOT APPROVED"){
      push("PSU_SUITABILITY","WARN","PSU suitability","PSU SUITABILITY NOT APPROVED — "+(mp.warnings[0]||"review the PSU choice."));
    }else if(mp.final==="MARGINAL"){
      push("PSU_SUITABILITY","UNVERIFIED","PSU suitability","PSU SUITABILITY UNVERIFIED — "+(mp.warnings[0]||"no catalog-matched PSU record."));
    }else{
      push("PSU_SUITABILITY","PASS","PSU suitability","PSU "+mp.watts+"W grades "+mp.final+" for this GPU baseline.");
    }
  }else if(s.CASE||s.COOLER){
    push("PSU_SUITABILITY","UNVERIFIED","PSU suitability","PSU SUITABILITY UNVERIFIED — no PSU selected.");
  }

  const warnings=checks.filter(c=>c.status!=="PASS").map(c=>c.detail);
  const fails=checks.filter(c=>c.status==="FAIL");
  const warns=checks.filter(c=>c.status==="WARN");
  const unverified=checks.filter(c=>c.status==="UNVERIFIED");
  const passes=checks.filter(c=>c.status==="PASS");
  const verified=checks.filter(c=>c.status==="PASS"||c.status==="INFO");
  let state="UNVERIFIED";
  if(!rigEnclosureScope(rig)){
    state="UNVERIFIED";
  }else if(fails.length||warns.length){
    state="MARGINAL";
  }else if(checks.length&&verified.length===checks.length){
    state="EXCELLENT";
  }else if(checks.length){
    state="SOUND";
  }
  out.state=state;
  out.checks=checks;
  out.warnings=warnings;
  return out;
}

const PNEnclosureCoreCatalogEntriesForSlot=catalogEntriesForSlot;
catalogEntriesForSlot=function(slotKey){
  if(slotKey==="CASE") return HardwareCatalog.cases||[];
  if(slotKey==="COOLER") return HardwareCatalog.coolers||[];
  return PNEnclosureCoreCatalogEntriesForSlot(slotKey);
};

const PNEnclosureCoreCatalogSearchAll=catalogSearchAll;
catalogSearchAll=function(query){
  let out=PNEnclosureCoreCatalogSearchAll(query);
  const r=pnNorm(query);
  if(r.length<2) return out;
  const tokens=r.split(" ").filter(Boolean);
  [["CASE",HardwareCatalog.cases],["COOLER",HardwareCatalog.coolers]].forEach(pair=>{
    (pair[1]||[]).forEach(item=>{
      const label=pnNorm((item.brand||"")+" "+item.model);
      if(pnLabelMatches(label,tokens)) out.push({cat:pair[0],item:item,label:label});
    });
  });
  return out.sort((a,b)=>(a.label.startsWith(r)?0:1)-(b.label.startsWith(r)?0:1)||a.label.localeCompare(b.label)).slice(0,12);
};

const PNEnclosureCoreLoadHardwareCatalog=loadHardwareCatalog;
loadHardwareCatalog=async function(){
  await PNEnclosureCoreLoadHardwareCatalog();
  try{
    const [casesData,coolersData]=await Promise.all([
      fetch("profitnode_case_catalog_v1.json").then(r=>{if(!r.ok)throw Error("case catalog HTTP "+r.status);return r.json()}),
      fetch("profitnode_cooler_catalog_v1.json").then(r=>{if(!r.ok)throw Error("cooler catalog HTTP "+r.status);return r.json()})
    ]);
    HardwareCatalog.cases=casesData.cases||[];
    HardwareCatalog.coolers=coolersData.coolers||[];
    HardwareCatalog.caseError=null;
    HardwareCatalog.coolerError=null;
  }catch(err){
    HardwareCatalog.caseError=err&&err.message?err.message:String(err);
    HardwareCatalog.coolerError=HardwareCatalog.caseError;
    console.warn("PROFITNODE: RIG ENCLOSURE catalogs could not load",err);
  }
  return HardwareCatalog;
};

const PNEnclosureCoreRigWarnings=rigWarnings;
rigWarnings=function(rig){
  return PNEnclosureCoreRigWarnings(rig);
};

function enclosureHelpText(slotKey,label){
  const err=slotKey==="CASE"?HardwareCatalog.caseError:HardwareCatalog.coolerError;
  if(label&&pnNorm(label).length>=2){
    return "No catalog match — set capabilities manually or use a generic profile.";
  }
  return err?("Catalog unavailable: "+escHtml(err)):"Type a model, pick a generic profile, or set capabilities manually.";
}

function renderCaseCapsEditor(caps){
  const ff=caps.formFactors||[];
  const opt=(list,current)=>{
    return '<option value="">—</option>'+list.map(o=>'<option value="'+o.replace(/"/g,"&quot;")+'"'+(String(current||"")===o?" selected":"")+'>'+escHtml(o)+'</option>').join("");
  };
  const radSel=(pos)=>'<label><span>'+pos+' radiator</span><select data-rig-cap-field="CASE.radiator.'+pos+'">'+opt(PN_ENCLOSURE_RADIATOR,(caps.radiator||{})[pos]||"")+'</select></label>';
  return '<details class="pn-cap-details">'+
    '<summary>CASE CAPABILITIES / ADVANCED</summary>'+
    '<div class="pn-cap-grid">'+
      '<label class="pn-cap-check">'+PN_ENCLOSURE_FORM_FACTORS.map(f=>'<span><input type="checkbox" data-rig-cap-field="CASE.formFactor.'+f+'"'+(ff.includes(f)?" checked":"")+'><i>'+PN_ENCLOSURE_FF_LABELS[f]+'</i></span>').join("")+'</label>'+
      '<label><span>Max GPU length mm</span><input type="number" min="0" placeholder="?" data-rig-cap-field="CASE.maxGpuLengthMm" value="'+escAttr(caps.maxGpuLengthMm==null?"":caps.maxGpuLengthMm)+'"></label>'+
      '<label><span>Max cooler height mm</span><input type="number" min="0" placeholder="?" data-rig-cap-field="CASE.maxCoolerHeightMm" value="'+escAttr(caps.maxCoolerHeightMm==null?"":caps.maxCoolerHeightMm)+'"></label>'+
      '<label><span>PSU support</span><select data-rig-cap-field="CASE.psuSupport">'+opt(PN_ENCLOSURE_PSU_FORM,caps.psuSupport)+'</select></label>'+
      '<label><span>Max PSU length mm</span><input type="number" min="0" placeholder="?" data-rig-cap-field="CASE.maxPsuLengthMm" value="'+escAttr(caps.maxPsuLengthMm==null?"":caps.maxPsuLengthMm)+'"></label>'+
      radSel("front")+radSel("top")+radSel("rear")+
      '<label><span>Included fans</span><input type="number" min="0" placeholder="?" data-rig-cap-field="CASE.includedFans" value="'+escAttr(caps.includedFans==null?"":caps.includedFans)+'"></label>'+
      '<label><span>Max fan positions</span><input type="number" min="0" placeholder="?" data-rig-cap-field="CASE.maxFanPositions" value="'+escAttr(caps.maxFanPositions==null?"":caps.maxFanPositions)+'"></label>'+
      '<label><span>Airflow</span><select data-rig-cap-field="CASE.airflow">'+opt(PN_ENCLOSURE_AIRFLOW,caps.airflow)+'</select></label>'+
      '<label><span>Build quality</span><select data-rig-cap-field="CASE.buildQuality">'+opt(PN_ENCLOSURE_BUILD_QUALITY,caps.buildQuality)+'</select></label>'+
      '<label><span>Side panel</span><select data-rig-cap-field="CASE.sidePanel">'+opt(PN_ENCLOSURE_SIDE_PANEL,caps.sidePanel)+'</select></label>'+
      '<label><span>Notes</span><input type="text" data-rig-cap-field="CASE.notes" value="'+escAttr(caps.notes||"")+'"></label>'+
    '</div></details>';
}

function renderCoolerCapsEditor(caps){
  const opt=(list,current)=>{
    return '<option value="">—</option>'+list.map(o=>'<option value="'+o.replace(/"/g,"&quot;")+'"'+(String(current||"")===o?" selected":"")+'>'+escHtml(o)+'</option>').join("");
  };
  const isAio=isAioCaps(caps),isAir=caps.type==="AIR";
  return '<details class="pn-cap-details pn-cooler-details">'+
    '<summary>COOLER DETAILS / ADVANCED</summary>'+
    '<div class="pn-cap-grid">'+
      '<label><span>Type</span><select data-rig-cap-field="COOLER.type">'+opt(PN_ENCLOSURE_COOLER_TYPE,caps.type)+'</select></label>'+
      '<label><span>Supported sockets</span><input type="text" placeholder="* AM4, LGA1700" data-rig-cap-field="COOLER.sockets" value="'+escAttr((caps.sockets||[]).join(", "))+'"></label>'+
      '<label><span>Cooling class</span><select data-rig-cap-field="COOLER.coolingClass">'+opt(PN_ENCLOSURE_COOLING_CLASS,caps.coolingClass)+'</select></label>'+
      (isAir?'<label><span>Air cooler height mm</span><input type="number" min="0" placeholder="?" data-rig-cap-field="COOLER.heightMm" value="'+escAttr(caps.heightMm==null?"":caps.heightMm)+'"></label>':"")+
      (isAio?'<label><span>AIO radiator size</span><select data-rig-cap-field="COOLER.radiator">'+opt(PN_ENCLOSURE_RADIATOR.filter(v=>v!=="none"),caps.radiator||"")+'</select></label>':"")+
    '</div></details>';
}

function renderCaseMeta(caps,confidence){
  const ff=caps.formFactors&&caps.formFactors.length?caps.formFactors.map(f=>PN_ENCLOSURE_FF_LABELS[f]||f).join("/"):"?";
  const gpu=caps.maxGpuLengthMm?caps.maxGpuLengthMm+"mm GPU":"GPU ?";
  const hgt=caps.maxCoolerHeightMm?caps.maxCoolerHeightMm+"mm cooler":"Cooler ?";
  const rad=caseRadText(caps)||"Rads ?";
  return '<div class="rig-catalog-meta">'+
    '<span class="pn-meta-pill"><span>Form</span><b>'+escHtml(ff)+'</b></span>'+
    '<span class="pn-meta-pill"><span>Airflow</span><b>'+escHtml(caps.airflow||"?")+'</b></span>'+
    '<span class="pn-meta-pill"><span>Panel</span><b>'+escHtml(caps.sidePanel||"?")+'</b></span>'+
    '<span class="pn-meta-detail">'+escHtml(gpu+" · "+hgt+" · "+rad)+(confidence==="LOW"?' <span style="color:var(--amber)">· approx spec</span>':"")+'</span>'+
    '</div>';
}

function coolerFitStatus(rig){
  if(!rig) return "UNVERIFIED";
  const ids=["CPU_SOCKET","COOLER_SUFFICIENCY","COOLER_HEIGHT","RADIATOR_FIT","MISSING_COOLER"];
  const hits=rigIntegrity(rig).checks.filter(c=>ids.includes(c.id));
  if(hits.some(c=>c.status==="FAIL")) return "FAIL";
  if(hits.some(c=>c.status==="WARN")) return "WARNING";
  if(!hits.length||hits.some(c=>c.status==="UNVERIFIED")) return "UNVERIFIED";
  return "PASS";
}

function renderCoolerMeta(caps,confidence,rig){
  const sock=caps.sockets&&caps.sockets.length?caps.sockets.join("/"):"Sockets unverified";
  const size=caps.type==="AIO"?(caps.radiator?caps.radiator+"mm rad":"AIO"):(caps.heightMm?caps.heightMm+"mm":"Height ?");
  const fit=coolerFitStatus(rig),fitClass=fit==="PASS"?"is-pass":fit==="FAIL"?"is-fail":fit==="WARNING"?"is-warn":"is-unverified";
  return '<div class="rig-catalog-meta">'+
    '<span class="pn-cooler-summary">'+escHtml((caps.type||"?")+" · "+sock+" · "+(caps.coolingClass||"?")+" · "+size)+(confidence==="LOW"?' <span style="color:var(--amber)">· approx spec</span>':"")+'</span>'+
    '<span class="pn-cooler-fit '+fitClass+'">FIT: '+fit+'</span>'+
    '</div>';
}

function enclosureSourceTag(slot){
  const src=slot&&slot.source;
  const tag=src==="CATALOG"?"CATALOG MATCH":src==="GENERIC"?"GENERIC PROFILE":src==="MANUAL"?"MANUAL CUSTOM":"";
  return tag?'<span class="pn-meta-pill pn-cap-source"><span>Source</span><b>'+escHtml(tag)+'</b></span>':"";
}

function renderCasePlannedDetail(slot){
  const caps=caseCapabilities(slot,slot&&slot.label);
  const entry=caseEntryFor(slot);
  const label=slot&&slot.label||"";
  const results=entry?[]:catalogSearch("CASE",label);
  const searchBox='<div class="rig-catalog-fields"><input type="text" placeholder="Type 2+ characters to search Case… or type a custom model" data-rig-catalog-item="CASE" value="'+escAttr(label)+'" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="'+(results.length?"true":"false")+'">'+
    (results.length?'<div class="rig-catalog-results" role="listbox">'+results.map(item=>{
      const value=item.brand+" "+item.model;
      return '<button type="button" class="rig-catalog-option" role="option" data-rig-catalog-choice="CASE" data-rig-catalog-value="'+escAttr(value)+'">'+
        '<span class="rig-option-name">'+escHtml(value)+'</span>'+
        '<span class="pn-result-badges"><span class="pn-result-rating">'+escHtml((item.caps&&item.caps.airflow)||"CASE")+'</span></span></button>';
    }).join("")+'</div>':"")+'</div>';
  const genericSel='<select data-rig-generic="CASE" title="Fill a generic capability profile when you don’t have the exact model">'+
    '<option value="">— Generic profile —</option>'+
    PN_GENERIC_CASES.map(p=>'<option value="'+escAttr(p.id)+'"'+(slot.genericId===p.id?" selected":"")+'>'+escHtml(p.label)+'</option>').join("")+
    '</select>';
  const metaHtml=(caps&&!isEmptyCaseCaps(caps))
    ?renderCaseMeta(caps,entry&&entry.confidence)+enclosureSourceTag(slot)
    :'<div class="rig-catalog-meta rig-catalog-help">'+escHtml(enclosureHelpText("CASE",label))+'</div>';
  return searchBox+genericSel+metaHtml+renderCaseCapsEditor(caps||normalizeCaseCaps({}));
}

function renderCoolerPlannedDetail(slot,rig){
  const caps=coolerCapabilities(slot,slot&&slot.label);
  const entry=coolerEntryFor(slot);
  const label=slot&&slot.label||"";
  const results=entry?[]:catalogSearch("COOLER",label);
  const searchBox='<div class="rig-catalog-fields"><input type="text" placeholder="Type 2+ characters to search Cooler… or type a custom model" data-rig-catalog-item="COOLER" value="'+escAttr(label)+'" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="'+(results.length?"true":"false")+'">'+
    (results.length?'<div class="rig-catalog-results" role="listbox">'+results.map(item=>{
      const value=item.brand+" "+item.model;
      const itemCaps=normalizeCoolerCaps(item.caps||{});
      const lead=(itemCaps.type||"COOLER")+" · "+(itemCaps.coolingClass||"UNVERIFIED");
      return '<button type="button" class="rig-catalog-option" role="option" data-rig-catalog-choice="COOLER" data-rig-catalog-value="'+escAttr(value)+'">'+
        '<span class="rig-option-name">'+escHtml(value)+'</span>'+
        '<span class="pn-result-badges"><span class="pn-result-rating">'+escHtml(lead)+'</span></span></button>';
    }).join("")+'</div>':"")+'</div>';
  const metaHtml=(caps&&!isEmptyCoolerCaps(caps))
    ?renderCoolerMeta(caps,entry&&entry.confidence,rig)
    :'<div class="rig-catalog-meta rig-catalog-help">'+escHtml(enclosureHelpText("COOLER",label))+'</div>';
  return searchBox+metaHtml+renderCoolerCapsEditor(caps||normalizeCoolerCaps({}));
}

const PNEnclosureCoreRenderRigSlotRow=renderRigSlotRow;
renderRigSlotRow=function(slotKey,rig){
  if(slotKey!=="CASE"&&slotKey!=="COOLER") return PNEnclosureCoreRenderRigSlotRow(slotKey,rig);
  const slot=rig.slots&&rig.slots[slotKey];
  if(slot&&slot.kind&&slot.kind!=="EMPTY"&&!slot.catalogType) slot.catalogType=slotKey;
  const kind=slot?slot.kind:"EMPTY";
  const mode=kind==="CATALOG"?"PLANNED":kind;
  const cat=slotKey==="CASE"?"CASE":"COOLING";
  const inventory=rigSlotOptionsForCategory(cat);
  const modeSelect='<select data-rig-slot-mode="'+slotKey+'">'+
    '<option value="EMPTY"'+(mode==="EMPTY"?" selected":"")+'>Empty</option>'+
    '<option value="INVENTORY"'+(mode==="INVENTORY"?" selected":"")+'>From Inventory</option>'+
    '<option value="PLANNED"'+(mode==="PLANNED"?" selected":"")+'>Planned Part</option>'+
    '</select>';
  let detail="";
  if(kind==="INVENTORY"){
    const resolved=rigSlotResolved(slot,rig.currency,slotKey);
    detail='<select data-rig-slot-item="'+slotKey+'"><option value="">— select '+cat.toLowerCase()+' —</option>'+
      inventory.map(item=>{
        const inUse=item.assignedRigId&&item.assignedRigId!==rig.id;
        const status=item.status&&["IN_BUILD","IN_RIG","LISTED"].includes(item.status);
        return '<option value="'+item.id+'"'+(slot&&slot.inventoryItemId===item.id?" selected":"")+'>'+
          escHtml(item.manufacturer+" "+item.model)+" ("+money(item.purchasePrice,item.currency)+")"+(inUse?" — IN USE":status?" — "+STATUS_LABEL(item.status):"")+'</option>';
      }).join("")+'</select>';
    if(resolved){
      const caps=slotKey==="CASE"?caseCapabilities(slot,resolved.label):coolerCapabilities(slot,resolved.label);
      if(caps&&!(slotKey==="CASE"?isEmptyCaseCaps(caps):isEmptyCoolerCaps(caps))){
        const entry=slotKey==="CASE"?caseEntryFor(slot):coolerEntryFor(slot);
        detail+=slotKey==="CASE"?renderCaseMeta(caps,entry&&entry.confidence)+enclosureSourceTag(slot):renderCoolerMeta(caps,entry&&entry.confidence,rig);
      }
    }
  }else if(kind==="PLANNED"||kind==="CATALOG"){
    detail=slotKey==="CASE"?renderCasePlannedDetail(slot):renderCoolerPlannedDetail(slot,rig);
  }else{
    const quick=soleUnassignedMatch(cat);
    detail='<div class="rig-empty-slot">'+escHtml(rigEmptySlotLabel(slotKey))+'</div>'+
      (quick?'<button type="button" class="btn btn-sm" style="margin-top:6px" data-rig-slot-quickfill="'+slotKey+":"+quick.id+'">+ USE '+escHtml(quick.manufacturer+" "+quick.model)+"</button>":"");
  }
  const resolved=rigSlotResolved(slot,rig.currency,slotKey);
  const priceInput=(field,label)=>slot?
    '<input class="rig-price-input" type="number" step="0.01" min="0" aria-label="'+label+' for '+RIG_SLOT_LABELS[slotKey]+'" '+
    (kind==="INVENTORY"?'readonly title="Managed from Inventory"':'data-rig-slot-field="'+slotKey+'.'+field+'"')+
    ' value="'+escAttr(resolved?resolved[field]:slot[field]||0)+'">':"—";
  const copyBtn=rig.id?'<button type="button" class="btn btn-sm btn-ghost" data-rig-copy-slot-to-family="'+slotKey+'" title="Copy this slot to every other variant in this family">→ FAMILY</button>':"";
  return '<div class="rig-slot-row"><div class="rig-slot-label pn-cat-label '+categoryColorClass(RIG_SLOT_CATEGORY[slotKey])+'">'+RIG_SLOT_LABELS[slotKey]+'</div><div class="rig-slot-control">'+modeSelect+
    '<div class="rig-slot-detail">'+detail+'</div></div>'+
    '<div class="rig-slot-price" data-label="PAID PRICE">'+priceInput("cost","Paid price")+'</div>'+
    '<div class="rig-slot-price is-secondary" data-label="ORIGINAL PRICE">'+priceInput("originalPrice","Original price")+'</div>'+
    '<div class="rig-slot-actions">'+copyBtn+'</div></div>';
};

const PNEnclosureCoreRenderRigEditor=renderRigEditor;
renderRigEditor=PNEnclosureCoreRenderRigEditor;

document.addEventListener("click",function(e){
  const choice=e.target.closest("[data-rig-catalog-choice]");
  if(!choice||!state||!state.rigDraft) return;
  const k=choice.dataset.rigCatalogChoice;
  if(k!=="CASE"&&k!=="COOLER") return;
  const slot=state.rigDraft.slots[k];
  if(!slot) return;
  const entry=catalogFind(k,choice.dataset.rigCatalogValue);
  if(entry){
    slot.caps=k==="CASE"?normalizeCaseCaps(entry.caps||{}):normalizeCoolerCaps(entry.caps||{});
    slot.source="CATALOG";
    slot.genericId=null;
    slot.catalogKey=catalogKey(k,entry);
  }
  render();
});

document.addEventListener("change",function(e){
  const gen=e.target.closest("select[data-rig-generic]");
  if(gen&&state&&state.rigDraft){
    const k=gen.dataset.rigGeneric;
    let slot=state.rigDraft.slots[k];
    if(!slot) slot=state.rigDraft.slots[k]={kind:"PLANNED",catalogType:k,cost:0,originalPrice:0,currency:state.rigDraft.currency};
    slot.kind="PLANNED";
    slot.catalogType=k;
    slot.catalogKey=null;
    const id=gen.value;
    if(id){
      const preset=k==="CASE"?caseGenericById(id):coolerGenericById(id);
      if(preset){
        slot.source="GENERIC";
        slot.genericId=id;
        slot.label=preset.label;
        slot.caps=k==="CASE"?normalizeCaseCaps(preset.caps):normalizeCoolerCaps(preset.caps);
      }
    }else{
      slot.genericId=null;
      slot.source=slot.source==="GENERIC"?null:slot.source;
    }
    return void render();
  }
  const capSel=e.target.closest("select[data-rig-cap-field]");
  if(capSel&&state&&state.rigDraft){
    const path=capSel.dataset.rigCapField.split(".");
    const k=path[0];
    const slot=state.rigDraft.slots[k];
    if(!slot) return;
    slot.caps=slot.caps||(k==="CASE"?normalizeCaseCaps({}):normalizeCoolerCaps({}));
    slot.source="MANUAL";
    slot.genericId=null;
    setDeepOn(slot.caps,path.slice(1).join("."),capSel.value||null);
    return void render();
  }
  const capCheck=e.target.closest("input[data-rig-cap-field][type=checkbox]");
  if(capCheck&&state&&state.rigDraft){
    const path=capCheck.dataset.rigCapField.split(".");
    const k=path[0],field=path[1],value=path.slice(2).join(".");
    const slot=state.rigDraft.slots[k];
    if(!slot) return;
    slot.caps=slot.caps||(k==="CASE"?normalizeCaseCaps({}):normalizeCoolerCaps({}));
    slot.source="MANUAL";
    slot.genericId=null;
    if(field==="formFactor"){
      const list=Array.isArray(slot.caps.formFactors)?slot.caps.formFactors.slice():[];
      const idx=list.indexOf(value);
      if(capCheck.checked&&idx<0) list.push(value);
      if(!capCheck.checked&&idx>=0) list.splice(idx,1);
      slot.caps.formFactors=list;
      slot.catalogKey=null;
    }
    return void render();
  }
});

document.addEventListener("input",function(e){
  const cap=e.target.closest("input[data-rig-cap-field]");
  if(!cap||cap.type==="checkbox"||!state||!state.rigDraft) return;
  const path=cap.dataset.rigCapField.split(".");
  const k=path[0],field=path[1];
  const slot=state.rigDraft.slots[k];
  if(!slot) return;
  slot.caps=slot.caps||(k==="CASE"?normalizeCaseCaps({}):normalizeCoolerCaps({}));
  slot.source="MANUAL";
  slot.genericId=null;
  let v=cap.value;
  if(cap.type==="number") v=(v===""||v==null)?null:parseFloat(v);
  if(field==="sockets"){
    slot.caps.sockets=stringToSockets(v);
  }else if(path.length>2){
    setDeepOn(slot.caps,path.slice(1).join("."),v);
  }else{
    slot.caps[field]=v;
  }
  render();
  const ag=document.querySelector('[data-rig-cap-field="'+cap.dataset.rigCapField+'"]');
  if(ag&&ag.focus&&ag.setSelectionRange){
    try{ag.focus();ag.setSelectionRange(String(ag.value).length,String(ag.value).length);}catch(err){}
  }
});

window.__pnEnclosure={
  integrity:rigIntegrity,
  caseCapabilities:caseCapabilities,
  coolerCapabilities:coolerCapabilities,
  caseCapsText:caseCapsText,
  coolerCapsText:coolerCapsText,
  cpuThermalDemand:cpuThermalDemand,
  cpuRequiresSeparateCooler:cpuRequiresSeparateCooler,
  coolerFitStatus:coolerFitStatus,
  gpuLengthMm:gpuLengthMm,
  gpuLengthProfile:gpuLengthProfile,
  gpuEnvelopes:PN_GPU_GENERIC_ENVELOPES,
  psuFormFactor:psuFormFactor,
  normalizeCaseCaps:normalizeCaseCaps,
  normalizeCoolerCaps:normalizeCoolerCaps,
  genericCases:PN_GENERIC_CASES,
  genericCoolers:PN_GENERIC_COOLERS,
  formFactors:PN_ENCLOSURE_FORM_FACTORS
};

const enclosureStyle=document.createElement("style");
enclosureStyle.textContent=`
.pn-cap-details{margin-top:8px;border:1px solid var(--border);border-radius:var(--radius)}
.pn-cap-details summary{cursor:pointer;padding:7px 10px;font-family:var(--mono);font-size:9px;letter-spacing:.08em;color:var(--muted)}
.pn-cap-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;padding:8px 10px 10px;border-top:1px solid var(--border)}
.pn-cap-grid label{display:flex;flex-direction:column;gap:3px;min-width:0}
.pn-cap-grid label>span{color:var(--muted);font-size:8px;letter-spacing:.06em;font-weight:800}
.pn-cap-grid input,.pn-cap-grid select{width:100%}
.pn-cooler-details .pn-cap-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
.pn-cooler-summary{color:var(--text-dim)}
.pn-cooler-fit{font-weight:900;letter-spacing:.05em}
.pn-cooler-fit.is-pass{color:var(--sem-positive)}
.pn-cooler-fit.is-warn{color:var(--sem-warning)}
.pn-cooler-fit.is-fail{color:var(--sem-fail)}
.pn-cooler-fit.is-unverified{color:var(--sem-neutral)}
.pn-cap-check{display:flex!important;flex-direction:row!important;align-items:baseline;gap:8px!important;flex-wrap:wrap}
.pn-cap-check>span{display:inline-flex;align-items:center;gap:4px;font-size:9px}
.pn-cap-check input{width:auto!important}
.pn-cap-check i{font-style:normal;color:var(--muted)}
.pn-cap-source{border-color:var(--performance-dim);background:var(--performance-wash)}
.pn-cap-source b{color:var(--performance)}
.pn-integrity-list{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.pn-integrity-row{display:flex;gap:10px;align-items:baseline;border-left:2px solid var(--border);border-radius:0 var(--radius) var(--radius) 0;padding:5px 9px;background:rgba(13,10,17,.55)}
.pn-integrity-row b{color:var(--muted);font-size:8px;letter-spacing:.06em;white-space:nowrap;min-width:92px}
.pn-integrity-row span{font-family:var(--mono);font-size:9px;color:var(--text)}
.pn-integrity-row.is-pass{border-left-color:var(--green-dim)}
.pn-integrity-row.is-pass b{color:var(--green)}
.pn-integrity-row.is-warn{border-left-color:var(--sem-warning)}
.pn-integrity-row.is-warn b,.pn-integrity-row.is-warn span{color:var(--sem-warning)}
.pn-integrity-row.is-unverified{border-left-color:var(--muted)}
  .pn-integrity-row.is-info{border-left-color:var(--sem-neutral)}
  .pn-integrity-row.is-info b,.pn-integrity-row.is-info span{color:var(--sem-neutral)}
@media(max-width:640px){.pn-cap-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(enclosureStyle);
