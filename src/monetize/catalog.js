// Catalogul de produse cu bani reali.
//
// ACESTA E SINGURUL LOC pe care-l editezi cand adaugi sau scoti un produs.
// Fiecare `id` de aici trebuie sa existe identic in Play Console (Monetize →
// Products → In-app products) si sa fie importat in RevenueCat.
//
// Preturile NU sunt aici: vin de la Google, in moneda si cu taxele
// jucatorului. `billing.js` le cere la pornire si UI-ul afiseaza ce spune
// Google — niciodata un pret scris de noi in cod.
//
// `repeatable`:
//   false → non-consumabil (se cumpara o data: fara reclame, skin-uri). In Play
//            Console tipul e „non-consumable", iar in RevenueCat il marchezi
//            tot asa, altfel jucatorul nu-l mai poate restaura pe telefon nou.
//   true  → consumabil (monede, gemuri: se recumpara). In RevenueCat trebuie
//            marcat „consumable", altfel SDK-ul nu-l consuma la Google si
//            jucatorul nu-l mai poate cumpara a doua oara.
//
// `grant` spune ce primeste jucatorul. Tipuri: ads_off, coins, gems, own.
// Pentru `own`, id-urile sunt cele din COSMETICS din src/game/meta.js.

export const PRODUCTS = [
  // ——— fara reclame ———
  { id:'remove_ads', repeatable:false, entitlement:'remove_ads',
    ic:'🚫', n:'Fără reclame', d:'Scoate definitiv reclamele dintre meciuri',
    grant:{ t:'ads_off' } },

  // ——— monede ——— (consumabile)
  { id:'coins_small',  repeatable:true, ic:'🪙', n:'Pungă de monede',   d:'1.000 de monede',  grant:{ t:'coins', n:1000 } },
  { id:'coins_medium', repeatable:true, ic:'💰', n:'Sac de monede',     d:'3.000 de monede',  grant:{ t:'coins', n:3000 } },
  { id:'coins_large',  repeatable:true, ic:'🏆', n:'Cufăr de monede',   d:'8.000 de monede',  grant:{ t:'coins', n:8000 } },

  // ——— gemuri ——— (consumabile; gemul e valuta rara, tine cantitatile mici)
  { id:'gems_small',  repeatable:true, ic:'💎', n:'Gemuri',            d:'50 de gemuri',     grant:{ t:'gems', n:50 } },
  { id:'gems_large',  repeatable:true, ic:'💠', n:'Gemuri — mult',     d:'150 de gemuri',    grant:{ t:'gems', n:150 } },

  // ——— skin-uri ——— (non-consumabile)
  // Cele „Curcubeu" sunt cele mai scumpe in monede (450–800), deci candidatii
  // naturali pentru bani reali. Pachetul le da pe toate trei odata.
  { id:'skin_rainbow_ship', repeatable:false, entitlement:'skin_rainbow_ship',
    ic:'🌈', n:'Navă Curcubeu', d:'Deblochează aspectul de navă „Curcubeu ✨"',
    grant:{ t:'own', ids:['s_rainbow'] } },

  { id:'skin_pack_rainbow', repeatable:false, entitlement:'skin_pack_rainbow',
    ic:'✨', n:'Pachet Curcubeu', d:'Navă + aură + dâră, toate „Curcubeu ✨"',
    grant:{ t:'own', ids:['s_rainbow','a_rainbow','t_rainbow'] } },

  { id:'skin_shadow_set', repeatable:false, entitlement:'skin_shadow_set',
    ic:'🌑', n:'Set Umbră', d:'Navă Umbră + coechipieri Ninja + monștri Umbre',
    grant:{ t:'own', ids:['s_shadow','w_shadow','e_shadow'] } }
];

export function productById(id){ return PRODUCTS.find(p => p.id === id) || null; }
