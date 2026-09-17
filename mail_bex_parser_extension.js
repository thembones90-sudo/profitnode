"use strict";

/* PROFITNODE MAIL — BEX PARSER V2
   Teaches the MAIL smart importer the real BEX / Bexexpress SMS + deep-link format.
   Parser-only extension. No Store / Actions / accounting mutation. */
(function(){
  if (typeof window !== "undefined" && window.__PN_MAIL_BEX_PARSER_V2) return;
  if (typeof window !== "undefined") window.__PN_MAIL_BEX_PARSER_V2 = true;

  const PN_BEX_TRACK_BASE = "https://bexexpress.rs/pracenje-posiljke?broj-posiljke=";
  const PN_BEX_TOOL_URL = "https://bexexpress.rs/pracenje-posiljke";

  function pnBexV2Fold(value){
    if (typeof mailFoldSerbian === "function") return mailFoldSerbian(value);
    return String(value||"").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"dj");
  }

  function pnBexV2ExtractTracking(raw){
    const text=String(raw||"");
    const patterns=[
      /[?&]broj-posiljke=(\d{9,12})\b/i,
      /\b(?:va[sš]a)\s+po[sš]iljka\s+(\d{9,12})\b/i,
      /\bistorija\s+po[sš]iljke\s*:?\s*(\d{9,12})\b/i,
      /\bpo[sš]iljka\s+(\d{9,12})\s+od\b/i
    ];
    for(const re of patterns){
      const hit=text.match(re);
      if(hit) return String(hit[1]);
    }
    return "";
  }

  function pnBexV2ExtractSender(raw){
    const text=String(raw||"");
    const flat=text.replace(/\s+/g," ").trim();
    const patterns=[
      /\b(?:va[sš]a)\s+po[sš]iljka\s+\d{9,12}\s+od\s+(.+?)\s+(?:c[eć]|će)\s+biti\s+dostavljena\b/i,
      /\bpo[sš]iljka\s+\d{9,12}\s+od\s+(.+?)\s+(?:c[eć]|će)\s+biti\s+dostavljena\b/i
    ];
    for(const re of patterns){
      const hit=flat.match(re);
      if(hit){
        return String(hit[1]||"").replace(/\s+/g," ").trim().replace(/[.,;:]+$/g,"");
      }
    }
    return typeof mailExtractSender === "function" ? mailExtractSender(text) : "";
  }

  function pnBexV2ExtractCod(raw){
    const text=String(raw||"");
    let hit=text.match(/\biznos\s+za\s+naplatu\s*:?\s*([0-9][0-9.\s]*(?:,[0-9]{1,2})?)\s*(din(?:ara)?|rsd|eur|€)?\b/i);
    if(!hit && typeof mailExtractCod === "function") return mailExtractCod(text);
    if(!hit) return {amount:null,currency:null};
    const amount=typeof mailParseSerbianAmount === "function"
      ? mailParseSerbianAmount(hit[1])
      : Number(String(hit[1]).replace(/\s/g,"").replace(/\./g,"").replace(",","."));
    const token=String(hit[2]||"din").toLowerCase();
    return {amount:Number.isFinite(amount)?amount:null,currency:(token==="eur"||token==="€")?"EUR":"RSD"};
  }

  function pnBexV2Status(raw){
    const f=pnBexV2Fold(raw);
    if(/\b(?:urucena|isporucena|dostavljena\s+primaocu|delivered)\b/.test(f)) return "delivered";
    if(/\b(?:vracena|vraca\s+se|povrat|returned)\b/.test(f)) return "returned";
    if(/\b(?:izgubljena|nestala|lost)\b/.test(f)) return "lost";
    if(/\b(?:kasni|odlozena|odlozeno|delayed)\b/.test(f)) return "delayed";
    if(/\b(?:spremna\s+za\s+preuzimanje|mozete\s+preuzeti|ready\s+for\s+pickup)\b/.test(f)) return "ready_for_pickup";
    if(/\b(?:kod\s+kurira\s+za\s+dostavu|ocekujete\s+kurira|ocekivati\s+kurira|biti\s+dostavljena\s+danas|preuzeto\s+od\s+posiljaoca|preuzeta\s+posiljka)\b/.test(f)) return "in_transit";
    if(/\bevidentirano\b/.test(f)) return "sent";
    return typeof mailGenericStatus === "function" ? mailGenericStatus(raw) : "in_transit";
  }

  function pnBexV2DetectScore(ctx){
    const raw=String((ctx&&ctx.raw)||"");
    const cleaned=String((ctx&&ctx.cleaned)||raw);
    const f=pnBexV2Fold(cleaned);
    const flat=cleaned.replace(/\s+/g," ").trim();
    const urls=Array.isArray(ctx&&ctx.urls)?ctx.urls:[];
    const tracking=pnBexV2ExtractTracking(raw)||pnBexV2ExtractTracking(cleaned)||String((ctx&&ctx.trackingNumber)||"");
    let score=0;

    if(/\bbexexpress\b/.test(f)||/\bbex\s+express\b/.test(f)) score+=45;
    else if(/\bbex\b/.test(f)) score+=35;

    if(/(?:www\.)?bex\.rs\b/.test(f)) score+=35;
    if(/bexexpress\.rs\b/.test(f)) score+=45;
    if(urls.some(u=>/bexexpress\.rs|(?:^|\.)bex\.rs/i.test(String(u)))) score+=40;

    if(/\b(?:va[sš]a)\s+po[sš]iljka\s+\d{9,12}\s+od\s+.+?\s+(?:c[eć]|će)\s+biti\s+dostavljena\s+danas\b/i.test(flat)) score+=30;
    if(tracking && /\d{9,12}/.test(tracking) && score>0) score+=20;
    if(/\biznos\s+za\s+naplatu\b/.test(f)) score+=5;
    return score;
  }

  function pnBexV2Parse(ctx){
    const raw=String((ctx&&ctx.raw)||"");
    const cleaned=String((ctx&&ctx.cleaned)||raw);
    const tracking=pnBexV2ExtractTracking(raw)||pnBexV2ExtractTracking(cleaned)||String((ctx&&ctx.trackingNumber)||"");
    if(!/^\d{9,12}$/.test(tracking)){
      return {ok:false,error:"BEX message found, but no valid BEX shipment number was detected."};
    }

    const cod=pnBexV2ExtractCod(raw);
    const trackingUrl=PN_BEX_TRACK_BASE+encodeURIComponent(tracking);
    let actionLinks=[];
    if(typeof mailBuildActionLinks === "function") actionLinks=mailBuildActionLinks(ctx)||[];
    if(typeof mailNormalizeActionLinks === "function"){
      actionLinks=mailNormalizeActionLinks(actionLinks.concat([{label:"BEX TRACKING",url:trackingUrl}]));
    }else{
      actionLinks=actionLinks.concat([{label:"BEX TRACKING",url:trackingUrl}]);
    }

    const todayHint=/\b(?:dostavljena\s+danas|ocekujete\s+kurira\s+danas|ocekivati\s+kurira\s+danas)\b/.test(pnBexV2Fold(raw));
    const receivedDate=typeof mailLocalDate === "function"
      ? mailLocalDate((ctx&&ctx.referenceDate)||new Date())
      : "";

    return {
      ok:true,
      parserId:"bex-v2",
      carrier:"BEX",
      confidence:"high",
      direction:"incoming",
      status:pnBexV2Status(raw),
      trackingNumber:tracking,
      trackingUrl:trackingUrl,
      sender:pnBexV2ExtractSender(raw),
      receiver:typeof mailExtractReceiver === "function" ? mailExtractReceiver(raw) : "",
      codAmount:cod.amount,
      currency:cod.currency||"RSD",
      urls:Array.isArray(ctx&&ctx.urls)?ctx.urls:[],
      actionLinks:actionLinks,
      pickupLocation:"",
      pickupPoint:"",
      pickupCode:typeof mailExtractPickupCode === "function" ? mailExtractPickupCode(raw) : "",
      pickupAvailableFrom:"",
      pickupDeadline:"",
      courierPhone:typeof mailExtractCourierPhone === "function" ? mailExtractCourierPhone(raw) : "",
      expectedDeliveryDate:todayHint?receivedDate:"",
      notes:todayHint?"BEX delivery expected today.":"",
      receivedDate:receivedDate
    };
  }

  /* Manual carrier selection gets the BEX tracking tool; smart import gets the exact deep link. */
  if(typeof MAIL_CARRIER_URL_PRESETS !== "undefined"){
    MAIL_CARRIER_URL_PRESETS.bex=PN_BEX_TOOL_URL;
    MAIL_CARRIER_URL_PRESETS.bexexpress=PN_BEX_TOOL_URL;
  }

  if(typeof MAIL_CARRIER_DETECTORS !== "undefined"){
    const existing=MAIL_CARRIER_DETECTORS.find(d=>d&&d.carrier==="BEX");
    if(existing){
      existing.id="bex-v2";
      existing.score=pnBexV2DetectScore;
      existing.parse=pnBexV2Parse;
    }else{
      MAIL_CARRIER_DETECTORS.push({id:"bex-v2",carrier:"BEX",score:pnBexV2DetectScore,parse:pnBexV2Parse});
    }
  }

  globalThis.PN_BEX_PARSER_V2={
    trackBase:PN_BEX_TRACK_BASE,
    extractTracking:pnBexV2ExtractTracking,
    extractSender:pnBexV2ExtractSender,
    extractCod:pnBexV2ExtractCod,
    status:pnBexV2Status,
    score:pnBexV2DetectScore,
    parse:pnBexV2Parse
  };

  console.info("[PROFITNODE] MAIL BEX PARSER V2 ACTIVE");
})();
