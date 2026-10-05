// Cumparaturi reale, prin RevenueCat peste Google Play Billing.
//
// Pe web (GitHub Pages) nu exista Play Billing: tot modulul e un no-op, iar
// buy() intoarce un rezultat de eroare in loc sa arunce. Acolo magazinul cu
// bani reali nici nu se afiseaza (vezi billingReady()).
//
// ——— De ce un registru de tranzactii ———
// RevenueCat pastreaza istoricul complet al cumparaturilor intr-o lista
// (nonSubscriptionTransactions) si NU spune care intrari sunt noi. Daca am
// acorda monede pentru fiecare intrare la fiecare pornire, un jucator care a
// cumparat o data ar primi monede la infinit. De aceea tinem local id-urile
// deja creditate si acordam o singura data pe tranzactie.
//
// Efectul secundar e intentionat: daca jucatorul sterge datele aplicatiei sau
// reinstaleaza, registrul dispare si consumabilele se acorda din nou la
// restaurare — dar si monedele lui erau in acelasi localStorage, deci tocmai
// le-a pierdut. Reacordarea il repune de unde a plecat, nu-l imbogateste.

import { addCoins, addGems, grantOwned, updateCoinUI } from '../game/meta.js';
import { setAdsRemoved } from './ads.js';
import { PRODUCTS, productById } from './catalog.js';

const E = import.meta.env || {};
// Cheia publica de SDK a RevenueCat (goog_...). E publica prin design — e
// menita sa stea in client — dar o citim din .env ca sa nu fie scrisa in cod si
// ca sa poti comuta intre proiectul de test si cel real fara sa umbli in surse.
const API_KEY = E.VITE_REVENUECAT_API_KEY || '';

const TX_KEY = 'ki_billing_tx';           // tranzactii deja creditate
let Purchases = null, ProductCategory = null;
let started = false, configured = false;
let busy = false;                          // o cumparatura pe rand
const prices = Object.create(null);        // id produs → pret formatat de Google
const products = Object.create(null);      // id produs → StoreProduct

function isNative(){
  try{ return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  catch(e){ return false; }
}

function ledger(){
  try{ const a = JSON.parse(localStorage.getItem(TX_KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch(e){ return []; }
}
// true doar daca tranzactia e noua — apelantul acorda produsul abia atunci
function ledgerAdd(txId){
  if(!txId) return false;
  try{
    const a = ledger();
    if(a.includes(txId)) return false;
    a.push(txId);
    // nu lasam lista sa creasca nelimitat; 500 de cumparaturi e mult peste
    // orice jucator real, si pastram cele mai recente
    localStorage.setItem(TX_KEY, JSON.stringify(a.slice(-500)));
    return true;
  }catch(e){ return false; }
}

// ——— acordarea efectiva ———
// Intoarce true daca s-a schimbat ceva (pentru toast-ul de confirmare).
function applyGrant(g){
  if(!g) return false;
  if(g.t === 'ads_off'){ setAdsRemoved(true); return true; }
  if(g.t === 'coins'){ addCoins(g.n | 0); return true; }
  if(g.t === 'gems'){ addGems(g.n | 0); return true; }
  if(g.t === 'own'){
    let any = false;
    for(const id of (g.ids || [])) if(grantOwned(id)) any = true;
    return any;
  }
  return false;
}

// Trece prin tot ce spune RevenueCat ca deține jucatorul si acorda ce lipseste.
// Rulata la pornire si dupa fiecare cumparatura sau restaurare, ca sursa unica
// de adevar sa fie RevenueCat, nu ce credem noi local.
function reconcile(info){
  if(!info) return 0;
  let granted = 0;

  // 1. drepturi permanente (fara reclame, skin-uri) — prin entitlements
  const active = (info.entitlements && info.entitlements.active) || {};
  for(const p of PRODUCTS){
    if(p.repeatable || !p.entitlement) continue;
    if(active[p.entitlement] && applyGrant(p.grant)) granted++;
  }

  // 2. cumparaturi one-time din istoric
  for(const tx of (info.nonSubscriptionTransactions || [])){
    const p = productById(tx.productIdentifier);
    if(!p) continue;
    if(p.repeatable){
      // consumabil: o singura data pe tranzactie
      if(ledgerAdd(tx.transactionIdentifier) && applyGrant(p.grant)) granted++;
    } else {
      // non-consumabil: applyGrant e idempotent (grantOwned intoarce false daca
      // il are deja), deci nu are nevoie de registru. Acopera si cazul in care
      // entitlement-ul nu a fost configurat in panoul RevenueCat.
      if(applyGrant(p.grant)) granted++;
    }
  }

  if(granted) updateCoinUI();
  return granted;
}

// Preturile vin de la Google, in moneda jucatorului si cu taxele lui. Fara ele
// nu afisam magazinul: un buton de cumparare fara pret afisat e inacceptabil.
async function loadPrices(){
  try{
    const ids = PRODUCTS.map(p => p.id);
    // ATENTIE: implicit getProducts cere ABONAMENTE. Toate produsele noastre
    // sunt one-time, deci categoria trebuie spusa explicit — altfel lista vine
    // goala si magazinul pare gol fara nicio eroare.
    const res = await Purchases.getProducts({
      productIdentifiers: ids,
      type: ProductCategory.NON_SUBSCRIPTION
    });
    for(const sp of (res && res.products) || []){
      products[sp.identifier] = sp;
      prices[sp.identifier] = sp.priceString || '';
    }
    const missing = ids.filter(id => !products[id]);
    if(missing.length) console.warn('[billing] produse negasite in Play Console / RevenueCat: ' + missing.join(', '));
  }catch(e){ console.warn('[billing] preturi:', e); }
}

async function initBilling(){
  if(started) return;
  started = true;
  if(!isNative()) return;
  if(!API_KEY){ console.warn('[billing] VITE_REVENUECAT_API_KEY lipseste din .env — cumparaturile sunt dezactivate'); return; }
  try{
    const m = await import('@revenuecat/purchases-capacitor');
    Purchases = m.Purchases; ProductCategory = m.PRODUCT_CATEGORY;
    await Purchases.configure({ apiKey: API_KEY });
    configured = true;
    await loadPrices();
    // Sincronizarea la pornire aduce cumparaturile facute pe alt telefon sau
    // pierdute la reinstalare, fara ca jucatorul sa apese nimic.
    const { customerInfo } = await Purchases.getCustomerInfo();
    reconcile(customerInfo);
  }catch(e){
    Purchases = null; configured = false;
    console.warn('[billing] init:', e);        // fara cumparaturi, dar jocul merge
  }
}

// true doar cand chiar se poate cumpara; altfel ascundem magazinul real.
function billingReady(){ return configured && Object.keys(prices).length > 0; }
function priceOf(id){ return prices[id] || ''; }
function isBusy(){ return busy; }

// Intoarce { ok, cancelled, granted, error } si nu arunca niciodata, ca UI-ul sa
// trateze anularea — cazul cel mai frecvent — ca pe un rezultat normal.
async function buy(productId){
  if(!configured) return { ok:false, error:'cumparaturile nu sunt disponibile' };
  if(busy) return { ok:false, error:'o cumparatura e deja in curs' };
  const sp = products[productId];
  if(!sp) return { ok:false, error:'produsul nu e disponibil' };
  busy = true;
  try{
    const res = await Purchases.purchaseStoreProduct({ product: sp });
    return { ok:true, granted: reconcile(res && res.customerInfo) };
  }catch(e){
    // anularea de catre jucator nu e o eroare — e cazul normal
    const cancelled = !!(e && (e.userCancelled || /cancel/i.test(String(e.message || ''))));
    if(!cancelled) console.warn('[billing] buy ' + productId + ':', e);
    return { ok:false, cancelled, error:(e && e.message) || 'cumpărare eșuată' };
  }finally{ busy = false; }
}

// Google cere un buton de restaurare pentru produsele non-consumabile.
async function restore(){
  if(!configured) return { ok:false, error:'cumparaturile nu sunt disponibile' };
  try{
    const { customerInfo } = await Purchases.restorePurchases();
    return { ok:true, granted: reconcile(customerInfo) };
  }catch(e){
    console.warn('[billing] restore:', e);
    return { ok:false, error:(e && e.message) || 'restaurare eșuată' };
  }
}

export { billingReady, buy, initBilling, isBusy, priceOf, restore };
