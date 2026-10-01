"use strict";
(function revenantIIIForSaleMigrationV1(){
  const MARKER="profitnode_revenant_iii_for_sale_v1";
  let attempts=0;
  function run(){
    attempts++;
    try{
      if(typeof Store==="undefined"||typeof emptyRigSlots!=="function")return false;
      const project=Store.all("projects").find(p=>String(p&&p.name||"").trim().toUpperCase()==="REVENANT III");
      if(!project)return false;
      const existing=Store.all("rigs").find(r=>String(r&&r.family||"").trim().toUpperCase()==="REVENANT III"&&String(r&&r.variantName||"").trim().toUpperCase()==="FOR SALE");
      const alreadyCorrect=existing&&existing.status==="LISTED"&&existing.purpose==="FLIP"&&Number(existing.expectedSalePrice)===44600&&existing.slots&&existing.slots.STORAGE2;
      if(alreadyCorrect){try{localStorage.setItem(MARKER,"1")}catch(_){ }return true;}

      const inventory=Store.all("inventory").filter(i=>i&&i.assignedProjectId===project.id);
      const text=i=>String((i&&i.manufacturer||"")+" "+(i&&i.model||"")).trim();
      const find=(categories,re)=>inventory.find(i=>(Array.isArray(categories)?categories:[categories]).includes(i.category)&&re.test(text(i)));
      const cpu=find("CPU",/RYZEN\s*5\s*2600\s*$/i);
      const gpu=find("GPU",/GTX\s*1070\s*8GB/i);
      const mobo=find("MOTHERBOARD",/B450\s*TOMAHAWK\s*MAX\s*II/i);
      const ram=find("RAM",/FURY\s*BEAST.*2666/i);
      const nvme=find("STORAGE",/PC601\s*512GB/i);
      const hdd=find("STORAGE",/(WESTERN\s*DIGITAL|WDC).*500GB/i);
      const psu=find("PSU",/MONTECH.*CENTURY\s*550W/i);
      const pcCase=find("CASE",/UGD.*TRACER\s*2234/i);
      const cooler=find(["COOLER","COOLING"],/AMD.*STOCK\s*COOLER/i);
      const required=[cpu,gpu,mobo,ram,nvme,hdd,psu,pcCase,cooler];
      if(required.some(x=>!x))return false;

      const slots=emptyRigSlots();
      slots.CPU={kind:"INVENTORY",inventoryItemId:cpu.id};
      slots.GPU={kind:"INVENTORY",inventoryItemId:gpu.id};
      slots.MOBO={kind:"INVENTORY",inventoryItemId:mobo.id};
      slots.RAM={kind:"INVENTORY",inventoryItemId:ram.id};
      slots.STORAGE={kind:"INVENTORY",inventoryItemId:nvme.id};
      slots.STORAGE2={kind:"INVENTORY",inventoryItemId:hdd.id};
      slots.PSU={kind:"INVENTORY",inventoryItemId:psu.id};
      slots.CASE={kind:"INVENTORY",inventoryItemId:pcCase.id};
      slots.COOLER={kind:"INVENTORY",inventoryItemId:cooler.id};

      const rigData={
        family:"REVENANT III",variantName:"FOR SALE",status:"LISTED",purpose:"FLIP",currency:"RSD",slots:slots,
        estimatedMarketValue:44600,expectedSalePrice:44600,salePrice:null,saleDate:null,targetMarginPct:40.6,
        notes:"Completed and validated flip build. Total invested: 26,500 RSD. Listed at 380 EUR (~44,600 RSD). OCCT CPU/RAM/GPU/VRAM PASS; CPU peak 62.4C; both drives 100% health; CS2 and Valorant tested smooth."
      };
      let rig=existing;
      if(rig)rig=Store.update("rigs",rig.id,rigData);
      else{
        rig=Store.insert("rigs",rigData);
        if(typeof Timeline!=="undefined"&&Timeline.log)Timeline.log("RIG_STATUS","REVENANT III / FOR SALE → LISTED","Validated flip build listed for sale at 380 EUR.",typeof todayISO==="function"?todayISO():"","rig",rig.id);
      }

      const projectSlots=Object.assign({},project.slots||{});
      projectSlots.CPU={kind:"INVENTORY",inventoryItemId:cpu.id};
      projectSlots.GPU={kind:"INVENTORY",inventoryItemId:gpu.id};
      projectSlots.MOBO={kind:"INVENTORY",inventoryItemId:mobo.id};
      projectSlots.RAM={kind:"INVENTORY",inventoryItemId:ram.id};
      projectSlots.STORAGE={kind:"INVENTORY",inventoryItemId:nvme.id};
      projectSlots.PSU={kind:"INVENTORY",inventoryItemId:psu.id};
      projectSlots.CASE={kind:"INVENTORY",inventoryItemId:pcCase.id};
      projectSlots.COOLER={kind:"INVENTORY",inventoryItemId:cooler.id};
      const extras=(project.extras||[]).filter(x=>!(x&&x.inventoryItemId===hdd.id));
      extras.push({id:"revenant-iii-secondary-hdd",label:text(hdd),notes:"Secondary 500GB HDD · 100% health",inventoryItemId:hdd.id,cost:Number(hdd.purchasePrice)||0,currency:hdd.currency||"RSD"});
      Store.update("projects",project.id,{status:"LISTED",purpose:"FLIP",slots:projectSlots,extras:extras,estimatedMarketValue:44600,listingPrice:380,listingCurrency:"EUR",notes:"Completed, verified and listed for sale. Total invested: 26,500 RSD. Expected sale: 44,600 RSD / 380 EUR. Expected profit: 18,100 RSD · ROI 68.3% · margin 40.6%. OCCT CPU/RAM/GPU/VRAM PASS, peak CPU 62.4C, both drives 100% health, CS2/Valorant tested smooth."});
      Store.persist();
      try{localStorage.setItem(MARKER,"1")}catch(_){ }
      if(typeof render==="function")render();
      console.info("[PROFITNODE] REVENANT III / FOR SALE migration applied.");
      return true;
    }catch(err){console.error("[PROFITNODE] REVENANT III / FOR SALE migration failed",err);return false;}
  }
  function retry(){if(run())return;if(attempts<20)setTimeout(retry,500);else console.warn("[PROFITNODE] REVENANT III / FOR SALE migration gave up after ledger hydration retries.");}
  setTimeout(retry,250);
})();
