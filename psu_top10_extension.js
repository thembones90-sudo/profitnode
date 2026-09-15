"use strict";

HardwareCatalog.psuTop10Entries=HardwareCatalog.psuTop10Entries||[];
HardwareCatalog.psuTop10Error=null;

function pnPsuCompact(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]+/g,"")}
function pnPsuBrandKey(value){
  const n=pnNorm(value);
  if(n==="FSP"||n==="FORTRON"||n==="FSP FORTRON")return"FSP";
  if(n==="GIGABYTE"||n==="AORUS"||n==="GIGABYTE AORUS")return"GIGABYTE AORUS";
  if(n==="BE QUIET")return"BE QUIET";
  return n
}
function pnPsuSafety(level,rating){
  level=String(level||"none").toLowerCase();
  if(level==="critical")return"REJECT";
  if(level==="avoid"||level==="caution")return"CAUTION";
  return Number(rating)>=8.8?"APPROVED":"ACCEPTABLE"
}
function pnPsuOverlayObject(row){
  const brand=row[0],series=row[1],watts=row[2],rating=Number(row[3])||0,tier=row[4]||"UNRATED",
        confidence=row[5]||"UNKNOWN",warning=row[6]||"none",aliases=Array.isArray(row[7])?row[7]:[];
  return {
    brand,series,model:series+(watts?" "+watts+"W":""),wattage_w:Number(watts)||null,
    revision_generation:"TOP10-2026-09",
    form_factor:/\bSFX-L\b/i.test(series)?"SFX-L":/\bSFX\b/i.test(series)?"SFX":/\bTFX\b/i.test(series)?"TFX":"ATX",
    atx_spec:null,efficiency_cert:null,modularity:null,plus12v_output_w:null,eps_cpu_connectors:null,
    pcie_6_2_connectors:null,pcie_16pin_connectors:null,native_12vhpwr_or_12v2x6:null,
    connector_data_confidence:"DERIVED",warranty_years:null,quality_score:Math.round(rating*10),
    quality_class:tier,safety_status:pnPsuSafety(warning,rating),evidence_level:"PN_TOP10_"+String(confidence).toUpperCase(),
    pn_rating_10:rating,pn_tier:tier,pn_confidence:confidence,pn_warning_level:warning,pn_aliases:aliases,pn_top10:true
  }
}
function pnPsuHaystack(item){
  return [item.brand,item.series,item.model,...(Array.isArray(item.pn_aliases)?item.pn_aliases:[])].filter(Boolean).join(" ")
}
function pnPsuMatches(item,query){
  const r=pnNorm(query);
  if(r.length<2)return false;
  const compact=pnPsuCompact(query),hay=pnPsuHaystack(item),h=pnNorm(hay),hc=pnPsuCompact(hay);
  if(compact.length>=3&&hc.includes(compact))return true;
  return r.split(" ").filter(Boolean).every(token=>h.includes(token)||hc.includes(pnPsuCompact(token)))
}
function pnPsuScore(query,item){
  const r=pnNorm(query),c=pnPsuCompact(query),h=pnNorm(pnPsuHaystack(item)),hc=pnPsuCompact(pnPsuHaystack(item)),
        sr=pnNorm(item.series||""),sc=pnPsuCompact(item.series||"");
  let s=item.pn_top10?100:0;
  if(h===r||hc===c)s+=80;else if(h.startsWith(r)||hc.startsWith(c))s+=40;
  if(sr===r||sc===c)s+=110;else if(sr.startsWith(r)||sc.startsWith(c))s+=60;
  if((item.pn_aliases||[]).some(x=>pnNorm(x)===r||pnPsuCompact(x)===c))s+=120;
  return s
}
function pnPsuKey(item){return pnPsuBrandKey(item.brand)+"|"+pnNorm(item.model)}
function pnPsuFindLegacy(legacy,overlay){
  const brand=pnPsuBrandKey(overlay.brand),w=Number(overlay.wattage_w)||0,s=pnNorm(overlay.series);
  const matches=(legacy||[]).filter(x=>{
    if(pnPsuBrandKey(x.brand)!==brand)return false;
    if(w&&Number(x.wattage_w)!==w)return false;
    const xs=pnNorm(x.series||"");
    return xs&&s&&(s.includes(xs)||xs.includes(s))
  });
  return matches.length===1?matches[0]:null
}
const PNTop10BaseLoadHardwareCatalog=loadHardwareCatalog;
loadHardwareCatalog=async function(){
  await PNTop10BaseLoadHardwareCatalog();
  try{
    const source=globalThis.PN_PSU_TOP10_ROWS||[];
    if(!source.length)throw Error("PSU TOP10 data rows missing");
    const legacy=(HardwareCatalog.psus||[]).slice();
    const prepared=source.map(row=>{
      const item=pnPsuOverlayObject(row),match=pnPsuFindLegacy(legacy,item);
      if(!match)return item;
      const enriched=Object.assign({},item);
      ["form_factor","atx_spec","efficiency_cert","modularity","plus12v_output_w","eps_cpu_connectors","pcie_6_2_connectors","pcie_16pin_connectors","native_12vhpwr_or_12v2x6","warranty_years"].forEach(key=>{
        if((enriched[key]===null||enriched[key]===undefined||enriched[key]==="")&&match[key]!==null&&match[key]!==undefined)enriched[key]=match[key]
      });
      if(match.connector_data_confidence==="OFFICIAL")enriched.connector_data_confidence="OFFICIAL";
      return enriched
    });
    const seen=new Set(),merged=[];
    prepared.concat(legacy).forEach(item=>{
      const key=pnPsuKey(item);
      if(seen.has(key))return;
      seen.add(key);merged.push(item)
    });
    HardwareCatalog.psuTop10Entries=prepared;
    HardwareCatalog.psus=merged;
    HardwareCatalog.psuTop10Error=null
  }catch(err){
    HardwareCatalog.psuTop10Error=err&&err.message?err.message:String(err);
    console.warn("PROFITNODE: PSU TOP10 overlay could not load",err)
  }
  return HardwareCatalog
};

const PNTop10BaseCatalogSearch=catalogSearch;
catalogSearch=function(slotKey,query){
  if(slotKey!=="PSU")return PNTop10BaseCatalogSearch(slotKey,query);
  const r=pnNorm(query);if(r.length<2)return[];
  return(HardwareCatalog.psus||[]).filter(item=>item.availability_status!=="DOCUMENTED_UNRELEASED"&&pnPsuMatches(item,query))
    .sort((a,b)=>pnPsuScore(query,b)-pnPsuScore(query,a)||String(a.series||a.model).localeCompare(String(b.series||b.model))||(Number(a.wattage_w)||99999)-(Number(b.wattage_w)||99999)||String(a.model).localeCompare(String(b.model))).slice(0,30)
};

const PNTop10BaseCatalogFind=catalogFind;
catalogFind=function(slotKey,label){
  if(slotKey!=="PSU")return PNTop10BaseCatalogFind(slotKey,label);
  const r=pnNorm(label),c=pnPsuCompact(label);
  if(r){
    const exact=(HardwareCatalog.psus||[]).find(item=>{
      const full=String(item.brand||"")+" "+String(item.model||"");
      if(pnNorm(full)===r||pnPsuCompact(full)===c)return true;
      return(Array.isArray(item.pn_aliases)?item.pn_aliases:[]).some(alias=>pnNorm(alias)===r||pnPsuCompact(alias)===c)
    });
    if(exact)return exact
  }
  return PNTop10BaseCatalogFind(slotKey,label)
};

const PNTop10BaseCatalogSearchAll=catalogSearchAll;
catalogSearchAll=function(query){
  const base=(PNTop10BaseCatalogSearchAll(query)||[]).filter(x=>x.cat!=="PSU");
  const psu=catalogSearch("PSU",query).slice(0,10).map(item=>({cat:"PSU",item,label:pnNorm((item.brand||"")+" "+item.model)}));
  return base.concat(psu).slice(0,10)
};

const PNTop10BaseRenderCatalogMeta=renderCatalogMeta;
renderCatalogMeta=function(slotKey,item,slot){
  if(slotKey!=="PSU"||!item||!item.pn_top10)return PNTop10BaseRenderCatalogMeta(slotKey,item,slot);
  const rating=Number(item.pn_rating_10)||0,tier=item.pn_tier||"UNRATED",level=String(item.pn_warning_level||"none").toLowerCase();
  const tone=level==="critical"?"pn-psu-reject":level==="avoid"||level==="caution"?"pn-psu-caution":item.safety_status==="APPROVED"?"pn-psu-approved":"pn-psu-acceptable";
  const warning=level==="critical"?"CRITICAL":level==="avoid"?"AVOID":level==="caution"?"CAUTION":"OK";
  return'<div class="rig-catalog-meta">'+
    '<span class="pn-meta-pill pn-psu-quality"><span>Rating</span><b>'+escHtml(rating.toFixed(1))+'/10</b></span>'+
    '<span class="pn-meta-pill"><span>Tier</span><b>'+escHtml(tier)+'</b></span>'+
    '<span class="pn-meta-pill '+tone+'"><span>Status</span><b>'+escHtml(warning)+'</b></span>'+
    '<span class="pn-meta-detail">'+(item.wattage_w?item.wattage_w+"W":"WATTAGE UNKNOWN")+' · confidence '+escHtml(item.pn_confidence||"UNKNOWN")+'</span>'+
    '</div>'
};

const PNTop10BaseRenderRigSlotRow=renderRigSlotRow;
renderRigSlotRow=function(slotKey,rig){
  if(slotKey!=="PSU")return PNTop10BaseRenderRigSlotRow(slotKey,rig);
  const touched=[];
  (HardwareCatalog.psus||[]).forEach(item=>{
    if(!item.pn_top10)return;
    touched.push([item,item.quality_score]);
    item.quality_score=(Number(item.pn_rating_10)||0).toFixed(1)+"/10"
  });
  try{return PNTop10BaseRenderRigSlotRow(slotKey,rig)}
  finally{touched.forEach(x=>x[0].quality_score=x[1])}
};

if(typeof psuMatchProfile==="function"){
  const PNTop10BasePsuMatchProfile=psuMatchProfile;
  psuMatchProfile=function(rig){
    const profile=PNTop10BasePsuMatchProfile(rig),data=profile&&profile.psuData;
    if(!data||!data.pn_top10)return profile;
    profile.rating10=Number(data.pn_rating_10)||null;profile.pnTier=data.pn_tier||null;profile.confidence=data.pn_confidence||null;
    const level=String(data.pn_warning_level||"none").toLowerCase();
    if(level==="critical"){
      profile.final="NOT APPROVED";profile.warnings.unshift("CRITICAL PSU WARNING — "+data.pn_rating_10+"/10 · "+data.pn_tier+".")
    }else if(level==="avoid"){
      if(profile.final==="EXCELLENT"||profile.final==="GOOD")profile.final="MARGINAL";
      profile.warnings.unshift("PSU AVOID FLAG — "+data.pn_rating_10+"/10 · "+data.pn_tier+".")
    }else if(level==="caution"){
      if(profile.final==="EXCELLENT")profile.final="MARGINAL";
      profile.warnings.unshift("PSU CAUTION — "+data.pn_rating_10+"/10 · "+data.pn_tier+".")
    }
    return profile
  }
}

const psuTop10Style=document.createElement("style");
psuTop10Style.textContent=".pn-psu-note{display:block;max-width:780px;margin-top:4px;opacity:.82}";
document.head.appendChild(psuTop10Style);
