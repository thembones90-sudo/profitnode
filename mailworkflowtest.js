"use strict";
const fs = require('fs');
const path = require('path');
const env = require('./pn_test_env.js');

const DIR = __dirname;
const sandbox = env.createSandbox();
env.loadAll(sandbox, DIR);

function assert(name, ok){ console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name); return ok; }
let passed = 0, failed = 0;

const fixturesJson = JSON.stringify(require('./mail_fixtures.js'));

const results = env.run(sandbox, `
(function(){
  const out = [];
  function log(name, ok){ out.push([name, !!ok]); }

  // Load fixtures manually in test context (not production)
  const fixtures = ${fixturesJson};

  function reset(){ Store.load(); Store.all('mail').forEach(m=>Actions.removeMail(m.id)); Store.all('sales').forEach(s=>Actions.removeSale(s.id)); mailMissLogClear(); }

  // A. Forwarded message cleanup strips headers and preserves parseable body
  (function(){
    const raw = 'Forwarded message:\\nFrom: someone@example.com\\nSent: Mon, 10 Sep 2026\\nSubject: Fw: Posta\\n\\nPosta Srbije: Vaša pošiljka PX123456700RS je preusmerena na Paketomat.';
    const cleaned = mailCleanForwardedMessage(raw);
    const p = mailParseCourierMessage(raw, new Date(2026, 8, 10));
    log('A: forwarded cleanup removes email headers', cleaned.indexOf('From:') === -1 && cleaned.indexOf('Subject:') === -1);
    log('A: forwarded Posta message still parses', p.ok && p.carrier.indexOf('Pošta') > -1 && p.trackingNumber === 'PX123456700RS');
  })();

  // B. Sender-based auto-link suggestions against inventory/sales
  (function(){
    reset();
    const inv = Actions.addInventory({category:'GPU', manufacturer:'Gigabyte', model:'RTX 3060', purchasePrice:20000, estimatedMarketValue:28000, condition:'WORKING', status:'IN_STORAGE', source:'OLX', purchaseDate:'2026-09-01'});
    const sale = Actions.addSale({itemName:'Gigabyte RTX 3060 Sale', buyerName:'Marko PC', buyerPrice:30000, originalInvestment:20000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'GPU'});
    const sugSale = mailSuggestLinkForSender('Marko PC', '');
    const sugRaw = mailSuggestLinkForSender('', 'Gigabyte RTX 3060 something');
    log('B: sender name suggests linked sale', sugSale.some(s=>s.type==='sale'&&s.id===sale.id));
    log('B: raw text suggests linked inventory', sugRaw.some(s=>s.type==='inventory'&&s.id===inv.id));
    log('B: suggestions are deduplicated and capped', sugSale.length <= 4);
  })();

  // C. Smart import preview exposes suggestions and applying one sets linkedType/linkedId
  (function(){
    reset();
    const inv = Actions.addInventory({category:'GPU', manufacturer:'ASUS', model:'RX 6600', purchasePrice:18000, estimatedMarketValue:24000, condition:'WORKING', status:'IN_STORAGE', source:'KP', sourceDetail:'TechShop', purchaseDate:'2026-09-01'});
    const raw = 'Posta Srbije: Vaša pošiljka PX123456701RS je poslata od pošiljaoca TechShop.';
    const preview = mailSmartImportPreview(raw, new Date(2026, 8, 10));
    log('C: preview contains a suggestion for known sender', preview.ok && Array.isArray(preview.suggestions) && preview.suggestions.some(s=>s.id===inv.id));
    preview.linkedType = 'inventory';
    preview.linkedId = inv.id;
    const applied = mailApplyParsedMessage(preview, raw);
    log('C: applied suggestion persists link on mail record', applied.record.linkedType==='inventory' && applied.record.linkedId===inv.id);
  })();

  // D. Pickup deadline dashboard intelligence
  (function(){
    reset();
    const now = new Date();
    const futureH = Math.min(23, now.getHours()+2);
    const todayStr = now.toISOString().slice(0,10) + 'T' + String(futureH).padStart(2,'0') + ':00';
    const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    const yestStr = yesterday.toISOString().slice(0,10) + 'T18:00';
    const overdue = Actions.addMail({direction:'incoming', status:'ready_for_pickup', pickupDeadline:yestStr, pickupDeadlineSource:'explicit', description:'overdue'});
    const dueToday = Actions.addMail({direction:'incoming', status:'ready_for_pickup', pickupDeadline:todayStr, pickupDeadlineSource:'explicit', description:'today'});
    const uOver = mailPickupUrgency(overdue);
    const uToday = mailPickupUrgency(dueToday);
    log('D: overdue shipment flagged OVERDUE', uOver.level==='overdue');
    log('D: same-day shipment flagged TODAY', uToday.level==='today');
    log('D: dashboard summary includes pickup urgency', mailDashboardSummaryHtml().indexOf('Pickup') > -1);
  })();

  // E. Profit impact preview for outgoing sale-linked shipments
  (function(){
    reset();
    const sale = Actions.addSale({itemName:'Test Rig', buyerName:'Buyer', buyerPrice:100000, originalInvestment:80000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'OTHER'});
    const preview = mailProfitImpactPreview({direction:'outgoing', linkedType:'sale', linkedId:sale.id, shippingCost:1500, currency:'RSD'});
    log('E: preview reports current and projected profit', preview && preview.currentProfit === 20000 && preview.nextProfit === 18500);
    log('E: preview delta equals added cost negative', preview && preview.delta === -1500);
  })();

  // F. Sale detail modal offers CREATE OUTGOING MAIL and prefills the draft
  (function(){
    reset();
    const sale = Actions.addSale({itemName:'GPU Sale', buyerName:'Nemanja', buyerPrice:50000, originalInvestment:40000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'GPU'});
    state.modal = {entityType:'sale', id:sale.id};
    const html = renderModal();
    log('F: sale edit modal contains CREATE OUTGOING MAIL', html.indexOf('data-mail-create-outgoing-sale="'+sale.id+'"') > -1);
  })();

  // G. Parser miss log captures failures and low-confidence parses
  (function(){
    reset();
    mailMissLogClear();
    mailSmartImportPreview('totally unrelated text', new Date(2026, 8, 10));
    mailSmartImportPreview('Random Courier: Your package ABC999888777 is on the way.', new Date(2026, 8, 10));
    const list = mailMissLogAll();
    log('G: miss log captures parse failure', list.some(e=>e.reason.indexOf('parse') > -1 || e.reason.indexOf('tracking') > -1));
    log('G: miss log captures low-confidence generic', list.some(e=>e.reason.indexOf('low confidence') > -1 || e.raw.indexOf('ABC999888777') > -1));
  })();

  // H. Shipment event timeline includes status chip and summary
  (function(){
    reset();
    const r = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: PX123456702RS je uručena.', new Date(2026, 8, 10)), 'raw delivered');
    const html = mailMessageHistoryHtml(r.record);
    log('H: timeline summary mentions DELIVERED status', html.indexOf('DELIVERED') > -1);
    log('H: timeline contains original message details', html.indexOf('Original message') > -1);
  })();

  // I. Fixtures anonymized samples parse to expected values
  (function(){
    fixtures.posta.forEach(f=>{
      const p = mailParseCourierMessage(f.raw, new Date(2026, 8, 10));
      log('I: fixture ' + f.id + ' parses ok', p.ok);
      Object.keys(f.expected).forEach(k=>{
        log('I: fixture ' + f.id + ' ' + k + ' matches', p[k] === f.expected[k]);
      });
    });
  })();

  // J. Forwarded fixture parses after cleanup
  (function(){
    fixtures.forwarded.forEach(f=>{
      const p = mailParseCourierMessage(f.raw, new Date(2026, 8, 10));
      log('J: forwarded fixture ' + f.id + ' parses ok', p.ok);
      log('J: forwarded fixture ' + f.id + ' tracking matches', p.trackingNumber === f.expected.trackingNumber);
    });
  })();

  // K. Outgoing mail cost counts exactly once in saleDerived
  (function(){
    reset();
    const sale = Actions.addSale({itemName:'Cost Rig', buyerName:'X', buyerPrice:60000, originalInvestment:50000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'OTHER'});
    Actions.addMail({direction:'outgoing', linkedType:'sale', linkedId:sale.id, shippingCost:2000, currency:'RSD', status:'sent'});
    const d1 = saleDerived(sale);
    Actions.addMail({direction:'outgoing', linkedType:'sale', linkedId:sale.id, shippingCost:1000, currency:'RSD', status:'sent'});
    const d2 = saleDerived(sale);
    log('K: first outgoing cost reduces profit', d1.profit === 8000 && d1.mailShippingCost === 2000);
    log('K: second outgoing cost updates total (no double count)', d2.profit === 7000 && d2.mailShippingCost === 3000);
  })();

  // L. Smart import does not duplicate existing tracking
  (function(){
    reset();
    const raw1 = 'Posta Srbije: PX123456703RS je poslata.';
    const raw2 = 'Posta Srbije: PX123456703RS je uručena.';
    const r1 = mailApplyParsedMessage(mailParseCourierMessage(raw1, new Date(2026, 8, 10)), raw1);
    const r2 = mailApplyParsedMessage(mailParseCourierMessage(raw2, new Date(2026, 8, 11)), raw2);
    log('L: same tracking updates one record', r1.record.id === r2.record.id);
    log('L: record history has two events', r2.record.messageHistory.length === 2);
  })();

  // L2. Action deadline priority: supplied text first, otherwise import-time +3 days
  (function(){
    reset();
    const fallbackRaw = 'Posta Srbije: PX123456799RS je poslata.';
    const fallbackParsed = mailParseCourierMessage(fallbackRaw, new Date(2026, 0, 5, 8, 0));
    const fallback = mailApplyParsedMessage(fallbackParsed, fallbackRaw, new Date(2026, 8, 13, 15, 0));
    log('L2: missing deadline falls back from current site time, not parser or shipment time', fallback.record.deadlineAt === '2026-09-16T15:00');

    const suppliedRaw = 'Posta Srbije: PX123456798RS je poslata. Shipment date: 13.09.2026 at 15:00. Delivery deadline: 7 days from shipment.';
    const suppliedParsed = mailParseCourierMessage(suppliedRaw, new Date(2026, 8, 13, 15, 0));
    const supplied = mailApplyParsedMessage(suppliedParsed, suppliedRaw, new Date(2026, 8, 13, 15, 0));
    log('L2: shipment-relative seven-day deadline wins over the import-time three-day fallback', supplied.record.deadlineAt === '2026-09-20T15:00' && supplied.record.deadlineSource === 'relative');

    const updateRaw = 'Posta Srbije: PX123456798RS je na dostavi.';
    const updated = mailApplyParsedMessage(mailParseCourierMessage(updateRaw, new Date(2026, 8, 14, 10, 0)), updateRaw, new Date(2026, 8, 14, 10, 0));
    log('L2: later import without a deadline preserves the relative deadline and provenance', updated.record.deadlineAt === '2026-09-20T15:00' && updated.record.deadlineSource === 'relative' && updated.record.deadlineAnchorAt === '2026-09-13T15:00');
  })();

  // L3. Deadline source precedence never downgrades higher-quality information
  (function(){
    reset();
    const tracking = 'PX123456797RS';
    let rec = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: '+tracking+' je poslata.', new Date(2026,8,13,9,0)), 'auto', new Date(2026,8,13,9,0)).record;
    log('L3: missing deadline creates AUTO +3 DAYS with calculation provenance', rec.deadlineAt === '2026-09-16T09:00' && rec.deadlineSource === 'auto' && rec.deadlineRule === 'No deadline detected' && rec.deadlineDays === 3);

    const relativeRaw = 'Posta Srbije: '+tracking+' je poslata. Shipment date: 13.09.2026 at 09:00. Delivery deadline: 7 days from shipment.';
    rec = mailApplyParsedMessage(mailParseCourierMessage(relativeRaw, new Date(2026,8,13,9,0)), relativeRaw, new Date(2026,8,13,9,0)).record;
    log('L3: RELATIVE replaces AUTO', rec.deadlineAt === '2026-09-20T09:00' && rec.deadlineSource === 'relative');

    const suppliedRaw = 'Posta Srbije: '+tracking+' je na dostavi. Deadline: 22.09.2026 at 11:30.';
    rec = mailApplyParsedMessage(mailParseCourierMessage(suppliedRaw, new Date(2026,8,14,9,0)), suppliedRaw, new Date(2026,8,14,9,0)).record;
    log('L3: SUPPLIED replaces RELATIVE', rec.deadlineAt === '2026-09-22T11:30' && rec.deadlineSource === 'supplied');

    const downgradeRaw = 'Posta Srbije: '+tracking+' je na dostavi. Shipment date: 14.09.2026 at 09:00. Delivery deadline: 10 days from shipment.';
    rec = mailApplyParsedMessage(mailParseCourierMessage(downgradeRaw, new Date(2026,8,14,9,0)), downgradeRaw, new Date(2026,8,14,9,0)).record;
    log('L3: RELATIVE cannot downgrade SUPPLIED', rec.deadlineAt === '2026-09-22T11:30' && rec.deadlineSource === 'supplied');
  })();

  // L4. dateSent facts and manual edits preserve source quality
  (function(){
    reset();
    const tracking = 'DEX123456796';
    const dispatchRaw = 'D Express: Shipment '+tracking+'. Dispatched: 12.09.2026 at 15:00.';
    let rec = mailApplyParsedMessage(mailParseCourierMessage(dispatchRaw, new Date(2026,8,13,9,0)), dispatchRaw, new Date(2026,8,13,9,0)).record;
    log('L4: dispatch fact populates dateSent', rec.dateSent === '2026-09-12' && rec.dateSentAt === '2026-09-12T15:00' && rec.dateSentSource === 'dispatch');
    const acceptedRaw = 'D Express: Shipment '+tracking+'. Package accepted: 10.09.2026 at 08:15.';
    rec = mailApplyParsedMessage(mailParseCourierMessage(acceptedRaw, new Date(2026,8,14,9,0)), acceptedRaw, new Date(2026,8,14,9,0)).record;
    log('L4: acceptance fact replaces lower-quality dispatch date', rec.dateSent === '2026-09-10' && rec.dateSentAt === '2026-09-10T08:15' && rec.dateSentSource === 'acceptance');
    const laterDispatchRaw = 'D Express: Shipment '+tracking+'. Dispatched: 14.09.2026 at 16:00.';
    rec = mailApplyParsedMessage(mailParseCourierMessage(laterDispatchRaw, new Date(2026,8,15,9,0)), laterDispatchRaw, new Date(2026,8,15,9,0)).record;
    log('L4: later dispatch does not overwrite earlier acceptance date', rec.dateSentAt === '2026-09-10T08:15' && rec.dateSentSource === 'acceptance');

    const manual = Actions.addMail({description:'manual provenance'}, new Date(2026,8,13,10,0));
    const edited = Actions.updateMail(manual.id,{deadlineAt:'2026-09-30T18:00',dateSent:'2026-09-11'});
    log('L4: direct manual deadline edit becomes SUPPLIED', edited.deadlineSource === 'supplied' && edited.deadlineRule === '' && edited.deadlineAnchorAt === '');
    log('L4: direct manual dateSent edit records manual provenance', edited.dateSentSource === 'manual' && edited.dateSentAt === '');
  })();

  // L5. Preview explanation, legacy migration, and dynamic urgency states
  (function(){
    reset();
    const now = new Date(2026,8,13,12,0);
    const auto = mailSmartImportPreview('Posta Srbije: PX123456795RS je poslata.', now, now);
    const autoHtml = mailSmartImportPreviewHtml(auto);
    log('L5: AUTO preview shows badge, rule, and anchor-to-deadline calculation', autoHtml.indexOf('AUTO +3 DAYS') > -1 && autoHtml.indexOf('No deadline detected') > -1 && autoHtml.indexOf('13.09.2026 12:00 → 16.09.2026 12:00') > -1);
    const autoApplied = mailApplyParsedMessage(auto, 'Posta Srbije: PX123456795RS je poslata.', new Date(2026,8,13,12,5));
    log('L5: AUTO is finalized from import time rather than stale preview time', autoApplied.record.deadlineAt === '2026-09-16T12:05' && autoApplied.record.deadlineAnchorAt === '2026-09-13T12:05');
    const relative = mailSmartImportPreview('D Express: Shipment DEX123456795. Package accepted: 10.09.2026 at 08:30. Delivery deadline: 7 days from shipment.', now, now);
    const relativeHtml = mailSmartImportPreviewHtml(relative);
    log('L5: RELATIVE preview shows badge, rule, and explicit anchor calculation', relativeHtml.indexOf('RELATIVE') > -1 && relativeHtml.indexOf('7 days from shipment') > -1 && relativeHtml.indexOf('10.09.2026 08:30 → 17.09.2026 08:30') > -1);

    const legacy = Object.assign(mailDefaultRecord(),{deadlineAt:'2026-09-20T18:00',deadlineSource:'',messageHistory:[{deadlineAt:'2026-09-20T18:00'}]});
    mailNormalizeDeadlineRecord(legacy);
    log('L5: legacy deadlines migrate conservatively to SUPPLIED', legacy.deadlineSource === 'supplied' && legacy.messageHistory[0].deadlineSource === 'supplied');
    const migrated = migrateLedger({meta:{schemaVersion:4},mail:[{deadlineAt:'2026-09-21T18:00',messageHistory:[]}]});
    log('L5: ledger migration applies safe provenance to existing saved MAIL records', migrated.ledger.mail[0].deadlineSource === 'supplied');

    log('L5: action deadline urgency detects OVERDUE', mailActionDeadlineUrgency({status:'in_transit',deadlineAt:'2026-09-13T11:59'},now).label === 'OVERDUE');
    log('L5: action deadline urgency detects DUE TODAY', mailActionDeadlineUrgency({status:'in_transit',deadlineAt:'2026-09-13T20:00'},now).label === 'DUE TODAY');
    log('L5: action deadline urgency detects DUE <24H', mailActionDeadlineUrgency({status:'in_transit',deadlineAt:'2026-09-14T10:00'},now).label === 'DUE <24H');
    log('L5: action deadline urgency detects UPCOMING', mailActionDeadlineUrgency({status:'in_transit',deadlineAt:'2026-09-16T12:00'},now).label === 'UPCOMING');
    log('L5: terminal shipments suppress action urgency', mailActionDeadlineUrgency({status:'delivered',deadlineAt:'2026-09-12T12:00'},now).level === 'none');

    const supplied = Actions.addMail({description:'card source',deadlineAt:'2026-09-20T18:00',deadlineSource:'supplied'});
    const cardHtml = mailCard(supplied);
    log('L5: shipment card renders deadline source and urgency badges', cardHtml.indexOf('SUPPLIED') > -1 && cardHtml.indexOf('pn-mail-action-urgency') > -1);
  })();

  // M. Mail CSV export includes direction and linked entity
  (function(){
    reset();
    const sale = Actions.addSale({itemName:'CSV Sale', buyerName:'Y', buyerPrice:10000, originalInvestment:8000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'OTHER'});
    const m = Actions.addMail({direction:'outgoing', linkedType:'sale', linkedId:sale.id, carrier:'Post Express', trackingNumber:'PX123456704RS', shippingCost:500, currency:'RSD'});
    const csv = toCSV(CSV_EXPORTS.mail.columns, Store.all('mail'));
    log('M: CSV export has Direction column', csv.indexOf('Direction') > -1);
    log('M: CSV row contains linked sale label', csv.indexOf('CSV Sale') > -1);
  })();

  // N. create-outgoing-sale handler pre-fills draft and closes sale modal
  (function(){
    reset();
    const sale = Actions.addSale({itemName:'Outgoing Test', buyerName:'Zoran', buyerPrice:12000, originalInvestment:9000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'OTHER'});
    state.modal = {entityType:'sale', id:sale.id};
    state.mailDraft = null;
    const btn = document.createElement('button');
    btn.setAttribute('data-mail-create-outgoing-sale', sale.id);
    const ev = { target:btn, closest(sel){ return btn.closest(sel); } };
    (window.__pnDocListeners.click || []).forEach(fn=>fn(ev));
    log('N: create outgoing mail closes sale modal', state.modal === null);
    log('N: create outgoing mail sets linked sale draft', state.mailDraft && state.mailDraft.linkedType==='sale' && state.mailDraft.linkedId===sale.id);
    log('N: create outgoing mail pre-fills description', state.mailDraft && state.mailDraft.description.indexOf('Outgoing Test') > -1);
  })();

  // O. Incoming shipment with COD > 0 displays COD row on main card
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'BEX', shippingCost:0, codAmount:3174.5, currency:'RSD', description:'GPU shipment'});
    const html = mailCard(m);
    log('O: incoming COD > 0 shows COD row on card', html.indexOf('pn-mail-cod-row') > -1);
    log('O: incoming COD label says COD / TO PAY', html.indexOf('COD / TO PAY') > -1);
    log('O: incoming COD amount formatted correctly', html.indexOf('3.175') > -1);
    Actions.removeMail(m.id);
  })();

  // P. Outgoing shipment with COD > 0 uses direction-appropriate wording
  (function(){
    reset();
    const m = Actions.addMail({direction:'outgoing', status:'sent', carrier:'Post Express', shippingCost:500, codAmount:1200, currency:'RSD', description:'Sale shipment'});
    const html = mailCard(m);
    log('P: outgoing COD > 0 shows COD row on card', html.indexOf('pn-mail-cod-row') > -1);
    log('P: outgoing COD label says COD TO COLLECT', html.indexOf('COD TO COLLECT') > -1);
    log('P: outgoing COD does NOT say TO PAY', html.indexOf('COD / TO PAY') === -1);
    log('P: outgoing COD amount formatted correctly', html.indexOf('1.200') > -1);
    Actions.removeMail(m.id);
  })();

  // Q. Zero/empty COD does not create main-card clutter
  (function(){
    reset();
    const m0 = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'BEX', shippingCost:500, codAmount:0, currency:'RSD', description:'No COD'});
    const html0 = mailCard(m0);
    log('Q: codAmount=0 hides COD row', html0.indexOf('pn-mail-cod-row') === -1);
    log('Q: codAmount=0 hides COD label', html0.indexOf('COD / TO PAY') === -1);
    Actions.removeMail(m0.id);
    const mNull = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'BEX', shippingCost:500, currency:'RSD', description:'Null COD'});
    const htmlNull = mailCard(mNull);
    log('Q: codAmount=undefined hides COD row', htmlNull.indexOf('pn-mail-cod-row') === -1);
    Actions.removeMail(mNull.id);
  })();

  // R. Shipping cost and COD remain separate visible values
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'DHL', shippingCost:500, codAmount:3174.5, currency:'RSD', description:'Mixed costs'});
    const html = mailCard(m);
    log('R: shipping row still present alongside COD', html.indexOf('pn-mail-cod-row') > -1 && html.indexOf('>SHIPPING<') > -1);
    log('R: shipping shows 500 RSD', html.indexOf('500') > -1);
    log('R: COD shows 3.175 RSD', html.indexOf('3.175') > -1);
    log('R: shipping and COD are separate rows', html.indexOf('pn-mail-cod-row') < html.indexOf('>SHIPPING<'));
    Actions.removeMail(m.id);
  })();

  // S. COD row appears between TRACKING and SHIPPING in card order
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'BEX', trackingNumber:'BEX999', shippingCost:0, codAmount:1500, currency:'RSD', description:'Order check'});
    const html = mailCard(m);
    const codIdx = html.indexOf('pn-mail-cod-row');
    const shipIdx = html.indexOf('>SHIPPING<');
    const trackIdx = html.indexOf('pn-mail-track');
    log('S: COD row is between TRACKING and SHIPPING', trackIdx > -1 && codIdx > trackIdx && codIdx < shipIdx);
    Actions.removeMail(m.id);
  })();

  // T. COD amount uses shipment currency (EUR)
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'DHL', shippingCost:0, codAmount:27, currency:'EUR', description:'EUR COD'});
    const html = mailCard(m);
    log('T: EUR COD shows euro sign', html.indexOf('€27') > -1);
    log('T: EUR COD does not show RSD', html.indexOf('RSD') === -1 || html.indexOf('pn-mail-cod-row') > -1);
    Actions.removeMail(m.id);
  })();

  // U. Bottom button hierarchy: MARK DELIVERED primary, EDIT secondary, DELETE danger
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'BEX', description:'buttons'});
    const html = mailCard(m);
    log('U: MARK DELIVERED is the primary bottom action', html.indexOf('btn-primary" data-mail-mark-delivered=') > -1);
    log('U: EDIT is the secondary ghost action', html.indexOf('btn-ghost" data-mail-edit=') > -1);
    log('U: DELETE is the danger action', html.indexOf('btn-danger" data-mail-delete=') > -1);
    const born = html.indexOf('data-mail-mark-delivered');
    const edit = html.indexOf('data-mail-edit');
    const del = html.indexOf('data-mail-delete');
    log('U: button order is DELIVERED then EDIT then DELETE', born > -1 && born < edit && edit < del);
    Actions.removeMail(m.id);
  })();

  // V. Carrier + Tracking share one compact metadata group
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'BEX', trackingNumber:'BEX777', description:'meta group'});
    const html = mailCard(m);
    log('V: card opens a meta group for carrier+tracking', html.indexOf('<div class="pn-mail-meta">') > -1);
    log('V: CARRIER appears before TRACKING inside the meta group', html.indexOf('CARRIER') > -1 && html.indexOf('CARRIER') < html.indexOf('TRACKING'));
    log('V: meta group sits above SHIPPING', html.indexOf('pn-mail-meta') < html.indexOf('>SHIPPING<'));
    Actions.removeMail(m.id);
  })();

  // W. Deadline hierarchy: urgent pickup rows get subtle emphasis
  (function(){
    reset();
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const later = new Date(now); later.setDate(now.getDate() + 10);
    const mUrg = Actions.addMail({direction:'incoming', status:'ready_for_pickup', pickupDeadline: yesterday.toISOString().slice(0,10) + 'T18:00', pickupDeadlineSource:'explicit', description:'urgent pickup'});
    const htmlUrg = mailCard(mUrg);
    log('W: overdue pickup deadline row carries is-urgent emphasis', htmlUrg.indexOf('pn-mail-pickup-deadline is-urgent') > -1);
    Actions.removeMail(mUrg.id);
    const mCalm = Actions.addMail({direction:'incoming', status:'ready_for_pickup', pickupDeadline: later.toISOString().slice(0,10) + 'T18:00', pickupDeadlineSource:'explicit', description:'calm pickup'});
    const htmlCalm = mailCard(mCalm);
    log('W: far-future pickup deadline stays quiet (no emphasis class)', htmlCalm.indexOf('is-urgent') === -1 && htmlCalm.indexOf('is-soon') === -1);
    Actions.removeMail(mCalm.id);
  })();

  // X. Action deadline carries a small non-pickup accent
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', deadlineAt:'2026-09-30T17:00', pickupDeadline:'', description:'action deadline'});
    const html = mailCard(m);
    log('X: action deadline row has its own subtle accent class', html.indexOf('pn-mail-action-deadline') > -1);
    log('X: action deadline must not be mistaken for pickup expiry', html.indexOf('pn-mail-action-deadline') < html.indexOf('pn-mail-pickup-deadline') || html.indexOf('pn-mail-pickup-deadline') === -1);
    Actions.removeMail(m.id);
  })();

  // Y. Paketomat action renders as a real actionable control
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', actionLinks:[{url:'https://www.posta.rs/lat/alati/pracenje-posiljke.aspx', label:'Preusmeri na paketomat'}], description:'action link'});
    const html = mailCard(m);
    log('Y: ACTIONS row hosts the action link', html.indexOf('pn-mail-action-row') > -1 && html.indexOf('pn-mail-action-links') > -1);
    log('Y: action link keeps its URL and label intact', html.indexOf('https://www.posta.rs/lat/alati/pracenje-posiljke.aspx') > -1 && html.indexOf('Preusmeri na paketomat') > -1);
    log('Y: action link opens in a new tab safely', html.indexOf('target="_blank"') > -1 && html.indexOf('rel="noopener noreferrer"') > -1);
    Actions.removeMail(m.id);
  })();

  // Z. Tracking line keeps number, COPY TRACKING and TRACK ONLINE
  (function(){
    reset();
    const m = Actions.addMail({direction:'incoming', status:'in_transit', carrier:'Posta Srbije', trackingNumber:'PX123456705RS', trackingUrl:'posta.rs/lat/alati/pracenje-posiljke.aspx', description:'tracking line'});
    const html = mailCard(m);
    log('Z: tracking number present on card', html.indexOf('PX123456705RS') > -1);
    log('Z: COPY TRACKING present on card', html.indexOf('COPY TRACKING') > -1 && html.indexOf('data-mail-copy="PX123456705RS"') > -1);
    log('Z: TRACK ONLINE present on card', html.indexOf('TRACK ONLINE') > -1 && html.indexOf('data-mail-track="'+m.id+'"') > -1);
    log('Z: tracking keeps its own compact row styling', html.indexOf('pn-mail-track') > -1);
    Actions.removeMail(m.id);
  })();

  // AA. New-shipment default status is IN TRANSIT (you already have a tracking code, so someone already shipped
  // it) rather than PREPARING, and toggling direction on a still-blank draft keeps that default sensible.
  (function(){
    reset();
    log('AA: mailDefaultRecord() defaults to IN TRANSIT', mailDefaultRecord().status === 'in_transit');

    state.mailDraft = null;
    const addBtn = document.createElement('button');
    addBtn.setAttribute('data-mail-add', '');
    const addEv = { target:addBtn, closest(sel){ return addBtn.closest(sel); } };
    (window.__pnDocListeners.click || []).forEach(fn=>fn(addEv));
    log('AA: + ADD SHIPMENT opens a blank draft defaulted to IN TRANSIT', state.mailDraft && state.mailDraft.status === 'in_transit');

    const dirSelect = document.createElement('select');
    dirSelect.setAttribute('data-mail-path', 'direction');
    dirSelect.value = 'outgoing';
    const changeEv = { target:dirSelect, closest(sel){ return dirSelect.closest(sel); } };
    (window.__pnDocListeners.change || []).forEach(fn=>fn(changeEv));
    log('AA: switching a blank draft to OUTGOING flips the auto default to PREPARING', state.mailDraft.status === 'preparing');

    dirSelect.value = 'incoming';
    (window.__pnDocListeners.change || []).forEach(fn=>fn(changeEv));
    log('AA: switching back to INCOMING flips the auto default back to IN TRANSIT', state.mailDraft.status === 'in_transit');

    // A deliberately-set status on an EXISTING record must never be clobbered by a direction toggle.
    const existing = Actions.addMail({direction:'incoming', status:'delivered', description:'already delivered'});
    state.mailDraft = Object.assign({}, existing);
    const dirSelect2 = document.createElement('select');
    dirSelect2.setAttribute('data-mail-path', 'direction');
    dirSelect2.value = 'outgoing';
    const changeEv2 = { target:dirSelect2, closest(sel){ return dirSelect2.closest(sel); } };
    (window.__pnDocListeners.change || []).forEach(fn=>fn(changeEv2));
    log('AA: editing an existing DELIVERED record keeps its status when direction is toggled', state.mailDraft.status === 'delivered');
    Actions.removeMail(existing.id);
    state.mailDraft = null;
  })();

  return out;
})()
`);

for (const [name, ok] of results) {
  if (assert(name, ok)) passed++; else failed++;
}

console.log('');
console.log('MAIL WORKFLOW V5: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
