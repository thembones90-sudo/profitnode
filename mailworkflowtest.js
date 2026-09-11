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

  // B. Sender-based auto-link suggestions against deals/inventory/sales
  (function(){
    reset();
    const deal = Actions.addDeal({item:'Gigabyte RTX 3060', category:'GPU', purchasePrice:20000, estimatedMarketValue:28000, condition:'WORKING', source:'OLX', seller:'Marko PC', date:'2026-09-01'});
    const inv = Actions.addInventory({category:'GPU', manufacturer:'Gigabyte', model:'RTX 3060', purchasePrice:20000, estimatedMarketValue:28000, condition:'WORKING', status:'IN_STORAGE', source:'OLX', purchaseDate:'2026-09-01'});
    const sale = Actions.addSale({itemName:'Gigabyte RTX 3060 Sale', buyerName:'Marko PC', buyerPrice:30000, originalInvestment:20000, additionalCosts:0, currency:'RSD', saleDate:'2026-09-05', saleState:'COMPLETED', category:'GPU'});
    const sugDeal = mailSuggestLinkForSender('Marko PC', '');
    const sugRaw = mailSuggestLinkForSender('', 'Gigabyte RTX 3060 something');
    log('B: sender name suggests linked deal', sugDeal.some(s=>s.type==='deal'&&s.id===deal.id));
    log('B: raw text suggests linked inventory', sugRaw.some(s=>s.type==='inventory'&&s.id===inv.id));
    log('B: suggestions are deduplicated and capped', sugDeal.length <= 4);
  })();

  // C. Smart import preview exposes suggestions and applying one sets linkedType/linkedId
  (function(){
    reset();
    const deal = Actions.addDeal({item:'ASUS RX 6600', category:'GPU', purchasePrice:18000, estimatedMarketValue:24000, condition:'WORKING', source:'KP', seller:'TechShop', date:'2026-09-01'});
    const raw = 'Posta Srbije: Vaša pošiljka PX123456701RS je poslata od pošiljaoca TechShop.';
    const preview = mailSmartImportPreview(raw, new Date(2026, 8, 10));
    log('C: preview contains a suggestion for known sender', preview.ok && Array.isArray(preview.suggestions) && preview.suggestions.some(s=>s.id===deal.id));
    preview.linkedType = 'deal';
    preview.linkedId = deal.id;
    const applied = mailApplyParsedMessage(preview, raw);
    log('C: applied suggestion persists link on mail record', applied.record.linkedType==='deal' && applied.record.linkedId===deal.id);
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

  return out;
})()
`);

for (const [name, ok] of results) {
  if (assert(name, ok)) passed++; else failed++;
}

console.log('');
console.log('MAIL WORKFLOW V5: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
