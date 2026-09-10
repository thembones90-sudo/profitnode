"use strict";

/* PROFITNODE MAIL fixtures — test-only, anonymized Serbian courier message samples.
   Never loaded in production. Add real-world scrubbed samples here as they become available. */

const MAIL_FIXTURES={
  posta:[
    {
      id:"posta-paketomat-redirect",
      label:"Pošta redirect to Paketomat → IN TRANSIT",
      raw:'Posta Srbije: Vaša pošiljka PX123456789RS je preusmerena na Paketomat. Pratite na https://www.posta.rs/lat/alati/pracenje-posiljke.aspx',
      expected:{carrier:"Pošta Srbije / Post Express",status:"in_transit",trackingNumber:"PX123456789RS"}
    },
    {
      id:"posta-paketomat-ready",
      label:"Pošta at Paketomat → READY FOR PICKUP",
      raw:'Posta Srbije: Pošiljka PX123456790RS čeka vas u Paketomatu. Možete preuzeti kod X7B2.',
      expected:{carrier:"Pošta Srbije / Post Express",status:"ready_for_pickup",trackingNumber:"PX123456790RS",pickupCode:"X7B2"}
    },
    {
      id:"posta-delivered",
      label:"Pošta delivered → DELIVERED",
      raw:'Posta Srbije: Pošiljka PX123456791RS je uručena.',
      expected:{carrier:"Pošta Srbije / Post Express",status:"delivered",trackingNumber:"PX123456791RS"}
    },
    {
      id:"posta-cod",
      label:"Pošta COD comma decimal",
      raw:'Posta Srbije: Pošiljka PX123456792RS. Iznos za uplatu: 1.250,00 RSD.',
      expected:{carrier:"Pošta Srbije / Post Express",status:"in_transit",trackingNumber:"PX123456792RS",codAmount:1250,currency:"RSD"}
    }
  ],
  bex:[
    {
      id:"bex-in-transit",
      label:"BEX incoming in transit (representative)",
      raw:'BEX: Kurir je preuzeo pošiljku BEX987654321. Pratite na https://bex.rs/tracking',
      expected:{carrier:"BEX",status:"in_transit",trackingNumber:"BEX987654321"}
    }
  ],
  dexpress:[
    {
      id:"dexpress-in-transit",
      label:"D Express incoming in transit (representative)",
      raw:'D Express: Pošiljka DEX123456789 je na dostavi. Očekujte danas.',
      expected:{carrier:"D Express",status:"in_transit",trackingNumber:"DEX123456789"}
    }
  ],
  aks:[
    {
      id:"aks-ready",
      label:"AKS ready for pickup (representative)",
      raw:'AKS: Vaša pošiljka AKS111222333 je spremna za preuzimanje na lokaciji Novi Sad.',
      expected:{carrier:"AKS",status:"ready_for_pickup",trackingNumber:"AKS111222333"}
    }
  ],
  cityexpress:[
    {
      id:"cityexpress-delivered",
      label:"City Express delivered (representative)",
      raw:'City Express: Pošiljka CE987654321 je uručena. Hvala na poverenju.',
      expected:{carrier:"City Express",status:"delivered",trackingNumber:"CE987654321"}
    }
  ],
  dhl:[
    {
      id:"dhl-in-transit",
      label:"DHL in transit",
      raw:'DHL Express: Shipment 1234567890 is in transit. Track at https://dhl.com/tracking',
      expected:{carrier:"DHL",status:"in_transit",trackingNumber:"1234567890"}
    }
  ],
  forwarded:[
    {
      id:"forwarded-posta",
      label:"Forwarded Posta message",
      raw:'Fw: Posta Srbije: Vaša pošiljka PX123456793RS je preusmerena na Paketomat.',
      expected:{carrier:"Pošta Srbije / Post Express",status:"in_transit",trackingNumber:"PX123456793RS"}
    }
  ],
  unsupported:[
    {
      id:"unsupported-generic",
      label:"Unsupported courier with tracking",
      raw:'Random Courier: Your package ABC999888777 is on the way. Track at https://example.com/track',
      expected:{carrier:"",confidence:"low",trackingNumber:"ABC999888777"}
    }
  ]
};

if(typeof module!=="undefined"&&module.exports)module.exports=MAIL_FIXTURES;
