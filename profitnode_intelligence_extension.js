"use strict";

const PN_PART_NAME_TIERS = Object.freeze({
  1:{key:"POOR",label:"Poor",className:"pn-part-name-poor"},
  2:{key:"COMMON",label:"Common",className:"pn-part-name-common"},
  3:{key:"UNCOMMON",label:"Uncommon",className:"pn-part-name-uncommon"},
  4:{key:"RARE",label:"Rare",className:"pn-part-name-rare"},
  5:{key:"EPIC",label:"Epic",className:"pn-part-name-epic"},
  6:{key:"LEGENDARY",label:"Legendary",className:"pn-part-name-legendary"},
  7:{key:"ARTIFACT",label:"Artifact",className:"pn-part-name-artifact"}
});
globalThis.PN_PART_NAME_TIERS = PN_PART_NAME_TIERS;

const PN_PART_NAME_RULES = Object.freeze({
  CPU:{scores:[30,45,60,75,88,97]},GPU:{scores:[6,11,25,45,70,95]},
  MOTHERBOARD:{scores:[30,45,60,75,88,97]},PSU:{scores:[30,45,62,78,90,97]},
  STORAGE:{scores:[30,45,60,75,88,97]}
});

function pnPartTierCategory(category){
  const key=String(category||"OTHER").toUpperCase();
  return key==="MOBO"?"MOTHERBOARD":key==="COOLER"?"COOLING":key;
}

function pnPartTierCatalogKey(category){
  return category==="MOTHERBOARD"?"MOBO":category==="COOLING"?"COOLER":category;
}

function pnPartCatalogIdentity(value,category){
  let text=pnNorm(value);
  if(category==="GPU") text=text.replace(/\b\d+ GB\b/g,"").replace(/\bGDDR\dX?\b/g,"");
  return text.replace(/\b(?:OC|EDITION|GRAPHICS|CARD)\b/g,"").replace(/\s+/g," ").trim();
}

function pnPartCatalogResolution(item){
  const category=pnPartTierCategory(item&&item.category),key=pnPartTierCatalogKey(category);
  const list=typeof catalogEntriesForSlot==="function"?(catalogEntriesForSlot(key)||[]):[];
  const override=pnNorm(item&&item.catalogOverride),full=pnNorm(((item&&item.manufacturer)||"")+" "+((item&&item.model)||"")),model=pnNorm(item&&item.model);
  const rowFull=row=>pnNorm((row.brand||"")+" "+(row.model||row.series||"")),rowModel=row=>pnNorm(row.model||row.series||"");
  if(override){
    const manual=list.find(row=>rowFull(row)===override||rowModel(row)===override);
    return manual?{item:manual,confidence:"MANUAL",reason:"Manual canonical catalog link"}:{item:null,confidence:"UNRESOLVED",reason:"Manual catalog link did not resolve"};
  }
  if(!model) return {item:null,confidence:"NONE",reason:"No model recorded"};
  let match=list.find(row=>rowFull(row)===full);
  if(match) return {item:match,confidence:"EXACT",reason:"Exact brand and model match"};
  match=list.find(row=>rowModel(row)===model);
  if(match) return {item:match,confidence:"MODEL",reason:"Exact model match"};
  const normalized=pnPartCatalogIdentity(model,category);
  match=list.find(row=>pnPartCatalogIdentity(rowModel(row),category)===normalized);
  if(match) return {item:match,confidence:"NORMALIZED",reason:"Normalized model match"};
  match=normalized.length>=3?list.find(row=>{const candidate=pnPartCatalogIdentity(rowModel(row),category);return candidate.length>=5&&(candidate.includes(normalized)||normalized.includes(candidate));}):null;
  return match?{item:match,confidence:"FAMILY",reason:"Closest catalog family match"}:{item:null,confidence:"NONE",reason:"Category heuristic — no canonical match"};
}

function pnPartCatalogMatch(item){
  return pnPartCatalogResolution(item).item;
}

function pnPartTierFromScore(score,thresholds){
  if(score===null||score===undefined||score==="") return null;
  const value=Number(score);
  if(!Number.isFinite(value)) return null;
  let tier=1;
  thresholds.forEach(limit=>{if(value>=limit) tier++;});
  return tier;
}

function pnPartText(item,catalog){
  return pnNorm([item&&item.manufacturer,item&&item.model,item&&item.notes,catalog&&catalog.brand,catalog&&(catalog.model||catalog.series)].filter(Boolean).join(" "));
}

function pnPartCapacityGb(text,catalog){
  if(catalog&&Number(catalog.capacity_gb)) return Number(catalog.capacity_gb);
  const source=String(text||"").toUpperCase(),kit=source.match(/(\d+)\s*X\s*(\d+)\s*GB/);
  if(kit) return Number(kit[1])*Number(kit[2]);
  const values=Array.from(source.matchAll(/(\d+(?:\.\d+)?)\s*(TB|GB)/g)).map(m=>Number(m[1])*(m[2]==="TB"?1000:1));
  return values.length?Math.max.apply(null,values):null;
}

function pnCpuNameTier(text,catalog){
  if(/5800X3D|5700X3D|7[68]00X3D|7950X3D|RYZEN 9|CORE (?:ULTRA )?9|\bI9\b/.test(text)) return 5;
  if(/RYZEN (?:5 5600X?|7 (?:3700X|5700X|5800X))|CORE (?:ULTRA )?7|\bI7 (?:10700|11700|12700|13700|14700)/.test(text)) return 4;
  if(/RYZEN 5 (?:2600X|3500X|3600X?|3600XT|5500)|\bI5 (?:8400|9400|10400|11400|12400)/.test(text)) return 3;
  if(/RYZEN (?:3 (?:3100|4100)|5 (?:1600|2600))/.test(text)) return 2;
  return pnPartTierFromScore(catalog&&catalog.overall,PN_PART_NAME_RULES.CPU.scores)||(/ATHLON|CELERON|PENTIUM|RYZEN 3/.test(text)?1:2);
}

function pnGpuNameTier(text,catalog){
  if(/RTX (?:3090|4090|4090 D|5090|5090 D)|RX (?:6950 XT|6900 XT|7900 XTX|7900)/.test(text)) return 7;
  if(/RTX (?:4080|4080 SUPER|4070 TI|5080|5070 TI)|RX (?:6800 XT|6900 XT|6950 XT|7900)/.test(text)) return 6;
  if(/RTX (?:3080|3080 TI|3070|3070 TI|3070 SUPER|3060 TI|4070)|RX (?:6700 XT|6750 XT|6800 XT|7600)/.test(text)) return 5;
  if(/RTX (?:2070 SUPER|2080|3060|3060 TI)|RX (?:6600 XT|6600\b|6650 XT|6700|6700 XT|6750 XT)/.test(text)) return 4;
  if(/GTX (?:1070(?: TI)?|1080|1660(?: SUPER| TI)?)|RTX 2060(?: SUPER)?|RX (?:5600 XT|5700(?: XT)?)\b/.test(text)) return 3;
  if(/GTX (?:1060|1650(?: SUPER)?|1660)|RX (?:470|480|570|580|5500 XT)\b/.test(text)) return 3;
  if(/GTX (?:1050(?: TI)?|1630)|RX (?:460|560|6400|6500 XT)\b/.test(text)) return 2;
  return pnPartTierFromScore(catalog&&catalog.overall,PN_PART_NAME_RULES.GPU.scores)||3;
}

function pnMotherboardNameTier(text,catalog){
  if(catalog) return pnPartTierFromScore(catalog.overall,PN_PART_NAME_RULES.MOTHERBOARD.scores);
  if(/A320|A520|\bH\d{3}/.test(text)) return 1;
  if(/CROSSHAIR|MAXIMUS|GODLIKE|AORUS (?:MASTER|XTREME)|TAICHI/.test(text)) return 7;
  if(/X670|X870/.test(text)) return 6;
  if(/X570/.test(text)) return 4;
  if(/B450|B550|B650/.test(text)) return /TOMAHAWK|MORTAR|AORUS (?:PRO|ELITE)|ROG STRIX/.test(text)?5:4;
  if(/A520|B550/.test(text)) return 3;
  return 2;
}

function pnRamNameTier(text){
  const capacity=pnPartCapacityGb(text,null),speed=Number((text.match(/(?:DDR[45]\s*)?(\d{4,5})\s*(?:MT S|MHZ)?/)||[])[1])||0;
  const ddr5=/DDR5/.test(text),single=/SINGLE(?: CHANNEL)?|1\s*X\s*\d+\s*GB/.test(text),dual=/DUAL(?: CHANNEL)?|2\s*X\s*\d+\s*GB/.test(text);
  if(ddr5&&capacity>=32&&speed>=6000) return 7;
  if(ddr5&&capacity>=32||capacity>=32&&speed>=3200&&!single) return 6;
  if(ddr5&&capacity>=16||capacity>=32||capacity>=16&&(speed>=3200||dual)) return 5;
  if(capacity>=16||capacity>=8&&(speed>=3200||dual)) return 4;
  if(capacity>=8&&dual) return 3;
  if(capacity>=8&&single) return 1;
  if(capacity>=4) return 2;
  return 1;
}

function pnPsuNameTier(text,catalog){
  if(catalog){
    if(String(catalog.safety_status||"").toUpperCase()==="REJECT") return 1;
    const tier=pnPartTierFromScore(catalog.quality_score,PN_PART_NAME_RULES.PSU.scores);
    return String(catalog.safety_status||"").toUpperCase()==="CAUTION"?Math.min(tier,3):tier;
  }
  if(/GENERIC|NO NAME|UNKNOWN|REPLACEMENT REQUIRED/.test(text)) return 1;
  if(/RMX|SEASONIC (?:PRIME|VERTEX)|DARK POWER|STRAIGHT POWER|SUPER FLOWER (?:LEADEX|TITANIUM)/.test(text)) return 7;
  if(/80 PLUS GOLD|FULL MODULAR|FULLY MODULAR/.test(text)) return 6;
  if(/CORSAIR (?:CX|TX)|PURE POWER|MWE GOLD|FOCUS GX/.test(text)) return 4;
  return 3;
}

function pnStorageNameTier(item,text,catalog){
  const healthRaw=item&&[item.driveHealthPercent,item.healthPercent,item.health].find(v=>v!==null&&v!==undefined&&v!=="");
  const parsedHealth=healthRaw!==undefined?Number(healthRaw):Number((text.match(/(?:HEALTH|LIFE)\s*(\d{1,3})/)||[])[1]);
  const health=Number.isFinite(parsedHealth)?Math.max(0,Math.min(100,parsedHealth)):null;
  if(item&&["DEAD","FAULTY"].includes(item.condition)||health!==null&&health<60) return 1;
  const capacity=pnPartCapacityGb(text,catalog),type=pnNorm(catalog&&catalog.drive_type||text);
  let tier;
  if(/NVME/.test(type)&&capacity>=2000&&(catalog?Number(catalog.quality_score)>=70:/SAMSUNG|WD BLACK|FIRECUDA|CRUCIAL T500/.test(text))) tier=7;
  else if(/NVME/.test(type)&&capacity>=1000) tier=6;
  else if(/NVME/.test(type)&&capacity>=256||/SATA SSD/.test(type)&&capacity>=500) tier=5;
  else if(/SATA SSD/.test(type)&&capacity>=128) tier=4;
  else if(/HDD/.test(type)||capacity&&capacity<128) tier=2;
  else tier=pnPartTierFromScore(catalog&&catalog.overall_score,PN_PART_NAME_RULES.STORAGE.scores)||3;
  if(health!==null&&health<60) tier=Math.min(tier,1);
  else if(health!==null&&health<70) tier=Math.min(tier,2);
  else if(health!==null&&health<80) tier=Math.min(tier,4);
  else if(health!==null&&health<90) tier=Math.min(tier,5);
  return tier;
}

function pnCoolerNameTier(text,catalog){
  const caps=catalog&&catalog.caps||{};
  if(/NH D15/.test(text)) return 6;
  if(caps.coolingClass==="EXTREME"||/DUAL TOWER|280\s*MM AIO|360\s*MM AIO|420\s*MM AIO/.test(text)) return 7;
  if(caps.coolingClass==="STRONG"||/120\s*MM (?:TOWER|AIR)|AK400|HYPER 212|MUGEN/.test(text)) return 5;
  if(caps.coolingClass==="STANDARD"||/TOWER/.test(text)) return 4;
  if(caps.coolingClass==="LIGHT"||/STOCK|WRAITH|LAMINAR|LOW PROFILE|TINY/.test(text)) return 2;
  return 3;
}

function pnCaseNameTier(text,catalog){
  const caps=catalog&&catalog.caps||{},quality=String(caps.buildQuality||"").toUpperCase(),airflow=String(caps.airflow||"").toUpperCase();
  if(/FLAGSHIP|HAF 700|7000D|O11D EVO XL|COSMOS C700/.test(text)&&quality==="PREMIUM") return 7;
  if(quality==="PREMIUM"||airflow==="EXCELLENT"&&quality!=="BASIC") return 6;
  if(quality==="GOOD"||quality==="SOLID"&&["GOOD","EXCELLENT"].includes(airflow)) return 5;
  if(/LANCOOL/.test(text)) return 4;
  if(quality==="BASIC"||["FAIR","GOOD"].includes(airflow)) return 3;
  if(quality==="POOR"||airflow==="POOR") return 2;
  return 3;
}

function pnPartNameTier(item){
  const category=pnPartTierCategory(item&&item.category),resolution=pnPartCatalogResolution(item||{}),catalog=resolution.item,text=pnPartText(item,catalog);
  let tier=category==="CPU"?pnCpuNameTier(text,catalog):category==="GPU"?pnGpuNameTier(text,catalog):category==="MOTHERBOARD"?pnMotherboardNameTier(text,catalog):category==="RAM"?pnRamNameTier(text):category==="PSU"?pnPsuNameTier(text,catalog):category==="STORAGE"?pnStorageNameTier(item,text,catalog):category==="COOLING"?pnCoolerNameTier(text,catalog):category==="CASE"?pnCaseNameTier(text,catalog):4;
  tier=Math.max(1,Math.min(7,Number(tier)||4));
  return Object.assign({tier:tier,source:catalog?"catalog":"heuristic",category:category,matchConfidence:resolution.confidence,reason:catalog?"Canonical "+category.toLowerCase()+" evidence · "+resolution.reason:resolution.reason},PN_PART_NAME_TIERS[tier]);
}

function pnPartNameHtml(item){
  const visual=pnPartNameTier(item),category=pnPartTierCategory(item&&item.category),name=((item&&item.manufacturer)||"")+(((item&&item.manufacturer)&&(item&&item.model))?" ":"")+((item&&item.model)||"");
  return '<span class="pn-part-name '+visual.className+(category==="COOLING"||category==="CASE"?' pn-part-name-subtle':'')+'" data-pn-part-tier="'+visual.key+'" title="PROFITNODE visual tier: '+visual.key+' — '+visual.label+'">'+escHtml(name)+'</span>';
}

function pnPartTierReadHtml(item){
  const visual=pnPartNameTier(item||{}),hasName=item&&(item.manufacturer||item.model);
  return hasName?'<span class="pn-part-tier-swatch '+visual.className+'">'+visual.key+' · '+escHtml(visual.label)+'</span><span>'+escHtml(visual.reason)+' · '+escHtml(visual.matchConfidence)+'</span>':'<span>Enter a part name to calculate its category-relative tier.</span>';
}

function pnPartTierExplanationHtml(item){
  const override=item&&item.catalogOverride||"";
  return '<div class="pn-part-tier-inspector" data-pn-tier-inspector><div class="pn-part-tier-read">'+pnPartTierReadHtml(item)+'</div>'+
    '<details class="pn-catalog-override"><summary>CATALOG LINK / ADVANCED</summary><label class="field"><span>Canonical model override</span><input type="text" name="catalogOverride" value="'+escAttr(override)+'" placeholder="e.g. NVIDIA GTX 1070 8GB"><small>Leave blank for automatic matching. An unresolved override falls back safely to category rules.</small></label></details></div>';
}

/*
  PROFITNODE OPERATING INTELLIGENCE v1

  Adds:
  - canonical true cost basis
  - capital velocity
  - inventory aging
  - build opportunity detection
  - BLACKBOX data health
  - PERSONAL inventory exclusion from shop financial KPIs
*/

(function installProfitnodeOperatingIntelligence(){

  function pnIsShopInventoryItem(item){
    return !!item && item.status !== "SOLD" && item.status !== "PERSONAL";
  }

  function pnItemExtraCosts(item,currency){
    if (!item) return 0;

    const raw =
      Number(item.shippingCost || 0) +
      Number(item.accessoryCosts || 0) +
      Number(item.miscCosts || 0) +
      Number(item.additionalCosts || 0);

    return convert(raw,item.currency || currency,currency);
  }

  function pnTrueItemCost(item,currency){
    if (!item) return 0;

    return (
      convert(item.purchasePrice || 0,item.currency,currency) +
      repairCostForItem(item.id,currency) +
      pnItemExtraCosts(item,currency)
    );
  }

  function pnShopInventory(currency){
    return Store.all("inventory").filter(pnIsShopInventoryItem);
  }

  function pnActiveCapital(currency){
    return pnShopInventory(currency)
      .reduce((sum,item)=>sum+pnTrueItemCost(item,currency),0);
  }

  function pnMarketValue(currency){
    return pnShopInventory(currency)
      .reduce((sum,item)=>sum+convert(item.estimatedMarketValue || 0,item.currency,currency),0);
  }

  function pnSoldCostBasis(currency){
    return Store.all("sales")
      .filter(sale=>typeof saleIsCompleted!=="function" || saleIsCompleted(sale))
      .reduce((sum,sale)=>sum+convert(saleDerived(sale).totalCost || 0,sale.currency,currency),0);
  }

  function pnTotalSpent(currency){
    return pnSoldCostBasis(currency) + pnActiveCapital(currency);
  }

  globalThis.PNFinance = {
    trueItemCost:pnTrueItemCost,
    activeCapital:pnActiveCapital,
    marketValue:pnMarketValue,
    soldCostBasis:pnSoldCostBasis,
    totalSpent:pnTotalSpent
  };

  /*
    RIG BENCH uses the same true cost basis as BUILDS.
    An inventory part with repair expense now carries that expense into rig economics.
  */
  if (typeof rigSlotResolved === "function"){
    const PNCoreRigSlotResolvedTrueCost = rigSlotResolved;

    rigSlotResolved = function(slot,currency,slotKey){
      const resolved = PNCoreRigSlotResolvedTrueCost(slot,currency,slotKey);

      if (
        slot &&
        slot.kind === "INVENTORY" &&
        resolved &&
        resolved.item
      ){
        resolved.purchaseOnlyCost = resolved.cost;
        resolved.repairCost = repairCostForItem(resolved.item.id,currency);
        resolved.cost = pnTrueItemCost(resolved.item,currency);
        resolved.trueCost = resolved.cost;
      }

      return resolved;
    };
  }

  /*
    Correct shop-level financial KPIs:
    - PERSONAL inventory is not business capital.
    - Unrealized profit uses true cost, not purchase price alone.
    - Total capital invested becomes the canonical lifetime TOTAL SPENT.
  */
  if (typeof dashboardStats === "function"){
    const PNCoreDashboardStatsIntelligence = dashboardStats;

    dashboardStats = function(currency){
      const out = PNCoreDashboardStatsIntelligence(currency);
      const activeCapital = pnActiveCapital(currency);
      const marketValue = pnMarketValue(currency);

      out.totalCapitalInvested = pnTotalSpent(currency);
      out.currentInventoryValue = marketValue;
      out.unrealizedProfit = marketValue - activeCapital;

      return out;
    };
  }

  function pnDaysHeldForSale(sale){
    if (typeof saleDaysHeldResolved === "function"){
      return saleDaysHeldResolved(sale);
    }
    return saleDerived(sale).daysHeld;
  }

  function pnCapitalVelocity(currency){
    const sales = Store.all("sales").filter(sale=>typeof saleIsCompleted!=="function" || saleIsCompleted(sale));
    const tracked = sales
      .map(sale=>{
        const days = pnDaysHeldForSale(sale);
        return {
          sale:sale,
          days:days,
          profit:convert(saleDerived(sale).profit || 0,sale.currency,currency)
        };
      })
      .filter(row=>row.days!=null && !isNaN(row.days) && row.days>=0);

    const avgHold = tracked.length
      ? tracked.reduce((sum,row)=>sum+row.days,0) / tracked.length
      : null;

    const fastest = tracked.length
      ? tracked.slice().sort((a,b)=>a.days-b.days)[0]
      : null;

    const slowest = tracked.length
      ? tracked.slice().sort((a,b)=>b.days-a.days)[0]
      : null;

    const soldBasis = pnSoldCostBasis(currency);
    const revenue = sales.reduce(
      (sum,sale)=>sum+convert(sale.buyerPrice || 0,sale.currency,currency),
      0
    );
    const profit = sales.reduce(
      (sum,sale)=>sum+convert(saleDerived(sale).profit || 0,sale.currency,currency),
      0
    );

    const returnPace =
      soldBasis>0 && avgHold!=null && avgHold>0
        ? (profit / soldBasis) * (30 / avgHold) * 100
        : null;

    const capitalRecovery = soldBasis>0 ? revenue / soldBasis : null;

    return {
      tracked:tracked.length,
      avgHold:avgHold,
      fastest:fastest,
      slowest:slowest,
      returnPace:returnPace,
      capitalRecovery:capitalRecovery
    };
  }

  function pnCapitalVelocityHtml(currency){
    const v = pnCapitalVelocity(currency);

    return ''+
      '<div class="pn-intel-strip">'+
        '<div class="pn-intel-cell"><span>AVG HOLD</span><b>'+(v.avgHold==null?"-":v.avgHold.toFixed(1)+"D")+'</b></div>'+
        '<div class="pn-intel-cell"><span>FASTEST FLIP</span><b>'+(v.fastest?v.fastest.days+"D":"-")+'</b><small>'+(v.fastest?escHtml(v.fastest.sale.itemName):"NO DATA")+'</small></div>'+
        '<div class="pn-intel-cell"><span>SLOWEST FLIP</span><b>'+(v.slowest?v.slowest.days+"D":"-")+'</b><small>'+(v.slowest?escHtml(v.slowest.sale.itemName):"NO DATA")+'</small></div>'+
        '<div class="pn-intel-cell"><span>30D RETURN PACE</span><b class="'+(v.returnPace!=null && v.returnPace>=0?"pn-money-pos":"pn-money-neg")+'">'+(v.returnPace==null?"-":v.returnPace.toFixed(1)+"%")+'</b></div>'+
        '<div class="pn-intel-cell"><span>CAPITAL RECOVERY</span><b>'+(v.capitalRecovery==null?"-":v.capitalRecovery.toFixed(2)+"x")+'</b><small>'+v.tracked+' TIMED SALES</small></div>'+
      '</div>';
  }

  function pnInventoryAging(currency){
    const buckets = {
      fresh:[],
      watch:[],
      stale:[],
      dead:[]
    };

    Store.all("inventory")
      .filter(item=>
        item.status !== "SOLD" &&
        item.status !== "PERSONAL" &&
        !["IN_BUILD","IN_RIG"].includes(item.status)
      )
      .forEach(item=>{
        const days = Calc.daysHeld(item.purchaseDate,todayISO());
        if (days==null || isNaN(days)) return;

        const row = {item:item,days:days};

        if (days<=30) buckets.fresh.push(row);
        else if (days<=60) buckets.watch.push(row);
        else if (days<=90) buckets.stale.push(row);
        else buckets.dead.push(row);
      });

    const deadValue = buckets.dead.reduce(
      (sum,row)=>sum+pnTrueItemCost(row.item,currency),
      0
    );

    return {buckets:buckets,deadValue:deadValue};
  }

  function pnInventoryAgingHtml(currency){
    const a = pnInventoryAging(currency);

    return ''+
      '<div class="pn-section-kicker">INVENTORY AGING</div>'+
      '<div class="pn-intel-strip pn-aging-strip">'+
        '<div class="pn-intel-cell pn-age-fresh"><span>FRESH 0-30D</span><b>'+a.buckets.fresh.length+'</b></div>'+
        '<div class="pn-intel-cell pn-age-watch"><span>WATCH 31-60D</span><b>'+a.buckets.watch.length+'</b></div>'+
        '<div class="pn-intel-cell pn-age-stale"><span>STALE 61-90D</span><b>'+a.buckets.stale.length+'</b></div>'+
        '<div class="pn-intel-cell pn-age-dead"><span>DEAD STOCK 90D+</span><b>'+a.buckets.dead.length+'</b></div>'+
        '<div class="pn-intel-cell"><span>DEAD STOCK COST</span><b class="'+(a.deadValue>0?"pn-money-neg":"pn-money-pos")+'">'+money(a.deadValue,currency)+'</b></div>'+
      '</div>';
  }

  function pnAvailableParts(){
    return Store.all("inventory").filter(item=>
      item.status === "IN_STORAGE" &&
      !item.assignedProjectId &&
      !item.assignedRigId &&
      !["DEAD","FAULTY"].includes(item.condition)
    );
  }

  function pnCategory(items,category){
    return items.filter(item=>item.category===category);
  }

  function pnItemSpread(item,currency){
    return (
      convert(item.estimatedMarketValue || 0,item.currency,currency) -
      pnTrueItemCost(item,currency)
    );
  }

  function pnBestPart(items,currency){
    if (!items.length) return null;

    return items
      .slice()
      .sort((a,b)=>pnItemSpread(b,currency)-pnItemSpread(a,currency))[0];
  }

  function pnCpuMoboCompatible(cpu,mobo){
    if (!cpu || !mobo) return {compatible:false,verified:false};

    const cpuText = pnNorm((cpu.manufacturer||"")+" "+cpu.model);
    const moboText = pnNorm((mobo.manufacturer||"")+" "+mobo.model);

    const cpuSocket = detectCpuSocket(cpuText);
    const moboSocket = detectMoboSocket(moboText);

    if (cpuSocket && moboSocket){
      return {
        compatible:cpuSocket===moboSocket,
        verified:true,
        cpuSocket:cpuSocket,
        moboSocket:moboSocket
      };
    }

    return {
      compatible:true,
      verified:false,
      cpuSocket:cpuSocket,
      moboSocket:moboSocket
    };
  }

  function pnBuildOpportunities(currency){
    const available = pnAvailableParts();

    const cpus = pnCategory(available,"CPU");
    const mobos = pnCategory(available,"MOTHERBOARD");
    const gpus = pnCategory(available,"GPU");
    const rams = pnCategory(available,"RAM");

    if (!cpus.length || !mobos.length || !gpus.length || !rams.length){
      return {
        opportunities:[],
        missing:[
          !cpus.length?"CPU":null,
          !mobos.length?"MOTHERBOARD":null,
          !gpus.length?"GPU":null,
          !rams.length?"RAM":null
        ].filter(Boolean)
      };
    }

    const psu = pnBestPart(pnCategory(available,"PSU"),currency);
    const storage = pnBestPart(pnCategory(available,"STORAGE"),currency);
    const pcCase = pnBestPart(pnCategory(available,"CASE"),currency);
    const cooler = pnBestPart(pnCategory(available,"COOLING"),currency);
    const gpu = pnBestPart(gpus,currency);
    const ram = pnBestPart(rams,currency);

    const candidates = [];

    cpus.forEach(cpu=>{
      mobos.forEach(mobo=>{
        const socket = pnCpuMoboCompatible(cpu,mobo);
        if (!socket.compatible) return;

        const parts = [cpu,mobo,gpu,ram,psu,storage,pcCase,cooler].filter(Boolean);
        const cost = parts.reduce(
          (sum,item)=>sum+pnTrueItemCost(item,currency),
          0
        );
        const market = parts.reduce(
          (sum,item)=>sum+convert(item.estimatedMarketValue || 0,item.currency,currency),
          0
        );
        const spread = market-cost;

        candidates.push({
          cpu:cpu,
          mobo:mobo,
          gpu:gpu,
          ram:ram,
          parts:parts,
          cost:cost,
          market:market,
          spread:spread,
          socket:socket,
          completeness:parts.length
        });
      });
    });

    candidates.sort((a,b)=>
      b.spread-a.spread ||
      b.completeness-a.completeness
    );

    return {
      opportunities:candidates.slice(0,3),
      missing:[]
    };
  }

  function pnOpportunityCard(op,currency,index){
    const parts = [
      op.cpu.manufacturer+" "+op.cpu.model,
      op.mobo.manufacturer+" "+op.mobo.model,
      op.gpu.manufacturer+" "+op.gpu.model,
      op.ram.manufacturer+" "+op.ram.model
    ];

    return ''+
      '<div class="pn-opportunity-card">'+
        '<div class="pn-opportunity-head">'+
          '<div>'+
            '<span>NODE MATCH '+String(index+1).padStart(2,"0")+'</span>'+
            '<b>'+op.completeness+' PART BUILD PATH</b>'+
          '</div>'+
          '<span class="chip '+(op.socket.verified?"chip-green-outline":"chip-amber-outline")+'">'+(op.socket.verified?"SOCKET VERIFIED":"VERIFY SOCKET")+'</span>'+
        '</div>'+
        '<div class="pn-opportunity-parts">'+parts.map(label=>'<span>'+escHtml(label)+'</span>').join("")+'</div>'+
        '<div class="pn-opportunity-money">'+
          '<div><span>TRUE COST</span><b>'+money(op.cost,currency)+'</b></div>'+
          '<div><span>COMPONENT MARKET BASELINE</span><b>'+money(op.market,currency)+'</b></div>'+
          '<div><span>POTENTIAL SPREAD</span><b class="'+(op.spread>=0?"pn-money-pos":"pn-money-neg")+'">'+money(op.spread,currency)+'</b></div>'+
        '</div>'+
      '</div>';
  }

  function pnBuildOpportunitiesHtml(currency){
    const data = pnBuildOpportunities(currency);

    let body = "";

    if (!data.opportunities.length){
      body =
        '<div class="pn-intelligence-empty">'+
          '<b>NO COMPLETE BUILD PATH DETECTED</b>'+
          '<span>Missing unassigned stock: '+escHtml(data.missing.join(", ") || "compatible core parts")+'</span>'+
        '</div>';
    } else {
      body = '<div class="pn-opportunity-grid">'+
        data.opportunities.map((op,index)=>pnOpportunityCard(op,currency,index)).join("")+
      '</div>';
    }

    return ''+
      '<section class="panel pn-command-panel pn-build-opportunities">'+
        '<div class="panel-head">'+
          '<h2>BUILD OPPORTUNITIES</h2>'+
          '<span class="pn-terminal-state">PART SYNERGY</span>'+
        '</div>'+
        '<div class="panel-body">'+body+'</div>'+
      '</section>';
  }

  function pnDataHealth(){
    const collections = [
      "projects","inventory","deals","sales","timeline","repairs","rigs"
    ];
    const problems = [];
    const metadata = [];

    collections.forEach(name=>{
      const seen = new Set();

      Store.all(name).forEach(row=>{
        if (!row || !row.id) return;

        if (seen.has(row.id)){
          problems.push("DUPLICATE ID in "+name+": "+row.id);
        }
        seen.add(row.id);
      });
    });

    const projects = new Map(Store.all("projects").map(row=>[row.id,row]));
    const rigs = new Map(Store.all("rigs").map(row=>[row.id,row]));
    const inventory = new Map(Store.all("inventory").map(row=>[row.id,row]));

    Store.all("inventory").forEach(item=>{
      if (item.assignedProjectId && !projects.has(item.assignedProjectId)){
        problems.push("ORPHAN PROJECT LINK: "+item.manufacturer+" "+item.model);
      }

      if (item.assignedRigId && !rigs.has(item.assignedRigId)){
        problems.push("ORPHAN RIG LINK: "+item.manufacturer+" "+item.model);
      }

      if (item.status==="SOLD" && item.assignedRigId){
        const rig = rigs.get(item.assignedRigId);
        if (rig && rig.status!=="SOLD"){
          problems.push("SOLD PART still assigned to active rig: "+item.manufacturer+" "+item.model);
        }
      }
    });

    Store.all("repairs").forEach(repair=>{
      if (repair.inventoryItemId && !inventory.has(repair.inventoryItemId)){
        problems.push("ORPHAN REPAIR LINK: "+repair.id);
      }
    });

    Store.all("rigs").forEach(rig=>{
      RIG_SLOTS.forEach(slotKey=>{
        const slot = rig.slots && rig.slots[slotKey];

        if (
          slot &&
          slot.kind==="INVENTORY" &&
          slot.inventoryItemId &&
          !inventory.has(slot.inventoryItemId)
        ){
          problems.push("MISSING RIG PART: "+rig.family+" / "+rig.variantName+" / "+slotKey);
        }
      });
    });

    ["inventory","projects","deals","sales","repairs","rigs"].forEach(name=>{
      Store.all(name).forEach(row=>{
        if (row.currency && !CURRENCIES.includes(row.currency)){
          problems.push("INVALID CURRENCY in "+name+": "+row.currency);
        }
      });
    });

    Store.all("sales").forEach(sale=>{
      if (!sale.saleType || !sale.saleSource){
        metadata.push(sale.itemName || sale.id);
      }
    });

    return {
      problems:problems,
      metadata:metadata
    };
  }

  function pnDataHealthHtml(){
    const health = pnDataHealth();
    const clean = health.problems.length===0;

    return ''+
      '<div class="panel pn-health-panel" style="margin-bottom:16px">'+
        '<div class="panel-head">'+
          '<h2>DATABASE HEALTH</h2>'+
          '<span class="chip '+(clean?"chip-green":"chip-red")+'">'+(clean?"CLEAN":"ATTENTION")+'</span>'+
        '</div>'+
        '<div class="panel-body">'+
          '<div class="pn-health-grid">'+
            '<div><span>STRUCTURAL ISSUES</span><b class="'+(clean?"pn-money-pos":"pn-money-neg")+'">'+health.problems.length+'</b></div>'+
            '<div><span>LEGACY SALE METADATA</span><b>'+health.metadata.length+'</b></div>'+
            '<div><span>CHECKED COLLECTIONS</span><b>7</b></div>'+
          '</div>'+
          (health.problems.length
            ? '<div class="pn-health-list">'+health.problems.slice(0,8).map(msg=>'<div>'+escHtml(msg)+'</div>').join("")+'</div>'
            : '<div class="pn-health-ok">No orphan links, duplicate IDs, missing rig inventory references, or invalid currencies detected.</div>')+
          (health.metadata.length
            ? '<div class="pn-health-note">Legacy sale metadata remains on '+health.metadata.length+' record(s). Resolved runtime semantics still work, but future edits can normalize these records.</div>'
            : '')+
        '</div>'+
      '</div>';
  }

  function pnInjectAfterContentOpen(html,block){
    const marker = '<div class="content">';
    const index = html.indexOf(marker);

    if (index<0) return html;

    return (
      html.slice(0,index+marker.length) +
      block +
      html.slice(index+marker.length)
    );
  }

  function pnPatchCommandFinancialCells(html,currency){
    const active = pnActiveCapital(currency);
    const market = pnMarketValue(currency);
    const spent = pnTotalSpent(currency);
    const unrealized = market-active;

    function replaceMetric(label,valueHtml){
      const rx = new RegExp(
        '(<span>'+label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'<\\/span><b(?: class="[^"]*")?>)[^<]*(<\\/b>)'
      );
      return valueHtml;
    }

    html = html.replace(
      /(<span>TOTAL SPENT<\/span><b>)[^<]*(<\/b>)/,
      '$1'+money(spent,currency)+'$2'
    );

    html = html.replace(
      /(<span>CAPITAL IN STOCK<\/span><b>)[^<]*(<\/b>)/,
      '$1'+money(active,currency)+'$2'
    );

    html = html.replace(
      /(<span>MARKET VALUE<\/span><b>)[^<]*(<\/b>)/,
      '$1'+money(market,currency)+'$2'
    );

    html = html.replace(
      /(<span>UNREALIZED PROFIT<\/span><b class="[^"]*">)[^<]*(<\/b>)/,
      '$1'+money(unrealized,currency)+'$2'
    );

    return html;
  }

  function pnWrapRoute(key,wrapper){
    if (typeof ROUTES === "undefined") return;

    const route = ROUTES.find(row=>row.key===key);
    if (!route || typeof route.render !== "function") return;

    const previous = route.render;

    route.render = function(){
      return wrapper(previous.apply(this,arguments));
    };
  }

  /*
    COMMAND:
    - correct PERSONAL exclusion in final visible financial cells
    - add build opportunity detection
  */
  pnWrapRoute("dashboard",function(html){
    const currency = displayCurrency();

    html = pnPatchCommandFinancialCells(html,currency);

    const block = pnBuildOpportunitiesHtml(currency);
    const latestMarker =
      '<div class="pn-command-grid">'+
      '<section class="panel pn-command-panel">'+
      '<div class="panel-head"><h2>LATEST SIGNALS</h2>';

    if (html.includes(latestMarker)){
      html = html.replace(latestMarker,block+latestMarker);
    } else {
      const close = '</div>';
      const pos = html.lastIndexOf(close);
      if (pos>=0) html = html.slice(0,pos)+block+html.slice(pos);
    }

    return html;
  });

  /*
    INTEL:
    capital velocity becomes a first-class operational metric.
  */
  pnWrapRoute("analytics",function(html){
    const currency = displayCurrency();
    const block =
      '<div class="pn-section-kicker">CAPITAL VELOCITY</div>'+
      pnCapitalVelocityHtml(currency);

    return pnInjectAfterContentOpen(html,block);
  });

  /*
    PARTS VAULT:
    add stock aging without changing the user's filters or records.
  */
  pnWrapRoute("inventory",function(html){
    return pnInjectAfterContentOpen(
      html,
      pnInventoryAgingHtml(displayCurrency())
    );
  });

  /*
    RIG BENCH:
    make the slot economics language match the new true-cost calculation.
  */
  pnWrapRoute("rigbuild",function(html){
    if (typeof state !== "undefined" && state.rigDraft){
      html = html.replace("Paid Price","True Cost");
      html = html.replace(
        '<div class="content rig-editor-content">',
        '<div class="content rig-editor-content"><div class="pn-true-cost-note"><b>TRUE COST BASIS ACTIVE</b><span>Inventory parts include purchase price plus logged repair expense.</span></div>'
      );
    }
    return html;
  });

  /*
    BLACKBOX:
    hide retired Build Planner from active product language and show data health.
    Legacy plan arrays remain in JSON backup compatibility.
  */
  pnWrapRoute("backup",function(html){
    html = html.replace(
      /<div class="rank-row"><div class="rank-body"><div class="rank-name">Plans<\/div><\/div><div class="rank-val">\d+<\/div><\/div>/,
      ''
    );

    html = html
      .replace(
        "projects, inventory, repairs, deals, sales, plans and the activity timeline",
        "builds, inventory, repairs, deals, sales, rigs and the activity timeline"
      )
      .replace(
        "every project, inventory item, repair, deal, sale, plan and timeline entry",
        "every build, inventory item, repair, deal, sale, rig and timeline entry"
      );

    return pnInjectAfterContentOpen(html,pnDataHealthHtml());
  });

  const style = document.createElement("style");
  style.textContent = `
  .pn-section-kicker{
    margin:0 0 7px;
    color:#a965d1;
    font-size:9px;
    font-weight:900;
    letter-spacing:.12em;
  }

  .pn-part-name{
    font-weight:650;
    letter-spacing:.006em;
    text-shadow:0 1px 0 rgba(0,0,0,.42);
  }

  .pn-part-name-poor{color:#9D9D9D}
  .pn-part-name-common{color:#FFFFFF}
  .pn-part-name-uncommon{color:#1EFF00}
  .pn-part-name-rare{color:#0070DD}
  .pn-part-name-epic{color:#A335EE}
  .pn-part-name-legendary{color:#FF8000}
  .pn-part-name-artifact{color:#E6CC80}
  .pn-part-name-subtle{filter:saturate(.78);opacity:.94}

  .pn-part-tier-inspector{
    flex:1 1 100%;
    margin-top:3px;
    border:1px solid var(--border);
    border-left:2px solid rgba(199,204,210,.38);
    background:rgba(14,11,18,.34);
  }

  .pn-part-tier-read{
    min-height:34px;
    display:flex;
    align-items:center;
    gap:12px;
    padding:7px 10px;
    font-family:var(--mono);
    font-size:9px;
    color:var(--text-mute);
  }

  .pn-part-tier-swatch{font-weight:800;white-space:nowrap}
  .pn-catalog-override{border-top:1px solid var(--border)}
  .pn-catalog-override>summary{cursor:pointer;padding:6px 10px;font-family:var(--stamp);font-size:8px;letter-spacing:.09em;color:var(--text-mute)}
  .pn-catalog-override .field{padding:3px 10px 9px}
  .pn-catalog-override small{display:block;margin-top:4px;color:var(--text-mute);font-family:var(--mono);font-size:8px}

  .pn-intel-strip{
    display:grid;
    grid-template-columns:repeat(5,minmax(0,1fr));
    border:1px solid var(--border);
    background:rgba(13,10,17,.82);
    margin-bottom:14px;
  }

  .pn-intel-cell{
    min-height:66px;
    padding:11px 13px;
    border-right:1px solid var(--border);
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:4px;
  }

  .pn-intel-cell:last-child{border-right:0}

  .pn-intel-cell span{
    color:var(--muted);
    font-size:9px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-intel-cell b{
    font-family:var(--mono);
    font-size:15px;
  }

  .pn-intel-cell small{
    color:var(--muted);
    font-size:8px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .pn-age-fresh{box-shadow:inset 0 2px 0 rgba(72,220,134,.40)}
  .pn-age-watch{box-shadow:inset 0 2px 0 rgba(235,177,68,.42)}
  .pn-age-stale{box-shadow:inset 0 2px 0 rgba(235,111,68,.46)}
  .pn-age-dead{box-shadow:inset 0 2px 0 rgba(240,62,80,.55)}

  .pn-build-opportunities{
    margin-bottom:14px;
  }

  .pn-opportunity-grid{
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:10px;
  }

  .pn-opportunity-card{
    border:1px solid rgba(166,68,220,.28);
    background:
      linear-gradient(145deg,rgba(111,27,143,.13),rgba(12,9,16,.50));
    padding:13px;
    min-width:0;
  }

  .pn-opportunity-head{
    display:flex;
    justify-content:space-between;
    gap:10px;
    align-items:flex-start;
  }

  .pn-opportunity-head>div{
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-opportunity-head span{
    color:#a965d1;
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-opportunity-head b{
    font-size:11px;
  }

  .pn-opportunity-parts{
    display:flex;
    flex-direction:column;
    gap:3px;
    margin:12px 0;
    padding:9px 0;
    border-top:1px solid var(--border);
    border-bottom:1px solid var(--border);
  }

  .pn-opportunity-parts span{
    color:var(--muted);
    font-size:9px;
    overflow:hidden;
    white-space:nowrap;
    text-overflow:ellipsis;
  }

  .pn-opportunity-money{
    display:grid;
    grid-template-columns:1fr;
    gap:7px;
  }

  .pn-opportunity-money>div{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:10px;
  }

  .pn-opportunity-money span{
    color:var(--muted);
    font-size:8px;
    letter-spacing:.06em;
    font-weight:800;
  }

  .pn-opportunity-money b{
    font-family:var(--mono);
    font-size:10px;
  }

  .pn-intelligence-empty{
    min-height:88px;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    gap:6px;
    color:var(--muted);
    text-align:center;
  }

  .pn-intelligence-empty b{
    color:var(--text);
    font-size:10px;
    letter-spacing:.08em;
  }

  .pn-intelligence-empty span{
    font-size:9px;
  }

  .pn-true-cost-note{
    display:flex;
    align-items:center;
    gap:12px;
    border:1px solid rgba(168,85,247,.28);
    border-left:3px solid #a855f7;
    background:rgba(91,31,119,.10);
    padding:9px 12px;
    margin-bottom:10px;
  }

  .pn-true-cost-note b{
    color:#bd72ea;
    font-size:9px;
    letter-spacing:.08em;
  }

  .pn-true-cost-note span{
    color:var(--muted);
    font-size:9px;
  }

  .pn-health-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    border:1px solid var(--border);
  }

  .pn-health-grid>div{
    padding:10px 12px;
    border-right:1px solid var(--border);
    display:flex;
    flex-direction:column;
    gap:4px;
  }

  .pn-health-grid>div:last-child{border-right:0}

  .pn-health-grid span{
    color:var(--muted);
    font-size:8px;
    font-weight:900;
    letter-spacing:.08em;
  }

  .pn-health-grid b{
    font-family:var(--mono);
    font-size:14px;
  }

  .pn-health-list{
    margin-top:10px;
    display:flex;
    flex-direction:column;
    gap:5px;
  }

  .pn-health-list div{
    border-left:2px solid var(--red);
    background:var(--red-wash);
    padding:7px 9px;
    color:var(--red);
    font-family:var(--mono);
    font-size:9px;
  }

  .pn-health-ok{
    margin-top:10px;
    color:var(--green);
    font-size:9px;
  }

  .pn-health-note{
    margin-top:8px;
    color:var(--amber);
    font-size:9px;
  }

  @media(max-width:1100px){
    .pn-intel-strip{
      grid-template-columns:repeat(2,minmax(0,1fr));
    }

    .pn-opportunity-grid{
      grid-template-columns:1fr;
    }
  }

  @media(max-width:650px){
    .pn-intel-strip,
    .pn-health-grid{
      grid-template-columns:1fr;
    }

    .pn-intel-cell,
    .pn-health-grid>div{
      border-right:0;
      border-bottom:1px solid var(--border);
    }
  }
  `;

  document.head.appendChild(style);
})();
