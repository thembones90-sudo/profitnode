"use strict";

/* PROFITNODE — INTEL REFINEMENT V2
   Read-only analytics refinement. Keeps existing CAPITAL VELOCITY and core
   allocation logic, adds Sales Snapshot, Classification Health, clearer
   platform/condition buckets, Top Realized Sales, Best Acquisitions, and a
   collapsible attribution explanation. No accounting or inventory mutation. */
(function(){
  if (window.__pnIntelRefinementV2Installed) return;
  window.__pnIntelRefinementV2Installed = true;

  if (typeof ROUTES === "undefined") return;
  const route = ROUTES.find(row=>row.key==="analytics");
  if (!route || typeof route.render !== "function") return;

  const previous = route.render;

  function completedSales(){
    const rows = Store.all("sales") || [];
    return rows.filter(s=>typeof saleIsCompleted!=="function" || saleIsCompleted(s));
  }

  function saleItems(sale){
    if (!sale) return [];
    if (sale.projectId){
      return (Store.all("inventory")||[]).filter(item=>item.assignedProjectId===sale.projectId);
    }
    if (sale.inventoryItemId){
      const item=Store.get("inventory",sale.inventoryItemId);
      return item?[item]:[];
    }
    return [];
  }

  function inCurrency(value,from,to){
    const n=Number(value)||0;
    return typeof convert==="function"?convert(n,from||to,to):n;
  }

  function metricsFor(sale,currency){
    const d=typeof saleDerived==="function"?saleDerived(sale):{};
    const revenue=inCurrency(sale.buyerPrice,sale.currency,currency);
    const profit=inCurrency(d.profit,sale.currency,currency);
    const cogs=revenue-profit;
    return {
      sale,
      revenue,
      profit,
      cogs,
      roi:Number.isFinite(Number(d.roi))?Number(d.roi):null,
      days:Number.isFinite(Number(d.daysHeld))?Number(d.daysHeld):null,
      items:saleItems(sale)
    };
  }

  function sourceBucket(metric){
    const rows=metric.items;
    if (!rows.length){
      const fallback=metric.sale.source||"UNCLASSIFIED";
      return STATUS_LABEL(String(fallback));
    }
    const values=[...new Set(rows.map(x=>STATUS_LABEL(String(x.source||"UNCLASSIFIED"))))];
    return values.length===1?values[0]:"MIXED";
  }

  function isSourceClassified(item){
    if(!item||!item.source) return false;
    return item.source!=="OTHER" || !!String(item.sourceDetail||"").trim();
  }

  function coverage(metrics,test,denominatorFilter){
    const pool=denominatorFilter?metrics.filter(denominatorFilter):metrics;
    const den=pool.length;
    const num=pool.filter(test).length;
    return {num,den,pct:den?Math.round(num/den*100):null};
  }

  function healthTone(p){
    if(p==null) return "muted";
    if(p>=90) return "good";
    if(p>=65) return "warn";
    return "bad";
  }

  function healthCell(label,cov,sub){
    const value=cov.pct==null?"—":cov.pct+"%";
    const count=cov.den?cov.num+" / "+cov.den:"NO SAMPLE";
    return '<div class="pn-intel-health-cell '+healthTone(cov.pct)+'">'+
      '<span>'+label+'</span><b>'+value+'</b><small>'+count+(sub?" · "+sub:"")+'</small></div>';
  }

  function moneyHtml(value,currency,tone){
    const cls=tone?" "+tone:"";
    return '<b class="pn-intel-snapshot-value'+cls+'">'+money(value,currency)+'</b>';
  }

  function snapshotCell(label,valueHtml,sub){
    return '<div class="pn-intel-snapshot-cell"><span>'+label+'</span>'+valueHtml+(sub?'<small>'+sub+'</small>':"")+'</div>';
  }

  function rankRows(metrics,currency,kind){
    if(!metrics.length) return '<p class="hint" style="margin:0">No completed sales yet.</p>';
    return metrics.slice(0,5).map((m,i)=>{
      const name=escHtml(m.sale.itemName||"Unnamed sale");
      const roi=m.roi==null?"—":pct(m.roi);
      const hold=m.days==null?"—":Math.round(m.days)+"D";
      const source=escHtml(sourceBucket(m));
      const meta=kind==="acquisition"
        ? source+' · COST '+money(m.cogs,currency)+' · ROI '+roi
        : 'ROI '+roi+' · '+hold+' HELD';
      return '<div class="rank-row"><div class="rank-num">'+String(i+1).padStart(2,"0")+'</div>'+ 
        '<div class="rank-body"><div class="rank-name">'+name+'</div><div class="rank-meta">'+meta+'</div></div>'+ 
        '<div class="rank-val" style="color:'+(m.profit>=0?'var(--green)':'var(--red)')+'">'+money(m.profit,currency)+'</div></div>';
    }).join("");
  }

  function makeNode(html){
    const t=document.createElement("template");
    t.innerHTML=html.trim();
    return t.content.firstElementChild;
  }

  function findPanel(root,title){
    return [...root.querySelectorAll(".panel")].find(panel=>{
      const h=panel.querySelector(".panel-head h2");
      return h&&h.textContent.trim()===title;
    })||null;
  }

  function styleOnce(){
    if(document.getElementById("pn-intel-refinement-v2-style")) return;
    const style=document.createElement("style");
    style.id="pn-intel-refinement-v2-style";
    style.textContent=`
      .pn-section-kicker.pn-intel-v2-kicker{margin:14px 0 7px;color:#b875d8;}
      .pn-intel-v2-kpis,.pn-intel-health-grid{
        display:grid;grid-template-columns:repeat(5,minmax(0,1fr));
        border:1px solid rgba(165,93,191,.20);background:rgba(17,12,24,.72);margin-bottom:14px;
      }
      .pn-intel-snapshot-cell,.pn-intel-health-cell{
        min-width:0;padding:13px 14px;border-right:1px solid rgba(255,255,255,.08);
      }
      .pn-intel-snapshot-cell:last-child,.pn-intel-health-cell:last-child{border-right:0;}
      .pn-intel-snapshot-cell>span,.pn-intel-health-cell>span{
        display:block;color:#9e96aa;font:800 9px var(--mono);letter-spacing:.06em;margin-bottom:5px;
      }
      .pn-intel-snapshot-value,.pn-intel-health-cell>b{display:block;font:900 17px var(--mono);color:#ebe7ef;line-height:1.1;}
      .pn-intel-snapshot-value.pos{color:var(--green);}.pn-intel-snapshot-value.neg{color:var(--red);}
      .pn-intel-snapshot-cell>small,.pn-intel-health-cell>small{display:block;margin-top:6px;color:#81798c;font:700 8px var(--mono);line-height:1.3;}
      .pn-intel-health-cell.good>b{color:var(--green);}.pn-intel-health-cell.warn>b{color:#f1b64c;}.pn-intel-health-cell.bad>b{color:var(--red);}.pn-intel-health-cell.muted>b{color:#8e8797;}
      .pn-intel-panel-sub{margin:7px 0 0;color:#81798c;font:700 8px var(--mono);letter-spacing:.02em;line-height:1.45;}
      .pn-intel-counts{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);}
      .pn-intel-counts span{padding:3px 6px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);color:#8f879a;font:700 8px var(--mono);}
      .pn-intel-counts b{color:#dcd7e2;}
      .pn-intel-method{margin-top:16px;border-top:1px dashed rgba(255,255,255,.10);padding:11px 0 0;color:#8e8595;font:9px/1.55 var(--mono);}
      .pn-intel-method summary{cursor:pointer;color:#beb6c7;font-weight:900;letter-spacing:.04em;}
      .pn-intel-method>div{padding-top:9px;max-width:1200px;}
      .pn-intel-two-col{margin-top:16px;}
      @media(max-width:980px){.pn-intel-v2-kpis,.pn-intel-health-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.pn-intel-snapshot-cell:nth-child(2n),.pn-intel-health-cell:nth-child(2n){border-right:0;}}
      @media(max-width:620px){.pn-intel-v2-kpis,.pn-intel-health-grid{grid-template-columns:1fr}.pn-intel-snapshot-cell,.pn-intel-health-cell{border-right:0;border-bottom:1px solid rgba(255,255,255,.07)}}
    `;
    document.head.appendChild(style);
  }

  function transform(html){
    styleOnce();
    const currency=displayCurrency();
    const sales=completedSales();
    const metrics=sales.map(s=>metricsFor(s,currency));
    const totalRevenue=metrics.reduce((a,m)=>a+m.revenue,0);
    const totalProfit=metrics.reduce((a,m)=>a+m.profit,0);
    const totalCogs=metrics.reduce((a,m)=>a+m.cogs,0);
    const avgProfit=metrics.length?totalProfit/metrics.length:0;
    const wins=metrics.filter(m=>m.profit>0).length;
    const winRate=metrics.length?wins/metrics.length*100:null;

    const template=document.createElement("template");
    template.innerHTML=html;
    const root=template.content;
    const content=root.querySelector(".content");
    if(!content) return html;

    /* Capital Velocity stays first-class; only clarify the name. */
    content.querySelectorAll(".pn-intel-cell span").forEach(span=>{
      if(span.textContent.trim()==="30D RETURN PACE") span.textContent="30D CAPITAL TURN";
    });

    const oldKpi=[...content.children].find(el=>el.classList&&el.classList.contains("kpi-grid"));
    if(oldKpi){
      const kicker=makeNode('<div class="pn-section-kicker pn-intel-v2-kicker">SALES SNAPSHOT</div>');
      const snapshot=makeNode('<div class="pn-intel-v2-kpis">'+
        snapshotCell("REALIZED PROFIT",moneyHtml(totalProfit,currency,totalProfit>=0?"pos":"neg"),metrics.length+" COMPLETED SALES")+
        snapshotCell("GROSS REVENUE",moneyHtml(totalRevenue,currency,""),"CASH RECEIVED")+
        snapshotCell("COGS",moneyHtml(totalCogs,currency,""),"RECOVERED COST BASIS")+
        snapshotCell("AVG PROFIT / SALE",moneyHtml(avgProfit,currency,avgProfit>=0?"pos":"neg"),metrics.length?"PER COMPLETED SALE":"NO SAMPLE")+
        snapshotCell("WIN RATE",'<b class="pn-intel-snapshot-value '+(winRate!=null&&winRate>=50?"pos":"neg")+'">'+(winRate==null?"—":winRate.toFixed(1)+"%")+'</b>',wins+" PROFITABLE / "+metrics.length)+
      '</div>');

      const sourceCov=coverage(metrics,m=>m.items.length?m.items.every(isSourceClassified):!!m.sale.source);
      const categoryCov=coverage(metrics,m=>m.items.length?m.items.every(i=>!!i.category&&i.category!=="OTHER"):!!m.sale.category&&m.sale.category!=="OTHER");
      const conditionCov=coverage(metrics,m=>m.items.length?m.items.every(i=>!!i.condition):!!m.sale.condition);
      const cpuRelevant=m=>m.items.some(i=>String(i.category||"").toUpperCase()==="CPU");
      const platformCov=coverage(metrics,m=>m.items.filter(i=>String(i.category||"").toUpperCase()==="CPU").every(i=>{try{return !!classifyPlatform(i);}catch(e){return false;}}),cpuRelevant);
      const linkageCov=coverage(metrics,m=>!!(m.sale.projectId||m.sale.inventoryItemId));
      const hk=makeNode('<div class="pn-section-kicker pn-intel-v2-kicker">CLASSIFICATION HEALTH</div>');
      const health=makeNode('<div class="pn-intel-health-grid">'+
        healthCell("CATEGORY",categoryCov,"SALE ATTRIBUTION")+
        healthCell("SOURCE",sourceCov,"PURCHASE ORIGIN")+
        healthCell("CPU PLATFORM",platformCov,"CPU-BEARING SALES")+
        healthCell("CONDITION",conditionCov,"ACQUISITION STATE")+
        healthCell("BUILD / PART LINK",linkageCov,"TRACEABILITY")+
      '</div>');
      oldKpi.replaceWith(kicker,snapshot,hk,health);
    }

    const platformPanel=findPanel(content,"Profit by CPU Platform");
    if(platformPanel && typeof profitByPlatform==="function" && typeof renderBarChart==="function"){
      const obj=profitByPlatform(currency)||{};
      const rows=Object.entries(obj).map(([label,value])=>({label,value}));
      const allocated=rows.reduce((a,r)=>a+(Number(r.value)||0),0);
      const remainder=totalProfit-allocated;
      if(Math.abs(remainder)>.5) rows.push({label:"NON-CPU / UNCLASSIFIED",value:remainder});
      const body=platformPanel.querySelector(".panel-body");
      if(body){
        body.innerHTML=renderBarChart(rows,currency)+
          '<div class="pn-intel-panel-sub">CPU PLATFORM attributes only CPU-linked profit. The remainder is shown explicitly instead of silently disappearing.</div>';
      }
    }

    const conditionPanel=findPanel(content,"Working vs. Faulty Purchases");
    if(conditionPanel && typeof profitByCondition==="function" && typeof renderBarChart==="function"){
      const h=conditionPanel.querySelector(".panel-head h2");
      if(h) h.textContent="Profit by Acquisition Condition";
      const rows=Object.entries(profitByCondition(currency)||{}).map(([label,value])=>({label:label==="—"?"UNCLASSIFIED":label,value}));
      const body=conditionPanel.querySelector(".panel-body");
      if(body) body.innerHTML=renderBarChart(rows,currency);
    }

    const sourcePanel=findPanel(content,"Profit by Purchase Source");
    if(sourcePanel){
      const counts={};
      metrics.forEach(m=>{const key=sourceBucket(m);counts[key]=(counts[key]||0)+1;});
      const body=sourcePanel.querySelector(".panel-body");
      if(body && Object.keys(counts).length){
        body.insertAdjacentHTML("beforeend",'<div class="pn-intel-counts">'+Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<span>'+escHtml(k)+' <b>'+v+'</b> '+(v===1?'SALE':'SALES')+'</span>').join("")+'</div>');
      }
    }

    const buildPanel=findPanel(content,"Top Builds by Profit");
    if(buildPanel){
      const topSales=metrics.slice().sort((a,b)=>b.profit-a.profit);
      const bestAcq=metrics.filter(m=>m.roi!=null).slice().sort((a,b)=>b.roi-a.roi);
      const intelligence=makeNode('<div class="two-col pn-intel-two-col">'+
        '<div class="panel"><div class="panel-head"><h2>Top Realized Sales</h2></div><div class="panel-body"><div class="rank-list">'+rankRows(topSales,currency,"sale")+'</div></div></div>'+ 
        '<div class="panel"><div class="panel-head"><h2>Best Acquisitions</h2></div><div class="panel-body"><div class="rank-list">'+rankRows(bestAcq,currency,"acquisition")+'</div></div></div>'+ 
      '</div>');
      buildPanel.before(intelligence);
    }

    const note=content.querySelector(".info-note");
    if(note){
      const body=note.innerHTML.replace(/<b>HOW THIS IS ALLOCATED<\/b>\s*—\s*/i,"");
      const details=makeNode('<details class="pn-intel-method"><summary>HOW INTEL ATTRIBUTES PROFIT</summary><div>'+body+'</div></details>');
      note.replaceWith(details);
    }

    return template.innerHTML;
  }

  route.render=function(){
    return transform(previous.apply(this,arguments));
  };

  console.info("[PROFITNODE] INTEL REFINEMENT V2 ACTIVE");
})();
