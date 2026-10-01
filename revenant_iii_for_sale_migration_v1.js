"use strict";
(function revenantIIIForSaleMigrationV1(){
  const MARKER="profitnode_revenant_iii_for_sale_v1";
  function run(){
    try{
      if(typeof Store==="undefined"||typeof emptyRigSlots!=="function")return;
      const project=Store.all("projects").find(p=>String(p&&p.name||"").trim().toUpperCase()==="REVENANT III");
      if(!project)return;
      const existing=Store.all("rigs").find(r=>String(r&&r.family||"").trim().toUpperCase()==="REVENANT III"&&String(r&&r.variantName||"").trim().toUpperCase()==="FOR SALE");
      const alreadyCorrect=existing&&existing.status==="LISTED"&&existing.purpose==="FLIP"&&Number(existing.expectedSalePrice)===43000&&existing.slots&&existing.slots.STORAGE2;
      if(alreadyCorrect){try{localStorage.setItem(MARKER,"1")}catch(_){ }return;}

      const inventory=Store.all("inventory").filter(i=>i&&i.assignedProjectId===project.id);
      const text=i=>String((i&&i.manufacturer||"")+" "+(i&&i.model||"")).trim();
      const find=(category,re)=>inventory.find(i=>i.category===category&&re.test(text(i)));
      const cpu=find("CPU",/RYZEN\s*5\s*2600\s*$/i);
      const gpu=find("GPU",/GTX\s*1070\s*8GB/i);
      const mobo=find("MOTHERBOARD",/B450\s*TOMAHAWK\s*MAX\s*II/i);
      const ram=find("RAM",/FURY\s*BEAST.*2666/i);
      const nvme=find("STORAGE",/PC601\s*512GB/i);
      const hdd=find("STORAGE",/(WESTERN\s*DIGITAL|WDC).*500GB/i);
      const psu=find("PSU",/MONTECH.*CENTURY\s*550W/i);
      const pcCase=find("CASE",/UGD.*TRACER\s*2234/i);
      const cooler=find("COOLER",/AMD.*STOCK\s*COOLER/i);
      const required=[cpu,gpu,mobo,ram,nvme,hdd,psu,pcCase,cooler];
      if(required.some(x=>!x)){console.warn("[PROFITNODE] REVENANT III FOR SALE migration skipped: assigned hardware set is incomplete.");return;}

      // Historical reconstruction corrections only. Use Store.update so the
      // restored Treasury snapshot is not charged again for old purchases.
      Store.update("inventory",nvme.id,{purchasePrice:5500,notes:"REVENANT III build. [Genesis STRONG]"});
      Store.update("inventory",psu.id,{purchasePrice:3500,notes:"REVENANT III build. [Genesis STRONG]"});

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
        estimatedMarketValue:43000,expectedSalePrice:43000,salePrice:null,saleDate:null,targetMarginPct:38.4,
        notes:"Completed and validated flip build. OCCT CPU/RAM/GPU/VRAM PASS; CPU peak 62.4C; both drives 100% health; CS2 and Valorant tested smooth. Exact captured component basis 26,490 RSD, corresponding to the 26,500 RSD rounded shop figure. Listed target: 43,000 RSD / 380 EUR."
      };
      let rig=existing;
      if(rig)rig=Store.update("rigs",rig.id,rigData);
      else{
        rig=Store.insert("rigs",rigData);
        if(typeof Timeline!=="undefined"&&Timeline.log)Timeline.log("RIG_STATUS","REVENANT III / FOR SALE → LISTED","Validated flip build listed for sale at 43,000 RSD.",typeof todayISO==="function"?todayISO():"","rig",rig.id);
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
      Store.update("projects",project.id,{status:"LISTED",purpose:"FLIP",slots:projectSlots,extras:extras,estimatedMarketValue:43000,listingPrice:380,listingCurrency:"EUR",notes:"Completed, verified and listed for sale. Rounded invested basis: 26,500 RSD (exact captured component sum 26,490 RSD). OCCT CPU/RAM/GPU/VRAM PASS, peak CPU 62.4C, both drives 100% health, CS2/Valorant tested smooth. Target: 43,000 RSD / 380 EUR."});
      Store.persist();
      try{localStorage.setItem(MARKER,"1")}catch(_){ }
      if(typeof render==="function")render();
      console.info("[PROFITNODE] REVENANT III / FOR SALE migration applied.");
    }catch(err){console.error("[PROFITNODE] REVENANT III / FOR SALE migration failed",err);}
  }
  setTimeout(run,0);
})();
