"use strict";
const fs = require('fs');
const path = require('path');
const env = require('./pn_test_env.js');

const DIR = __dirname;
const sandbox = env.createSandbox();
env.loadAll(sandbox, DIR);

function assert(name, ok){ console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name); return ok; }
let passed = 0, failed = 0;

const results = env.run(sandbox, `
(function(){
  const out = [];
  function log(name, ok){ out.push([name, !!ok]); }

  // 1. Pošta redirect-to-Paketomat → IN TRANSIT
  (function(){
    const msg = 'Posta Srbije: Vaša pošiljka PX123456789RS je preusmerena na Paketomat. Pratite na https://www.posta.rs/lat/alati/pracenje-posiljke.aspx';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10, 9, 12));
    log('Pošta redirect-to-Paketomat parses high confidence', p.ok && p.confidence === 'high' && p.carrier.indexOf('Pošta') > -1);
    log('Pošta redirect-to-Paketomat status is IN TRANSIT', p.status === 'in_transit');
    log('Pošta redirect-to-Paketomat extracts tracking', p.trackingNumber === 'PX123456789RS');
  })();

  // 2. Pošta already-at-Paketomat → READY FOR PICKUP
  (function(){
    const msg = 'Pošta Srbije: Pošiljka PX123456790RS čeka vas u Paketomatu. Možete preuzeti kod X7B2.';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10, 13, 44));
    log('Pošta at-Paketomat status is READY FOR PICKUP', p.ok && p.status === 'ready_for_pickup');
    log('Pošta at-Paketomat extracts pickup code', p.pickupCode === 'X7B2');
  })();

  // 3. BEX representative message
  (function(){
    const msg = 'BEX: Kurir je preuzeo pošiljku BEX987654321. Pratite na https://bex.rs/tracking';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('BEX detection parses with medium+ confidence', p.ok && p.carrier === 'BEX' && (p.confidence === 'medium' || p.confidence === 'high'));
    log('BEX status IN TRANSIT', p.status === 'in_transit');
  })();

  // 4. D Express representative message
  (function(){
    const msg = 'D Express: Pošiljka DEX123456789 je na dostavi. Očekujte danas.';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('D Express detection parses', p.ok && p.carrier === 'D Express');
    log('D Express status IN TRANSIT', p.status === 'in_transit');
  })();

  // 5. AKS representative message
  (function(){
    const msg = 'AKS: Vaša pošiljka AKS111222333 je spremna za preuzimanje na lokaciji Novi Sad.';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('AKS detection parses', p.ok && p.carrier === 'AKS');
    log('AKS status READY FOR PICKUP', p.status === 'ready_for_pickup');
  })();

  // 6. City Express representative message
  (function(){
    const msg = 'City Express: Pošiljka CE987654321 je uručena. Hvala na poverenju.';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('City Express detection parses', p.ok && p.carrier === 'City Express');
    log('City Express status DELIVERED', p.status === 'delivered');
  })();

  // 7. DHL representative message
  (function(){
    const msg = 'DHL Express: Shipment 1234567890 is in transit. Track at https://dhl.com/tracking';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('DHL detection parses high confidence', p.ok && p.carrier === 'DHL' && p.confidence === 'high');
    log('DHL status IN TRANSIT', p.status === 'in_transit');
    log('DHL tracking URL generated', p.trackingUrl.indexOf('dhl.com') > -1 && p.trackingUrl.indexOf('1234567890') > -1);
  })();

  // 8. Same tracking receives multiple messages → one shipment, multiple history entries
  (function(){
    Store.load();
    const t0 = new Date(2026, 8, 10, 9, 12);
    const r1 = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: PX123456780RS je poslata.', t0), 'Posta Srbije: PX123456780RS je poslata.');
    const r2 = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: PX123456780RS je na dostavi.', new Date(2026, 8, 10, 14, 0)), 'Posta Srbije: PX123456780RS je na dostavi.');
    const r3 = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: PX123456780RS je uručena.', new Date(2026, 8, 11, 10, 0)), 'Posta Srbije: PX123456780RS je uručena.');
    log('Multiple messages update one shipment', r1.record.id === r2.record.id && r2.record.id === r3.record.id);
    log('History preserves all three messages', r3.record.messageHistory.length === 3);
    log('Shipment reflects newest terminal status', r3.record.status === 'delivered');
    Actions.removeMail(r1.record.id);
  })();

  // 9. DELIVERED then older IN TRANSIT must remain DELIVERED
  (function(){
    Store.load();
    const r1 = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: PX123456781RS je uručena.', new Date(2026, 8, 10)), 'delivered first');
    const r2 = mailApplyParsedMessage(mailParseCourierMessage('Posta Srbije: PX123456781RS je na dostavi.', new Date(2026, 8, 10)), 'in transit later');
    log('DELIVERED not downgraded by later IN TRANSIT', r2.record.status === 'delivered');
    Actions.removeMail(r1.record.id);
  })();

  // 10. Serbian text without diacritics parses equivalently
  (function(){
    const withDia = 'Pošta Srbije: Pošiljka PX123456782RS je na dostavi.';
    const noDia = 'Posta Srbije: Posiljka PX123456782RS je na dostavi.';
    const p1 = mailParseCourierMessage(withDia, new Date(2026, 8, 10));
    const p2 = mailParseCourierMessage(noDia, new Date(2026, 8, 10));
    log('Diacritic and ASCII variants produce same status', p1.status === p2.status && p1.status === 'in_transit');
    log('Diacritic and ASCII variants produce same tracking', p1.trackingNumber === p2.trackingNumber);
  })();

  // 11. COD with comma decimal 1.250,00 RSD → 1250.00
  (function(){
    const msg = 'Posta Srbije: Pošiljka PX123456783RS. Iznos za uplatu: 1.250,00 RSD.';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('COD comma-decimal parses to 1250', p.ok && p.codAmount === 1250);
    log('COD currency is RSD', p.currency === 'RSD');
  })();

  // 12. Unsupported courier graceful fallback
  (function(){
    const msg = 'Random Courier: Your package ABC999888777 is on the way. Track at https://example.com/track';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10));
    log('Unsupported courier does not crash', typeof p.ok === 'boolean');
    log('Unsupported courier returns low confidence generic result', p.ok && p.confidence === 'low' && p.carrier === '');
    log('Unsupported courier still extracts tracking', p.trackingNumber === 'ABC999888777');
  })();

  // 13. Status precedence helper correctness
  (function(){
    log('Status precedence: delivered > in_transit', mailStatusMayAdvance('in_transit', 'delivered'));
    log('Status precedence: in_transit not > delivered', !mailStatusMayAdvance('delivered', 'in_transit'));
    log('Status precedence: ready_for_pickup > in_transit', mailStatusMayAdvance('in_transit', 'ready_for_pickup'));
  })();

  // 14. Redirect offer: actionDeadline only, no pickupDeadline
  (function(){
    const msg = 'Ukoliko zelite, posiljku PX887428579RS, od posiljaoca MEDINA CORHAMZIC, mozete danas do 17:00 h preusmeriti na paketomat putem linka https://www.posta.rs/lat/alati/pracenje-posiljke.aspx';
    const ref = new Date(2026, 8, 10, 9, 0);
    const p = mailParseCourierMessage(msg, ref);
    log('Redirect offer parses as Posta', p.ok && p.carrier.indexOf('Pošta') > -1);
    log('Redirect offer status is in_transit', p.status === 'in_transit');
    log('Redirect offer actionDeadline is today 17:00', p.deadlineAt === '2026-09-10T17:00');
    log('Redirect offer pickupDeadline is empty', p.pickupDeadline === '');
    log('Redirect offer pickupDeadlineSource is none', p.pickupDeadlineSource === 'none');
  })();

  // 15. Explicit pickup window
  (function(){
    const msg = 'Vasu posiljku PX887428580RS mozete podici na paketomatu u periodu od 10.09.2026 u 09:46 do 13.09.2026 u 07:00';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10, 9, 0));
    log('Explicit pickup window status is ready_for_pickup', p.ok && p.status === 'ready_for_pickup');
    log('Explicit pickup window pickupAvailableFrom', p.pickupAvailableFrom === '2026-09-10T09:46');
    log('Explicit pickup window pickupDeadline', p.pickupDeadline === '2026-09-13T07:00');
    log('Explicit pickup window source is explicit', p.pickupDeadlineSource === 'explicit');
    log('Explicit pickup window actionDeadline is empty', p.deadlineAt === '');
  })();

  // 16. Ready-for-pickup with start only triggers inferred 3-day fallback
  (function(){
    const msg = 'Posta Srbije: Vasu posiljku PX887428581RS mozete podici na paketomatu od 10.09.2026 u 09:46.';
    const p = mailParseCourierMessage(msg, new Date(2026, 8, 10, 9, 0));
    log('Start-only pickup status is ready_for_pickup', p.ok && p.status === 'ready_for_pickup');
    log('Start-only pickup pickupAvailableFrom', p.pickupAvailableFrom === '2026-09-10T09:46');
    log('Start-only pickup pickupDeadline inferred +3 days', p.pickupDeadline === '2026-09-13T09:46');
    log('Start-only pickup source is inferred_3_day', p.pickupDeadlineSource === 'inferred_3_day');
  })();

  // 17. actionDeadline must NOT trigger pickup-overdue logic
  (function(){
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10) + 'T18:00';
    const m = {status:'in_transit', deadlineAt:yStr, pickupDeadline:'', pickupDeadlineSource:'none'};
    const u = mailPickupUrgency(m);
    log('actionDeadline alone does not trigger pickup urgency', u.level === 'none');
  })();

  return out;
})()
`);

for (const [name, ok] of results) {
  if (assert(name, ok)) passed++; else failed++;
}

console.log('');
console.log('MAIL PARSER V2: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
