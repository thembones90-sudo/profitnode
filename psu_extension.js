"use strict";

/* PROFITNODE PSU Foundation v1 integration.
   Loaded after app_core.js by the tiny app.js bootstrap.
   Keeps PSU quality/safety separate from gaming performance. */

HardwareCatalog.psus = HardwareCatalog.psus || [];
HardwareCatalog.gpuPsuRequirements = HardwareCatalog.gpuPsuRequirements || [];
HardwareCatalog.psuError = null;

const PNCoreCatalogEntriesForSlot = catalogEntriesForSlot;
catalogEntriesForSlot = function(slotKey){
  if (slotKey === "PSU") return HardwareCatalog.psus || [];
  return PNCoreCatalogEntriesForSlot(slotKey);
};

const PNCoreCatalogSearchAll = catalogSearchAll;
catalogSearchAll = function(query){
  const r = pnNorm(query);
  if (r.length < 2) return [];
  const cats = [
    ["CPU",HardwareCatalog.cpus],
    ["GPU",HardwareCatalog.gpus],
    ["MOTHERBOARD",HardwareCatalog.boards],
    ["RAM",HardwareCatalog.ramFamilies],
    ["PSU",HardwareCatalog.psus],
    ["STORAGE",HardwareCatalog.storage]
  ];
  let out = [];
  cats.forEach(pair=>{
    const cat=pair[0], list=pair[1]||[];
    list.forEach(item=>{
      const label=pnNorm((item.brand||"")+" "+item.model);
      if(label.includes(r)) out.push({cat,item,label});
    });
  });
  return out.sort((a,b)=>(a.label.startsWith(r)?0:1)-(b.label.startsWith(r)?0:1)||a.label.localeCompare(b.label)).slice(0,10);
};

const PNCoreRenderCatalogMeta = renderCatalogMeta;
renderCatalogMeta = function(slotKey,item,slot){
  if(slotKey!=="PSU") return PNCoreRenderCatalogMeta(slotKey,item,slot);
  const quality=Number(item.quality_score)||0;
  const qClass=item.quality_class||"UNKNOWN";
  const safety=item.safety_status||"UNVERIFIED";
  const atx=item.atx_spec||"ATX ?";
  const eff=item.efficiency_cert||"EFFICIENCY ?";
  const mod=item.modularity||"MODULARITY ?";
  const tone=safety==="REJECT"?"pn-psu-reject":safety==="CAUTION"?"pn-psu-caution":safety==="APPROVED"?"pn-psu-approved":"pn-psu-acceptable";
  return '<div class="rig-catalog-meta">'+
    '<span class="pn-meta-pill pn-psu-quality"><span>Quality</span><b>'+quality+'</b></span>'+
    '<span class="pn-meta-pill"><span>Class</span><b>'+escHtml(qClass)+'</b></span>'+
    '<span class="pn-meta-pill '+tone+'"><span>Safety</span><b>'+escHtml(safety)+'</b></span>'+
    '<span class="pn-meta-detail">'+item.wattage_w+'W · '+escHtml(atx)+' · '+escHtml(eff)+' · '+escHtml(mod)+'</span>'+
    '</div>';
};

const PNCoreLoadHardwareCatalog = loadHardwareCatalog;
loadHardwareCatalog = async function(){
  await PNCoreLoadHardwareCatalog();
  try{
    const [psuData,gpuPsuData]=await Promise.all([
      fetch("profitnode_psu_catalog_v1.json").then(r=>{if(!r.ok)throw Error("PSU catalog HTTP "+r.status);return r.json()}),
      fetch("profitnode_gpu_psu_requirements_v1.json").then(r=>{if(!r.ok)throw Error("GPU/PSU requirements HTTP "+r.status);return r.json()})
    ]);
    let psuRows=psuData.rows||[];
    if(psuData.shards&&psuData.shards.length){
      const shardData=await Promise.all(psuData.shards.map(file=>fetch(file).then(r=>{if(!r.ok)throw Error("PSU shard HTTP "+r.status+": "+file);return r.json()})));
      psuRows=shardData.flatMap(x=>x.rows||[]);
    }
    HardwareCatalog.psus=psuData.psus||((psuData.fields&&psuRows)?psuRows.map(row=>{
      const obj={}; psuData.fields.forEach((key,i)=>obj[key]=row[i]); return obj;
    }):[]);
    HardwareCatalog.gpuPsuRequirements=gpuPsuData.gpus||[];
    HardwareCatalog.psuError=null;
  }catch(err){
    HardwareCatalog.psuError=err&&err.message?err.message:String(err);
    console.warn("PROFITNODE: PSU Foundation v1 could not load",err);
  }
  return HardwareCatalog;
};

function gpuPsuRequirement(gpuResolved){
  if(!gpuResolved) return null;
  const exact=gpuResolved.pn&&gpuResolved.pn.data&&gpuResolved.pn.data.model;
  const target=pnNorm(exact||gpuResolved.label||"");
  if(!target) return null;
  const list=HardwareCatalog.gpuPsuRequirements||[];
  return list.find(x=>pnNorm(x.model)===target)||
         list.find(x=>target.includes(pnNorm(x.model))||pnNorm(x.model).includes(target))||null;
}

function psuResolvedWattage(psuResolved){
  if(!psuResolved) return null;
  const data=psuResolved.pn&&psuResolved.pn.data;
  if(data&&Number(data.wattage_w)) return Number(data.wattage_w);
  const m=String(psuResolved.label||"").match(/(\d{3,4})\s*W\b/i);
  return m?Number(m[1]):null;
}

function gpuConnectorNeed(req){
  if(!req) return {kind:"UNKNOWN",count:0,ambiguous:true};
  const raw=String(req.power_connectors_reference||"");
  const u=raw.toUpperCase();
  if(/NO AUXILIARY|NO EXTERNAL|NO ADDITIONAL POWER/.test(u)) return {kind:"NONE",count:0,ambiguous:false};
  const ambiguous=/AIB-DEPENDENT|TYPICAL|SOME AIB|DEPENDING ON CARD|MAY USE|VARIES/.test(u);
  const needs16=/12V-2X6|12VHPWR|16-PIN|PCIE GEN5 CABLE/.test(u);
  let count=0;
  for(const m of raw.matchAll(/(\d+)\s*x\s*(?:PCIe\s*)?(?:8|6)\s*-?\s*pin/ig)) count+=Number(m[1])||0;
  if(!count){
    const m=raw.match(/(\d+)\s*x\s*PCIe\s*8-pin/i);
    if(m) count=Number(m[1])||0;
  }
  return {kind:needs16?"ALT16":"PCIE",count,ambiguous,raw};
}

function psuConnectorStatus(psuData,req){
  if(!req) return {status:"UNVERIFIED",detail:"No GPU connector baseline available."};
  const need=gpuConnectorNeed(req);
  if(need.kind==="NONE") return {status:"PASS",detail:"Reference GPU requires no auxiliary connector."};
  if(need.ambiguous) return {status:"UNVERIFIED",detail:"GPU connector layout varies by AIB model."};
  if(!psuData||psuData.connector_data_confidence!=="OFFICIAL"){
    return {status:"UNVERIFIED",detail:"Exact PSU connector count is not officially verified in PN."};
  }
  const pcie=Number(psuData.pcie_6_2_connectors)||0;
  const pin16=Number(psuData.pcie_16pin_connectors)||0;
  if(need.kind==="ALT16"&&pin16>0) return {status:"PASS",detail:"Native 16-pin GPU power available."};
  if(need.count>0){
    if(pcie>=need.count) return {status:"PASS",detail:pcie+" PCIe 6+2 connectors available; "+need.count+" required by reference GPU."};
    return {status:"MISMATCH",detail:"Reference GPU needs "+need.count+" PCIe power plugs; PSU has "+pcie+" officially listed."};
  }
  if(need.kind==="ALT16"&&pin16<1) return {status:"UNVERIFIED",detail:"GPU accepts a high-power adapter/native 16-pin path; verify the exact cable arrangement."};
  return {status:"UNVERIFIED",detail:"Could not normalize the GPU connector requirement."};
}

function psuMatchProfile(rig){
  const currency=rig.currency||"RSD";
  const psu=rigSlotResolved(rig.slots.PSU,currency,"PSU");
  const gpu=rigSlotResolved(rig.slots.GPU,currency,"GPU");
  const req=gpuPsuRequirement(gpu);
  if(!psu){
    return {
      selected:false,final:"NOT APPROVED",wattageStatus:"NO PSU",connectorStatus:"UNVERIFIED",
      qualityClass:"UNKNOWN",qualityScore:null,safety:"UNVERIFIED",headroom:"NONE",
      requirement:req,warnings:["NO PSU SELECTED."]
    };
  }

  const data=psu.pn&&psu.pn.data&&psu.pn.type==="PSU"?psu.pn.data:null;
  const watts=psuResolvedWattage(psu);
  const qualityScore=data?Number(data.quality_score)||null:null;
  const qualityClass=data&&data.quality_class||"UNKNOWN";
  const safety=data&&data.safety_status||"UNVERIFIED";
  const connector=psuConnectorStatus(data,req);
  let wattageStatus="UNVERIFIED",headroom="UNKNOWN";
  const warnings=[];

  if(!watts){
    wattageStatus="UNKNOWN";
    warnings.push("PSU WATTAGE UNKNOWN — PROFITNODE could not read a wattage from the selected PSU.");
  }else if(req){
    const min=Number(req.reference_minimum_psu_w)||0;
    const zoneMin=Number(req.pn_suggested_psu_min_w)||min;
    const zoneMax=Number(req.pn_suggested_psu_max_w)||zoneMin;
    if(watts<min){
      wattageStatus="BELOW MINIMUM";
      headroom="LOW";
      warnings.push("CRITICAL: PSU BELOW GPU MINIMUM — "+watts+"W selected; "+min+"W reference minimum for "+req.model+".");
    }else if(watts<zoneMin){
      wattageStatus="MINIMUM RANGE";
      headroom="LOW";
      warnings.push("PSU is in the minimum range — valid baseline, but PROFITNODE prefers "+zoneMin+"–"+zoneMax+"W for "+req.model+".");
    }else if(watts<=zoneMax){
      wattageStatus="RECOMMENDED";
      headroom="GOOD";
    }else{
      wattageStatus="ABOVE ZONE";
      headroom="HIGH";
    }
  }else{
    headroom=watts?"UNVERIFIED":"UNKNOWN";
    if(gpu) warnings.push("GPU PSU REQUIREMENT UNAVAILABLE — verify the selected GPU/PSU combination manually.");
  }

  if(!data){
    warnings.push("PSU QUALITY UNVERIFIED — this PSU is not matched to the PROFITNODE PSU catalog.");
  }else{
    if(safety==="REJECT") warnings.push("CRITICAL: PSU SAFETY STATUS REJECT — do not approve this unit for the rig.");
    else if(safety==="CAUTION") warnings.push("PSU SAFETY STATUS CAUTION — restrict to appropriate low-demand hardware and verify condition.");
    if(data.connector_data_confidence==="DERIVED") warnings.push("PSU CONNECTOR DATA UNVERIFIED — family-level connector estimate cannot produce a hard compatibility PASS.");
  }

  if(connector.status==="MISMATCH") warnings.push("CRITICAL CONNECTOR MISMATCH — "+connector.detail);
  else if(connector.status==="UNVERIFIED"&&gpu&&req) warnings.push("GPU POWER CONNECTORS UNVERIFIED — "+connector.detail);

  let final="MARGINAL";
  if(safety==="REJECT"||wattageStatus==="BELOW MINIMUM"||connector.status==="MISMATCH"){
    final="NOT APPROVED";
  }else if(!watts||!data||safety==="CAUTION"){
    final="MARGINAL";
  }else if(safety==="APPROVED"&&wattageStatus==="RECOMMENDED"&&connector.status==="PASS"){
    final="EXCELLENT";
  }else if((safety==="APPROVED"||safety==="ACCEPTABLE")&&
           ["MINIMUM RANGE","RECOMMENDED","ABOVE ZONE","UNVERIFIED"].includes(wattageStatus)&&
           connector.status!=="MISMATCH"){
    final="GOOD";
  }

  return {
    selected:true,psu,gpu,psuData:data,requirement:req,watts,
    qualityScore,qualityClass,safety,connectorStatus:connector.status,connectorDetail:connector.detail,
    wattageStatus,headroom,final,warnings
  };
}

/* PSU safety belongs in warnings/quality, not in the raw gaming performance score. */
rigPenaltyProfile = function(e,t){
  let a=0;
  const r=[];
  const n=s=>{const l=rigSlotResolved(e.slots[s],t,s);return pnNorm(l&&l.label)};
  const s=n("RAM"),o=n("STORAGE"),i=n("COOLER");
  const c=rigSlotResolved(e.slots.CPU,t,"CPU");
  const u=e.slots.RAM&&e.slots.RAM.ram;
  if(u){
    const cap=Number(u.totalCapacity)||Number(u.moduleCount||0)*Number(u.perModuleCapacity||0);
    if(cap&&cap<16){a+=5;r.push("RAM below 16 GB limits this gaming-rig class.")}
    if(Number(u.moduleCount)===1){a+=3;r.push("Single-channel RAM reduces practical gaming balance.")}
    if(/MIXED|MISMATCH/.test(pnNorm((u.notes||"")+" "+(u.model||"")))) r.push("RAM configuration appears to use mismatched modules — verify capacity, speed, timings and voltage match.");
  }else if(s){
    const cap=parseInt((s.match(/(\d+)\s*GB/)||[])[1]||0,10);
    if(cap&&cap<16){a+=5;r.push("RAM below 16 GB limits this gaming-rig class.")}
    if(/SINGLE CHANNEL|1X\s*\d+\s*GB/.test(s)){a+=3;r.push("Single-channel RAM reduces practical gaming balance.")}
  }
  if(o){
    if(/\bHDD\b/.test(o)&&!/SSD|NVME/.test(o)){a+=4;r.push("HDD-ONLY PRIMARY — add an SSD or NVMe boot drive.");}
  }else a+=6;
  if(!i&&c&&c.pn&&c.pn.tierIndex>=3) a+=3;
  return {points:a,warnings:r};
};

rigWarnings = function(e){
  const t=e.currency||"RSD",a=r=>rigSlotResolved(e.slots[r],t,r),n=e=>e?String(e.label||"").toUpperCase():"",s=[];
  const l=a("CPU"),o=a("GPU"),i=a("RAM"),c=a("MOBO"),u=a("CASE"),p=a("COOLER"),m=a("STORAGE"),v=STORAGE_SLOT_KEYS.slice(1).map(a).filter(Boolean);
  if(l&&c){
    const cs=detectCpuSocket(n(l)),ms=detectMoboSocket(n(c));
    if(cs&&ms&&cs!==ms) s.push("CPU platform ("+cs+") doesn't match the motherboard platform ("+ms+") — check socket compatibility.");
  }
  if(i&&c){
    const rm=/DDR5/.test(n(i))?"DDR5":/DDR4/.test(n(i))?"DDR4":/DDR3/.test(n(i))?"DDR3":null;
    const mm=/DDR5/.test(n(c))?"DDR5":/DDR4/.test(n(c))?"DDR4":/DDR3/.test(n(c))?"DDR3":null;
    if(rm&&mm&&rm!==mm) s.push("RAM is "+rm+" but the motherboard listing mentions "+mm+" — verify memory compatibility.");
  }
  if(c&&u){
    const cf=detectFormFactor(n(c)),uf=detectFormFactor(n(u)),rank={ITX:0,MATX:1,ATX:2,EATX:3};
    if(cf&&uf&&rank[cf]>rank[uf]) s.push("Motherboard form factor ("+cf+") may not fit the selected case ("+uf+").");
  }

  s.push(...psuMatchProfile(e).warnings);

  if(!m) s.push("No primary storage selected.");
  const gen=c?detectMoboPcieGeneration(n(c)):null;
  [m].concat(v).forEach(drive=>{
    const dg=storagePcieGeneration(drive);
    if(dg&&gen&&dg>gen) s.push("COMPATIBLE — PCIe SPEED LIMITED: "+drive.label+" is Gen "+dg+" on a Gen "+gen+" motherboard platform.");
  });
  if(!p&&l&&(/-K\b|\bKF?\b/.test(n(l))||/X3D\b|RYZEN\s?[579]\s?\d{3,4}X\b/.test(n(l)))) s.push("No cooler selected — this CPU likely doesn't ship with a bundled cooler.");
  if(!o&&l){
    const ig=cpuLikelyHasIGPU(n(l));
    if(ig===false) s.push("No GPU selected and the CPU likely has no integrated graphics — this rig may have no video output.");
  }
  return s.concat(rigHardwareProfile(e).warnings);
};

const PNCoreRenderRigSlotRow = renderRigSlotRow;
renderRigSlotRow = function(slotKey,rig){
  if(slotKey!=="PSU") return PNCoreRenderRigSlotRow(slotKey,rig);

  const slot=rig.slots.PSU;
  if(slot&&slot.kind==="PLANNED"&&!slot.catalogType) slot.catalogType="PSU";
  const kind=slot?slot.kind:"EMPTY";
  const mode=kind==="CATALOG"?"PLANNED":kind;
  const inventory=rigSlotOptionsForCategory("PSU");
  const modeSelect='<select data-rig-slot-mode="PSU">'+
    '<option value="EMPTY"'+(mode==="EMPTY"?" selected":"")+'>Empty</option>'+
    '<option value="INVENTORY"'+(mode==="INVENTORY"?" selected":"")+'>From Inventory</option>'+
    '<option value="PLANNED"'+(mode==="PLANNED"?" selected":"")+'>Planned Part</option>'+
    '</select>';

  let detail="";
  if(kind==="INVENTORY"){
    const resolved=rigSlotResolved(slot,rig.currency,"PSU");
    detail='<select data-rig-slot-item="PSU"><option value="">— select psu —</option>'+
      inventory.map(item=>{
        const inUse=item.assignedRigId&&item.assignedRigId!==rig.id;
        const status=item.status&&["IN_BUILD","IN_RIG","LISTED"].includes(item.status);
        return '<option value="'+item.id+'"'+(slot&&slot.inventoryItemId===item.id?" selected":"")+'>'+
          escHtml(item.manufacturer+" "+item.model)+" ("+money(item.purchasePrice,item.currency)+")"+
          (inUse?" — IN USE":status?" — "+STATUS_LABEL(item.status):"")+
          '</option>';
      }).join("")+'</select>';
    if(resolved&&resolved.pn&&resolved.pn.data) detail+=renderCatalogMeta("PSU",resolved.pn.data,slot);
  }else if(kind==="PLANNED"||kind==="CATALOG"){
    const match=catalogFind("PSU",slot&&slot.label);
    const results=match?[]:catalogSearch("PSU",slot&&slot.label);
    detail='<div class="rig-catalog-fields"><input type="text" placeholder="Type 2+ characters to search PSU…" data-rig-catalog-item="PSU" value="'+escAttr(slot?slot.label:"")+'" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="'+(results.length?"true":"false")+'">'+
      (results.length?'<div class="rig-catalog-results" role="listbox">'+results.map(item=>{
        const value=item.brand+" "+item.model;
        const safety=item.safety_status||"UNVERIFIED";
        return '<button type="button" class="rig-catalog-option" role="option" data-rig-catalog-choice="PSU" data-rig-catalog-value="'+escAttr(value)+'">'+
          '<span class="rig-option-name">'+escHtml(value)+'</span>'+
          '<span class="pn-result-badges"><span class="pn-result-rating">Quality <b>'+escHtml(String(item.quality_score||"?"))+'</b></span>'+
          '<span class="pn-result-tier pn-psu-result-'+String(safety).toLowerCase()+'">'+escHtml(safety)+'</span></span></button>';
      }).join("")+'</div>':"")+
      '</div>'+
      (match?renderCatalogMeta("PSU",match,slot):
        '<div class="rig-catalog-meta rig-catalog-help">'+
        (HardwareCatalog.psuError?"PSU catalog unavailable: "+escHtml(HardwareCatalog.psuError):
         slot&&slot.label&&pnNorm(slot.label).length>=2?results.length+" matching PSUs — choose one above":"Type at least 2 characters to search")+
        '</div>');
  }else{
    const quick=soleUnassignedMatch("PSU");
    detail='<div class="rig-empty-slot">'+escHtml(rigEmptySlotLabel("PSU"))+'</div>'+
      (quick?'<button type="button" class="btn btn-sm" style="margin-top:6px" data-rig-slot-quickfill="PSU:'+quick.id+'">+ USE '+escHtml(quick.manufacturer+" "+quick.model)+'</button>':"");
  }

  const resolved=rigSlotResolved(slot,rig.currency,"PSU");
  const priceInput=(field,label)=>slot?
    '<input class="rig-price-input" type="number" step="0.01" min="0" aria-label="'+label+' for PSU" '+
    (kind==="INVENTORY"?'readonly title="Managed from Inventory"':'data-rig-slot-field="PSU.'+field+'"')+
    ' value="'+escAttr(resolved?resolved[field]:slot[field]||0)+'">':"—";
  const copyBtn=rig.id?'<button type="button" class="btn btn-sm btn-ghost" data-rig-copy-slot-to-family="PSU" title="Copy this slot to every other variant in this family">→ FAMILY</button>':"";

  return '<div class="rig-slot-row"><div class="rig-slot-label">PSU</div><div class="rig-slot-control">'+modeSelect+
    '<div class="rig-slot-detail">'+detail+'</div></div>'+
    '<div class="rig-slot-price" data-label="PAID PRICE">'+priceInput("cost","Paid price")+'</div>'+
    '<div class="rig-slot-price is-secondary" data-label="ORIGINAL PRICE">'+priceInput("originalPrice","Original price")+'</div>'+
    '<div class="rig-slot-actions">'+copyBtn+'</div></div>';
};

const PNCoreRenderRigEditor = renderRigEditor;
renderRigEditor=PNCoreRenderRigEditor;

const psuStyle=document.createElement("style");
psuStyle.textContent=`
.pn-psu-quality{border-color:rgba(69,215,255,.45);background:var(--performance-wash)}
.pn-psu-quality span,.pn-psu-quality b{color:var(--performance)}
.pn-psu-approved{border-color:var(--green-dim);background:var(--green-wash)}.pn-psu-approved b{color:var(--green)}
.pn-psu-acceptable{border-color:var(--amber-dim);background:var(--amber-wash)}.pn-psu-acceptable b{color:var(--amber)}
.pn-psu-caution{border-color:#b45309;background:rgba(180,83,9,.14)}.pn-psu-caution b{color:#f59e0b}
.pn-psu-reject{border-color:var(--red-dim);background:var(--red-wash)}.pn-psu-reject b{color:var(--red)}
.pn-psu-result-approved{--tier-color:var(--green);--tier-border:var(--green-dim);--tier-wash:var(--green-wash)}
.pn-psu-result-acceptable{--tier-color:var(--amber);--tier-border:var(--amber-dim);--tier-wash:var(--amber-wash)}
.pn-psu-result-caution{--tier-color:#f59e0b;--tier-border:#b45309;--tier-wash:rgba(180,83,9,.14)}
.pn-psu-result-reject{--tier-color:var(--red);--tier-border:var(--red-dim);--tier-wash:var(--red-wash)}
`;
document.head.appendChild(psuStyle);
