"use strict";

/* PROFITNODE MONTHLY TRIBUTE QUESTLINE V2.6 PICTURE OVERRIDE FIX
   Full replacement for V1:
   - preserves recurring-obligation accounting/payment engine
   - upgrades Monthly Tribute into a War Chest campaign board
   - deliberately does NOT touch the Fortress gauge implementation
*/
(function(){
  if(globalThis.__PN_MONTHLY_TRIBUTE_V2) return;
  globalThis.__PN_MONTHLY_TRIBUTE_V2 = true;

  const SEED_FLAG = "monthlyTributeSeededV1";
  const SEED = [
    {tributeKey:"RENT",name:"RENT",amount:250,currency:"EUR",category:"ESSENTIALS"},
    {tributeKey:"UTILITIES",name:"BILLS / UTILITIES",amount:100,currency:"EUR",category:"ESSENTIALS"},
    {tributeKey:"SBB",name:"SBB INTERNET",amount:50,currency:"USD",category:"ESSENTIALS"},
    {tributeKey:"PHONE",name:"PHONE BILL",amount:2000,currency:"RSD",category:"ESSENTIALS"},
    {tributeKey:"SUNO",name:"SUNO",amount:30,currency:"USD",category:"SUBSCRIPTIONS"},
    {tributeKey:"SPOTIFY",name:"SPOTIFY",amount:12,currency:"EUR",category:"SUBSCRIPTIONS"},
    {tributeKey:"NETFLIX",name:"NETFLIX",amount:15,currency:"EUR",category:"SUBSCRIPTIONS"},
    {tributeKey:"GPT",name:"GPT",amount:20,currency:"USD",category:"SUBSCRIPTIONS"},
    {tributeKey:"BIG_PICKLE",name:"BIG PICKLE",amount:10,currency:"USD",category:"SUBSCRIPTIONS"}
  ];

  const UI = {
    payId:null,
    error:"",
    flash:"",
    justSlain:null,
    justCompleted:false,
    addOpen:false
  };

  const ICONS = {
    RENT:'<img class="pn-tribute-picture-icon pn-tribute-picture-icon-rent" src="assets/tribute-icons/rent_fortress_key_emblem.png?v=tribute-picture-icons-override-fix-v2" alt="" aria-hidden="true">',
    UTILITIES:'<img class="pn-tribute-picture-icon pn-tribute-picture-icon-utilities" src="assets/tribute-icons/utilities_circuit_power_emblem.png?v=tribute-picture-icons-override-fix-v2" alt="" aria-hidden="true">',
    SBB:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.4 9.9a11.8 11.8 0 0 1 15.2 0M7.2 13a7.7 7.7 0 0 1 9.6 0M10 16.1a3.3 3.3 0 0 1 4 0"/><circle cx="12" cy="19.1" r="1.1" fill="currentColor" stroke="none"/></svg>',
    PHONE:'<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="7.6" y="3.4" width="8.8" height="17.2" rx="2.1" stroke="#61e0a9" stroke-width="1.65"/><path d="M10 6h4" stroke="#a1f3cf" stroke-width="1.25"/><circle cx="12" cy="17.7" r=".8" fill="#61e0a9" stroke="none"/><path d="M16.7 8.6c1.3.8 2 2.1 2 3.6 0 1.5-.7 2.9-2 3.7M19 6.7c2 1.3 3.1 3.2 3.1 5.5S21 16.5 19 17.8" stroke="#61e0a9" stroke-width="1.35"/></g></svg>',
    SUNO:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 9.3c1.4-2.9 2.8 2.9 4.2 0s2.8 2.9 4.2 0 2.8 2.9 4.2 0 2.2-.8 3.2-.8"/><path d="M4.2 14.7c1.6-3.2 3.2 3.2 4.8 0s3.2 3.2 4.8 0 3.2 3.2 4.8 0"/></svg>',
    SPOTIFY:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M8 9.6c3.2-.7 6.1-.4 8.7 1M8.5 12.6c2.6-.4 4.9-.1 7 .9M8.9 15.3c2-.2 3.8 0 5.4.7"/></svg>',
    NETFLIX:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15M17 4.5v15"/><path d="M7 4.5 17 19.5"/></svg>',
    GPT:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.2a3.7 3.7 0 0 1 6.3 2.6v.4a3.7 3.7 0 0 1 1.4 6.4l-.4.2a3.7 3.7 0 0 1-4.9 5l-.3-.2a3.7 3.7 0 0 1-6.4 0l-.3.2a3.7 3.7 0 0 1-4.9-5l-.4-.2a3.7 3.7 0 0 1 1.4-6.4v-.4A3.7 3.7 0 0 1 12 4.2Z"/><path d="M9 7.6h6M7.6 12h8.8M9 16.4h6"/></svg>',
    BIG_PICKLE:'<img class="pn-tribute-picture-icon pn-tribute-picture-icon-pickle" src="assets/tribute-icons/big_pickle_code_relic_emblem.png?v=tribute-picture-icons-override-fix-v2" alt="" aria-hidden="true">',
    DEFAULT:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 8.5 8.5-8.5 8.5L3.5 12Z"/></svg>'
  };

  function cycleKey(){
    return String(todayISO()).slice(0,7);
  }

  function cycleLabel(){
    const p=cycleKey().split("-"),y=Number(p[0]),m=Number(p[1])-1;
    return new Intl.DateTimeFormat("en",{month:"long",year:"numeric"}).format(new Date(y,m,1)).toUpperCase();
  }

  function tributeId(){
    return "tribute-"+(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()));
  }

  function paymentHistory(o){
    if(!Array.isArray(o.paymentHistory)) o.paymentHistory=[];
    return o.paymentHistory;
  }

  function currentPayment(o){
    const c=cycleKey();
    return paymentHistory(o).find(p=>p&&p.cycle===c)||null;
  }

  function isQuest(o){
    return !!(o&&o.questline===true);
  }

  function isPaid(o){
    return isQuest(o) ? !!currentPayment(o) : String(o&&o.status||"PENDING").toUpperCase()==="PAID";
  }

  function canonicalSeedObject(def){
    return {
      id:"monthly-tribute-"+def.tributeKey.toLowerCase().replace(/_/g,"-"),
      tributeKey:def.tributeKey,
      questline:true,
      name:def.name,
      amount:def.amount,
      currency:def.currency,
      status:"PENDING",
      category:def.category,
      dueDate:"",
      dueDay:null,
      recurring:true,
      note:"",
      paymentHistory:[]
    };
  }

  function ensureSeed(treasury){
    if(!treasury || typeof treasury!=="object") return false;
    treasury.settings=treasury.settings||{};
    treasury.obligations=Array.isArray(treasury.obligations)?treasury.obligations:[];
    let changed=false;

    if(!treasury.settings[SEED_FLAG]){
      SEED.forEach(def=>{
        let row=treasury.obligations.find(o=>o&&o.tributeKey===def.tributeKey);
        if(!row){
          const norm=String(def.name).toUpperCase().replace(/[^A-Z0-9]+/g," ").trim();
          row=treasury.obligations.find(o=>String(o&&o.name||"").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim()===norm);
        }
        if(!row){
          treasury.obligations.push(canonicalSeedObject(def));
          changed=true;
        }else{
          if(!row.tributeKey) row.tributeKey=def.tributeKey;
          row.questline=true;
          row.recurring=true;
          row.category=row.category||def.category;
          row.currency=row.currency||def.currency;
          row.paymentHistory=Array.isArray(row.paymentHistory)?row.paymentHistory:[];
          changed=true;
        }
      });
      treasury.settings[SEED_FLAG]=true;
      changed=true;
    }

    treasury.obligations.forEach(o=>{
      if(!isQuest(o)) return;
      o.recurring=true;
      o.paymentHistory=Array.isArray(o.paymentHistory)?o.paymentHistory:[];
      const should=isPaid(o)?"PAID":"PENDING";
      if(o.status!==should){o.status=should;changed=true;}
    });
    return changed;
  }

  function questRows(treasury){
    ensureSeed(treasury);
    return (treasury.obligations||[]).filter(isQuest);
  }

  function eur(amount,currency,settings){
    return pnTreasuryEur(Number(amount)||0,currency||"EUR",settings);
  }

  function fromEur(amountEur,currency,settings){
    const cur=String(currency||"EUR").toUpperCase();
    if(cur==="EUR") return amountEur;
    const rate=cur==="USD"?Number(settings.usdToEur)||0:cur==="RSD"?Number(settings.rsdToEur)||0:0;
    return rate>0?amountEur/rate:NaN;
  }

  function convert(amount,fromCur,toCur,settings){
    if(String(fromCur).toUpperCase()===String(toCur).toUpperCase()) return Number(amount)||0;
    return fromEur(eur(amount,fromCur,settings),toCur,settings);
  }

  function nativeMoney(amount,currency){
    return pnTreasuryNativeMoney(Number(amount)||0,currency||"EUR");
  }

  function obligationOutstanding(treasury,o){
    if(isQuest(o)) return !isPaid(o);
    return String(o&&o.status||"PENDING").toUpperCase()!=="PAID";
  }

  function dueDay(o){
    const explicit=Number(o&&o.dueDay);
    if(Number.isInteger(explicit)&&explicit>=1&&explicit<=31) return explicit;
    const d=String(o&&o.dueDate||"");
    const m=d.match(/^\d{4}-\d{2}-(\d{2})$/);
    return m?Number(m[1]):null;
  }

  function dueInfo(o){
    if(isPaid(o)) return {label:"PAID",cls:"paid",rank:99,days:999};
    const day=dueDay(o);
    if(!day) return {label:"MONTHLY",cls:"monthly",rank:3,days:999};
    const c=cycleKey().split("-"),y=Number(c[0]),m=Number(c[1])-1;
    const max=new Date(y,m+1,0).getDate(),safe=Math.min(day,max);
    const due=new Date(y,m,safe),now=new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const days=Math.ceil((due-today)/864e5);
    if(days<0) return {label:"OVERDUE · "+Math.abs(days)+"D",cls:"overdue",rank:0,days};
    if(days===0) return {label:"DUE TODAY",cls:"overdue",rank:0,days};
    if(days<=3) return {label:"DUE SOON · "+days+"D",cls:"soon",rank:1,days};
    return {label:"DUE "+String(safe).padStart(2,"0")+" "+new Intl.DateTimeFormat("en",{month:"short"}).format(due).toUpperCase(),cls:"upcoming",rank:2,days};
  }

  function sourceIdentity(b){
    return String(b.sourceKey||b.id||"");
  }

  function balanceByIdentity(treasury,id){
    return (treasury.balances||[]).find(b=>sourceIdentity(b)===String(id))||null;
  }

  function eligibleSources(treasury){
    return (treasury.balances||[]).filter(b=>b && b.include!==false);
  }

  function defaultSource(treasury,o){
    const sources=eligibleSources(treasury);
    if(!sources.length) return null;
    const settings=treasury.settings||{},amount=Number(o.amount)||0;
    const exact=sources.find(b=>String(b.currency||"").toUpperCase()===String(o.currency||"").toUpperCase() && Number(b.amount)>=amount);
    if(exact) return exact;
    const need=eur(amount,o.currency,settings);
    const sufficient=sources
      .map(b=>({b,value:eur(b.amount,b.currency,settings)}))
      .filter(x=>x.value+1e-8>=need)
      .sort((a,b)=>b.value-a.value);
    if(sufficient.length) return sufficient[0].b;
    return sources.slice().sort((a,b)=>eur(b.amount,b.currency,settings)-eur(a.amount,a.currency,settings))[0];
  }

  function pendingCount(treasury){
    return (treasury.obligations||[]).filter(o=>obligationOutstanding(treasury,o)).length;
  }

  function iconFor(o){
    return ICONS[o&&o.tributeKey]||ICONS.DEFAULT;
  }

  function isPriority(o){
    return o&&o.tributeKey==="RENT";
  }

  function paidThisMonth(treasury,rows){
    return rows.reduce((sum,o)=>{
      const p=currentPayment(o);
      return sum+(p?eur(p.amount,p.currency||o.currency,treasury.settings):0);
    },0);
  }

  function nextThreat(rows){
    return rows
      .map((o,index)=>({o,index,due:dueInfo(o)}))
      .filter(x=>!isPaid(x.o))
      .sort((a,b)=>a.due.rank-b.due.rank || a.due.days-b.due.days || a.index-b.index)[0]?.o||null;
  }

  /* ---------- Treasury accounting integration ---------- */

  pnTreasuryCalculate=function(input){
    const t=normalizeTreasury(input);
    ensureSeed(t);
    const settings=t.settings;
    const sum=(rows,pred)=>rows.reduce((total,row)=>total+(pred(row)?pnTreasuryEur(row.amount,row.currency,settings):0),0);
    const liquid=sum(t.balances,b=>b.include!==false);
    const obligations=sum(t.obligations,o=>obligationOutstanding(t,o));
    const pending=sum(t.pendingAssets,a=>!a.converted);
    const income=sum(t.incomes,()=>true);
    const fortress=liquid;
    const afterObligations=liquid-obligations;
    return {liquid,obligations,fortress,afterObligations,pending,income,afterPending:fortress+pending,afterSalary:fortress+pending+income};
  };

  pnTreasuryRecurringDues=function(treasury){
    ensureSeed(treasury);
    return (treasury.obligations||[]).reduce((total,o)=>{
      return total+(o.recurring&&obligationOutstanding(treasury,o)?pnTreasuryEur(o.amount,o.currency,treasury.settings):0);
    },0);
  };

  pnTreasuryMovements=function(e,t,r){
    ensureSeed(e);
    return'<section class="pn-wc-movements panel"><div class="pn-wc-section-head"><b>FORECAST</b></div><div class="pn-wc-movement-grid">'
      +pnTreasuryCard("Obligations",pnTreasuryMoney(t.obligations),pnTreasuryZero(t.obligations)?"":pendingCount(e)+" pending","is-dues"+(pnTreasuryZero(t.obligations)?" is-zero":""),"chain")
      +pnTreasuryCard("Pending Conversion",pnTreasuryMoney(t.pending),pnTreasuryZero(t.pending)?"":e.pendingAssets.filter(x=>!x.converted).length+" unconverted","is-spoils"+(pnTreasuryZero(t.pending)?" is-zero":""),"crate")
      +pnTreasuryCard("Incoming Tribute",pnTreasuryMoney(t.income),pnTreasuryZero(t.income)?"":r?((r.source||"Tribute source")+" · "+pnTreasuryConfidence(r.confidence)):"","is-tribute"+(pnTreasuryZero(t.income)?" is-zero":""),"crown")
      +pnTreasuryCard("Projected Hoard",pnTreasuryMoney(t.afterSalary),"Fortress + conversion + tribute","is-projected","rune")
      +'</div></section>';
  };

  const originalFlowMeta=pnTreasuryFlowMeta;
  pnTreasuryFlowMeta=function(f){
    if(f&&f.kind==="OBLIGATION_PAYMENT") return "Monthly Tribute Slain";
    return originalFlowMeta(f);
  };

  const originalFlowGroup=pnTreasuryFlowGroup;
  pnTreasuryFlowGroup=function(f){
    if(f&&f.kind==="OBLIGATION_PAYMENT") return "SPENDING";
    return originalFlowGroup(f);
  };

  /* ---------- V2 campaign board renderer ---------- */

  function statusChip(o){
    const due=dueInfo(o);
    return '<span class="pn-tribute-status-chip '+due.cls+'">'+escHtml(due.label)+'</span>';
  }

  function questRow(o,treasury){
    const paid=isPaid(o),pay=currentPayment(o),due=dueInfo(o),priority=isPriority(o);
    const eq=String(o.currency||"EUR").toUpperCase()==="EUR"?"":pnTreasuryMoney(eur(o.amount,o.currency,treasury.settings));
    const fresh=UI.justSlain===o.id;
    const cls=["pn-tribute-row",paid?"is-paid":"is-open",fresh?"is-fresh-slay":"",due.cls?"is-"+due.cls:"",priority?"is-priority":""].filter(Boolean).join(" ");
    const source=pay?(pay.sourceLabel||pay.sourceKey||"Reserve"):"";
    const paidMeta=pay?("PAID "+fmtDate(String(pay.paidAt||todayISO()).slice(0,10),"short").toUpperCase()+" · "+escHtml(source)):"";
    const meta=paid?paidMeta:(priority?'<span class="pn-tribute-priority-chip">PRIORITY THREAT</span> '+escHtml(due.label):escHtml(due.label));

    return '<article class="'+cls+'" data-tribute-id="'+escAttr(o.id)+'">'
      +'<div class="pn-tribute-accent" aria-hidden="true"></div>'
      +'<div class="pn-tribute-mark">'+iconFor(o)+'</div>'
      +'<div class="pn-tribute-body">'
        +'<div class="pn-tribute-name">'+escHtml(o.name||"UNTITLED TRIBUTE")+'</div>'
        +'<div class="pn-tribute-meta">'+meta+(eq?' · <span class="pn-tribute-equiv">≈ '+eq+'</span>':'')+'</div>'
      +'</div>'
      +'<div class="pn-tribute-money"><strong>'+nativeMoney(o.amount,o.currency)+'</strong>'+(eq?'<small>≈ '+eq+'</small>':'')+'</div>'
      +'<div class="pn-tribute-state">'+statusChip(o)+'</div>'
      +'<div class="pn-tribute-actions">'+(paid
        ?'<button type="button" class="btn btn-sm pn-tribute-paid" disabled aria-disabled="true"><span>✓</span> TRIBUTE PAID</button>'
        :'<button type="button" class="btn btn-sm pn-tribute-pay" data-tribute-pay="'+escAttr(o.id)+'"><span>✓</span> PAY TRIBUTE</button>')+'</div>'
      +'<i class="pn-tribute-execution" aria-hidden="true"></i>'
      +'</article>';
  }

  function groupHtml(label,rows,treasury){
    if(!rows.length) return "";
    const slain=rows.filter(isPaid).length,total=rows.length,pct=total?Math.round(slain/total*100):100;
    const remaining=rows.reduce((sum,o)=>sum+(isPaid(o)?0:eur(o.amount,o.currency,treasury.settings)),0);
    return '<section class="pn-tribute-group">'
      +'<div class="pn-tribute-group-head">'
        +'<div><span>'+label+'</span><small>'+pnTreasuryMoney(remaining)+' REMAINING</small></div>'
        +'<div class="pn-tribute-group-progress"><b>'+slain+' / '+total+' SLAIN</b><i><em style="width:'+pct+'%"></em></i></div>'
      +'</div>'
      +'<div class="pn-tribute-list">'+rows.map(o=>questRow(o,treasury)).join("")+'</div>'
      +'</section>';
  }

  function summaryCard(label,value,sub,cls){
    return '<div class="pn-tribute-summary-card '+(cls||"")+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>';
  }

  function milestoneRail(total,slain){
    if(total<=0) return "";
    const marks=[Math.ceil(total/3),Math.ceil(total*2/3),total];
    return '<div class="pn-tribute-milestones">'+marks.map(n=>{
      const left=(n/total*100).toFixed(2);
      return '<span class="'+(slain>=n?'is-cleared':'')+'" style="left:'+left+'%"><i></i><b>'+n+'</b></span>';
    }).join("")+'</div>';
  }

  function questlineHtml(treasury){
    const rows=questRows(treasury);
    const essentials=rows.filter(o=>String(o.category||"").toUpperCase()!=="SUBSCRIPTIONS");
    const subscriptions=rows.filter(o=>String(o.category||"").toUpperCase()==="SUBSCRIPTIONS");
    const slain=rows.filter(isPaid).length,total=rows.length;
    const remaining=rows.reduce((sum,o)=>sum+(isPaid(o)?0:eur(o.amount,o.currency,treasury.settings)),0);
    const essentialsLeft=essentials.reduce((sum,o)=>sum+(isPaid(o)?0:eur(o.amount,o.currency,treasury.settings)),0);
    const subscriptionsLeft=subscriptions.reduce((sum,o)=>sum+(isPaid(o)?0:eur(o.amount,o.currency,treasury.settings)),0);
    const paidValue=paidThisMonth(treasury,rows);
    const pct=total?Math.round(slain/total*100):100;
    const complete=total>0&&slain===total;
    const freshComplete=complete&&UI.justCompleted;
    const threat=nextThreat(rows);
    const threatName=threat?escHtml(threat.name):"NONE";
    const threatValue=threat?nativeMoney(threat.amount,threat.currency):"CLEAR";

    return '<section class="panel pn-monthly-tribute '+(complete?'is-complete ':'')+(freshComplete?'is-fresh-complete':'')+'">'
      +'<div class="pn-tribute-atmosphere" aria-hidden="true"></div>'
      +'<div class="pn-tribute-head">'
        +'<div class="pn-tribute-title-block"><span class="pn-tribute-kicker">MONTHLY TRIBUTE · '+cycleLabel()+'</span><h2>'+(complete?'QUESTLINE COMPLETE':'OBLIGATION QUESTLINE')+'</h2><p>'+(complete?'All recurring enemies neutralized for this cycle.':'Nine recurring enemies. Kill them one by one.')+'</p></div>'
        +'<div class="pn-tribute-head-actions"><button type="button" class="btn btn-sm pn-tribute-manage" data-treasury-new>MANAGE</button><button type="button" class="btn btn-sm pn-tribute-add-btn" data-tribute-add>+ ADD TRIBUTE</button></div>'
      +'</div>'

      +'<div class="pn-tribute-command-strip">'
        +'<div><span>SLAIN</span><strong>'+slain+' / '+total+'</strong><small>'+pct+'% CLEARED</small></div>'
        +'<div><span>REMAINING</span><strong>'+pnTreasuryMoney(remaining)+'</strong><small>CURRENT CYCLE</small></div>'
        +'<div class="is-threat"><span>NEXT THREAT</span><strong>'+threatName+'</strong><small>'+escHtml(threatValue)+'</small></div>'
      +'</div>'

      +'<div class="pn-tribute-progress-wrap">'
        +'<div class="pn-tribute-progress-copy"><b>CAMPAIGN PROGRESS</b><span>'+slain+' OF '+total+' OBLIGATIONS SLAIN</span></div>'
        +'<div class="pn-tribute-progress"><i style="width:'+pct+'%"><em></em></i>'+milestoneRail(total,slain)+'</div>'
      +'</div>'

      +(UI.flash?'<div class="pn-tribute-flash">'+escHtml(UI.flash)+'</div>':'')

      +'<div class="pn-tribute-summary-grid">'
        +summaryCard("ESSENTIALS LEFT",pnTreasuryMoney(essentialsLeft),(essentials.length-essentials.filter(isPaid).length)+" TARGETS","is-essential")
        +summaryCard("SUBSCRIPTIONS LEFT",pnTreasuryMoney(subscriptionsLeft),(subscriptions.length-subscriptions.filter(isPaid).length)+" TARGETS","is-subscription")
        +summaryCard("PAID THIS MONTH",pnTreasuryMoney(paidValue),slain+" EXECUTIONS","is-paid-total")
      +'</div>'

      +groupHtml("ESSENTIALS",essentials,treasury)
      +groupHtml("SUBSCRIPTIONS",subscriptions,treasury)

      +(complete?'<div class="pn-tribute-victory"><div class="pn-tribute-victory-mark">✓</div><div><b>MONTHLY TRIBUTE COMPLETE</b><span>All recurring obligations have been slain. Surplus is clear of this cycle.</span></div></div>':'')
      +'</section>';
  }

  function sourceOptions(treasury,o){
    const def=defaultSource(treasury,o);
    return eligibleSources(treasury).map(b=>{
      const id=sourceIdentity(b),selected=def&&sourceIdentity(def)===id;
      return '<option value="'+escAttr(id)+'"'+(selected?' selected':'')+'>'+escHtml(b.label||b.sourceKey||"Reserve")+' · '+nativeMoney(b.amount,b.currency)+'</option>';
    }).join("");
  }

  function payModalHtml(treasury){
    if(!UI.payId) return "";
    const o=questRows(treasury).find(x=>x.id===UI.payId);
    if(!o){UI.payId=null;return "";}
    return '<div class="pn-tribute-modal-shell">'
      +'<button type="button" class="pn-tribute-modal-scrim" data-tribute-pay-cancel aria-label="Close payment"></button>'
      +'<div class="panel pn-tribute-modal" role="dialog" aria-modal="true" aria-label="Mark tribute paid">'
        +'<div class="pn-tribute-modal-head"><div><span>EXECUTION ORDER</span><h3>'+escHtml(o.name)+'</h3></div><button type="button" class="btn btn-sm" data-tribute-pay-cancel>CANCEL</button></div>'
        +'<div class="pn-tribute-modal-body">'
          +'<label><span>ACTUAL AMOUNT</span><input type="number" min="0.01" step="0.01" data-tribute-pay-amount value="'+escAttr(o.amount)+'"></label>'
          +'<div class="pn-tribute-modal-currency">'+escHtml(o.currency||"EUR")+'</div>'
          +'<label><span>PAY FROM RESERVE</span><select data-tribute-pay-source>'+sourceOptions(treasury,o)+'</select></label>'
          +(UI.error?'<div class="pn-tribute-error">'+escHtml(UI.error)+'</div>':'')
          +'<p>The recurring default remains '+nativeMoney(o.amount,o.currency)+'. This payment kills only '+cycleLabel()+'.</p>'
        +'</div>'
        +'<div class="pn-tribute-modal-foot"><button type="button" class="btn pn-tribute-confirm" data-tribute-pay-confirm>SLAY TRIBUTE</button></div>'
      +'</div>'
      +'</div>';
  }

  function addModalHtml(){
    if(!UI.addOpen) return "";
    return '<div class="pn-tribute-modal-shell">'
      +'<button type="button" class="pn-tribute-modal-scrim" data-tribute-add-cancel aria-label="Close add tribute"></button>'
      +'<div class="panel pn-tribute-modal" role="dialog" aria-modal="true" aria-label="Add recurring tribute">'
        +'<div class="pn-tribute-modal-head"><div><span>NEW RECURRING ENEMY</span><h3>ADD TRIBUTE</h3></div><button type="button" class="btn btn-sm" data-tribute-add-cancel>CANCEL</button></div>'
        +'<div class="pn-tribute-modal-body pn-tribute-add-grid">'
          +'<label><span>NAME</span><input type="text" data-tribute-add-name placeholder="e.g. Electricity"></label>'
          +'<label><span>AMOUNT</span><input type="number" min="0.01" step="0.01" data-tribute-add-amount></label>'
          +'<label><span>CURRENCY</span><select data-tribute-add-currency><option>EUR</option><option>USD</option><option>RSD</option></select></label>'
          +'<label><span>GROUP</span><select data-tribute-add-category><option>ESSENTIALS</option><option>SUBSCRIPTIONS</option></select></label>'
          +'<label><span>DUE DAY · OPTIONAL</span><input type="number" min="1" max="31" step="1" data-tribute-add-day placeholder="1–31"></label>'
          +(UI.error?'<div class="pn-tribute-error">'+escHtml(UI.error)+'</div>':'')
        +'</div>'
        +'<div class="pn-tribute-modal-foot"><button type="button" class="btn pn-tribute-confirm" data-tribute-add-confirm>ADD TO QUESTLINE</button></div>'
      +'</div>'
      +'</div>';
  }

  const originalSurplus=pnTreasurySurplusProtocol;
  pnTreasurySurplusProtocol=function(t){
    const treasury=pnTreasuryData();
    const changed=ensureSeed(treasury);
    if(changed) Store.persist();
    return questlineHtml(treasury)+originalSurplus(t)+payModalHtml(treasury)+addModalHtml();
  };

  function findQuest(id){
    const treasury=pnTreasuryData();
    ensureSeed(treasury);
    return {treasury,o:questRows(treasury).find(x=>x.id===id)||null};
  }

  function confirmPayment(){
    const found=findQuest(UI.payId),treasury=found.treasury,o=found.o;
    if(!o){UI.payId=null;render();return;}
    if(isPaid(o)){UI.payId=null;render();return;}

    const modal=document.querySelector(".pn-tribute-modal");
    const amount=Number(modal&&modal.querySelector("[data-tribute-pay-amount]")?.value);
    const sourceId=String(modal&&modal.querySelector("[data-tribute-pay-source]")?.value||"");
    const source=balanceByIdentity(treasury,sourceId);
    UI.error="";

    if(!Number.isFinite(amount)||amount<=0){UI.error="Enter a valid payment amount.";render();return;}
    if(!source){UI.error="Choose a reserve source.";render();return;}

    const sourceDeduction=convert(amount,o.currency,source.currency,treasury.settings);
    if(!Number.isFinite(sourceDeduction)||sourceDeduction<=0){UI.error="Currency conversion rate is unavailable.";render();return;}
    if((Number(source.amount)||0)+1e-8<sourceDeduction){
      UI.error=(source.label||"Selected reserve")+" does not contain enough funds. Needs "+nativeMoney(sourceDeduction,source.currency)+".";
      render();return;
    }

    const flowId=pnTreasuryId(),stamp=nowISO(),cycle=cycleKey();
    source.amount=(Number(source.amount)||0)-sourceDeduction;
    source.updatedAt=stamp;

    paymentHistory(o).push({
      id:pnTreasuryId(),
      cycle,
      paidAt:stamp,
      amount,
      currency:o.currency,
      sourceId:source.id||null,
      sourceKey:source.sourceKey||null,
      sourceLabel:source.label||source.sourceKey||"Reserve",
      sourceCurrency:source.currency,
      sourceDeduction,
      flowId
    });
    o.status="PAID";

    treasury.flows=Array.isArray(treasury.flows)?treasury.flows:[];
    treasury.flows.push({
      id:flowId,
      refType:"obligation",
      refId:o.id,
      kind:"OBLIGATION_PAYMENT",
      amount,
      currency:o.currency,
      signedDelta:-eur(amount,o.currency,treasury.settings),
      note:o.name||"Recurring obligation",
      sourceKey:source.sourceKey||null,
      sourceLabel:source.label||"",
      sourceCurrency:source.currency,
      sourceDeduction,
      createdAt:stamp,
      updatedAt:stamp
    });

    Store.persist();

    const rows=questRows(treasury);
    const complete=rows.length>0&&rows.every(isPaid);
    UI.justSlain=o.id;
    UI.justCompleted=complete;
    UI.flash=(o.name||"Tribute")+" SLAIN · "+nativeMoney(amount,o.currency)+" PAID";
    UI.payId=null;
    UI.error="";
    render();
    setTimeout(()=>{UI.justSlain=null;UI.justCompleted=false;},1500);
  }

  function undoPayment(id){
    const found=findQuest(id),treasury=found.treasury,o=found.o;
    if(!o) return;
    const pay=currentPayment(o);
    if(!pay) return;

    const source=(treasury.balances||[]).find(b=>(pay.sourceId&&b.id===pay.sourceId)||(pay.sourceKey&&b.sourceKey===pay.sourceKey));
    if(!source){
      UI.flash="UNDO BLOCKED · ORIGINAL RESERVE SOURCE NOT FOUND";
      render();
      return;
    }

    source.amount=(Number(source.amount)||0)+(Number(pay.sourceDeduction)||0);
    source.updatedAt=nowISO();
    o.paymentHistory=paymentHistory(o).filter(p=>p!==pay);
    o.status="PENDING";
    if(pay.flowId) treasury.flows=(treasury.flows||[]).filter(f=>f.id!==pay.flowId);
    Store.persist();

    UI.flash=(o.name||"Tribute")+" RESTORED TO QUESTLINE";
    UI.justSlain=null;
    UI.justCompleted=false;
    render();
  }

  function addTribute(){
    const modal=document.querySelector(".pn-tribute-modal");
    const name=String(modal&&modal.querySelector("[data-tribute-add-name]")?.value||"").trim();
    const amount=Number(modal&&modal.querySelector("[data-tribute-add-amount]")?.value);
    const currency=String(modal&&modal.querySelector("[data-tribute-add-currency]")?.value||"EUR").toUpperCase();
    const category=String(modal&&modal.querySelector("[data-tribute-add-category]")?.value||"ESSENTIALS").toUpperCase();
    const dayRaw=String(modal&&modal.querySelector("[data-tribute-add-day]")?.value||"").trim();
    const day=dayRaw?Number(dayRaw):null;
    UI.error="";

    if(!name){UI.error="Give the recurring tribute a name.";render();return;}
    if(!Number.isFinite(amount)||amount<=0){UI.error="Enter a valid amount.";render();return;}
    if(day!==null&&(!Number.isInteger(day)||day<1||day>31)){UI.error="Due day must be between 1 and 31.";render();return;}

    const treasury=pnTreasuryData();
    ensureSeed(treasury);
    treasury.obligations.push({
      id:tributeId(),
      tributeKey:null,
      questline:true,
      name,
      amount,
      currency,
      status:"PENDING",
      category,
      dueDate:"",
      dueDay:day,
      recurring:true,
      note:"",
      paymentHistory:[]
    });
    Store.persist();
    UI.addOpen=false;
    UI.flash=name.toUpperCase()+" ADDED TO THE QUESTLINE";
    render();
  }

  document.addEventListener("click",function(ev){
    const pay=ev.target.closest("[data-tribute-pay]");
    if(pay){UI.payId=pay.dataset.tributePay;UI.error="";UI.flash="";render();return;}
    if(ev.target.closest("[data-tribute-pay-cancel]")){UI.payId=null;UI.error="";render();return;}
    if(ev.target.closest("[data-tribute-pay-confirm]")){confirmPayment();return;}

    const undo=ev.target.closest("[data-tribute-undo]");
    if(undo){undoPayment(undo.dataset.tributeUndo);return;}

    if(ev.target.closest("[data-tribute-add]")){UI.addOpen=true;UI.error="";UI.flash="";render();return;}
    if(ev.target.closest("[data-tribute-add-cancel]")){UI.addOpen=false;UI.error="";render();return;}
    if(ev.target.closest("[data-tribute-add-confirm]")){addTribute();return;}
  });

  document.addEventListener("keydown",function(ev){
    if(ev.key!=="Escape") return;
    if(UI.payId||UI.addOpen){
      UI.payId=null;UI.addOpen=false;UI.error="";
      render();
    }
  });

  try{
    const treasury=pnTreasuryData();
    if(ensureSeed(treasury)) Store.persist();
  }catch(err){
    console.warn("[PROFITNODE] Monthly Tribute seed deferred:",err);
  }

  console.info("[PROFITNODE] MONTHLY TRIBUTE V2 active · campaign board online · tribute button wording pass engaged.");
})();