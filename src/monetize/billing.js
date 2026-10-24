// Cumparaturi reale, prin RevenueCat peste Google Play Billing.
// Pe web nu exista Play Billing: tot modulul e no-op si magazinul nu se afiseaza.
//
// RevenueCat pastreaza istoricul complet al cumparaturilor si NU spune care
// intrari sunt noi. Fara un registru local al tranzactiilor deja creditate, un
// jucator care a cumparat o data ar primi monede la fiecare pornire.
//
// Daca sterge datele aplicatiei, registrul dispare si consumabilele se acorda din
// nou la restaurare — dar si monedele lui erau in acelasi localStorage, deci
// tocmai le-a pierdut. Il repune de unde a plecat, nu-l imbogateste.

import { addCoins, addGems, grantOwned, updateCoinUI } from '../game/meta.js';
import { adsRemoved, setAdsRemoved } from './ads.js';
import { PRODUCTS, productById } from './catalog.js';

const E = import.meta.env || {};
// Cheia PUBLICA de SDK (goog_...). E menita sa stea in client; o citim din .env
// ca sa poti comuta intre proiectul de test si cel real fara sa umbli in cod.
// Cheia secreta (sk_...) nu intra niciodata aici.
const API_KEY = E.VITE_REVENUECAT_API_KEY || '';

const TX_KEY='ki_billing_tx';
let Purchases=null, ProductCategory=null;
let started=false, configured=false, busy=false;
const prices=Object.create(null);     // id → pret formatat de Google
const products=Object.create(null);   // id → StoreProduct

function isNative(){ try{ return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()); }catch(e){ return false; } }

function ledger(){ try{ const a=JSON.parse(localStorage.getItem(TX_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function ledgerHas(id){ return ledger().includes(id); }
// Fara plafon pe lista: taierea celor vechi ar scoate id-uri pe care RevenueCat
// inca le raporteaza, iar acelea s-ar credita la nesfarsit.
function ledgerAdd(id){ try{ const a=ledger(); if(!a.includes(id)){ a.push(id); localStorage.setItem(TX_KEY,JSON.stringify(a)); } }catch(e){} }

// Intoarce true doar daca a schimbat ceva — altfel „restaurat!" ar aparea si cand
// nu era nimic de restaurat.
function applyGrant(g){
  if(!g) return false;
  if(g.t==='ads_off'){ if(adsRemoved()) return false; setAdsRemoved(true); return true; }
  if(g.t==='coins'){ addCoins(g.n|0); return true; }
  if(g.t==='gems'){ addGems(g.n|0); return true; }
  if(g.t==='own'){ let any=false; for(const id of (g.ids||[])) if(grantOwned(id)) any=true; return any; }
  return false;
}

// Sursa de adevar e RevenueCat, nu ce credem noi local. Rulata la pornire si
// dupa fiecare cumparare sau restaurare.
function reconcile(info){
  if(!info) return 0;
  let n=0;
  const active=(info.entitlements&&info.entitlements.active)||{};
  for(const p of PRODUCTS){
    if(!p.repeatable && p.entitlement && active[p.entitlement] && applyGrant(p.grant)) n++;
  }
  for(const tx of (info.nonSubscriptionTransactions||[])){
    const p=productById(tx.productIdentifier);
    if(!p) continue;
    if(p.repeatable){
      // Acordam INTAI si abia apoi notam: daca scrierea in localStorage pica,
      // riscam o acordare dubla — preferabil unei cumparaturi platite si pierdute.
      if(ledgerHas(tx.transactionIdentifier)) continue;
      if(applyGrant(p.grant)) n++;
      ledgerAdd(tx.transactionIdentifier);
    } else if(applyGrant(p.grant)) n++;   // idempotent, n-are nevoie de registru
  }
  if(n) updateCoinUI();
  return n;
}

// Preturile vin de la Google, in moneda jucatorului. Fara ele nu afisam magazinul.
async function loadPrices(){
  try{
    const ids=PRODUCTS.map(p=>p.id);
    // Implicit getProducts cere ABONAMENTE; ale noastre sunt one-time, deci
    // categoria trebuie spusa explicit — altfel lista vine goala, fara eroare.
    const res=await Purchases.getProducts({ productIdentifiers:ids, type:ProductCategory.NON_SUBSCRIPTION });
    for(const sp of (res&&res.products)||[]){ products[sp.identifier]=sp; prices[sp.identifier]=sp.priceString||''; }
    const missing=ids.filter(id=>!products[id]);
    if(missing.length) console.warn('[billing] produse negasite in Play Console / RevenueCat: '+missing.join(', '));
  }catch(e){ console.warn('[billing] preturi:',e); }
}

async function initBilling(){
  if(started) return;
  started=true;
  if(!isNative()) return;
  if(!API_KEY){ console.warn('[billing] VITE_REVENUECAT_API_KEY lipseste din .env — cumparaturile sunt dezactivate'); return; }
  try{
    const m=await import('@revenuecat/purchases-capacitor');
    Purchases=m.Purchases; ProductCategory=m.PRODUCT_CATEGORY;
    await Purchases.configure({ apiKey:API_KEY });
    configured=true;
    await loadPrices();
    // Aduce cumparaturile facute pe alt telefon sau pierdute la reinstalare.
    const { customerInfo }=await Purchases.getCustomerInfo();
    reconcile(customerInfo);
  }catch(e){ Purchases=null; configured=false; console.warn('[billing] init:',e); }
}

function billingReady(){ return configured && Object.keys(prices).length>0; }
function priceOf(id){ return prices[id]||''; }
function isBusy(){ return busy; }

// Intoarce { ok, cancelled, granted, error } si nu arunca — anularea de catre
// jucator e cazul normal, nu o eroare.
async function buy(productId){
  if(!configured) return { ok:false, error:'cumpărăturile nu sunt disponibile' };
  if(busy) return { ok:false, error:'o cumpărare e deja în curs' };
  const sp=products[productId];
  if(!sp) return { ok:false, error:'produsul nu e disponibil' };
  busy=true;
  try{
    const res=await Purchases.purchaseStoreProduct({ product:sp });
    return { ok:true, granted:reconcile(res&&res.customerInfo) };
  }catch(e){
    const cancelled=!!(e&&(e.userCancelled||/cancel/i.test(String(e.message||''))));
    if(!cancelled) console.warn('[billing] buy '+productId+':',e);
    return { ok:false, cancelled, error:(e&&e.message)||'cumpărare eșuată' };
  }finally{ busy=false; }
}

// Google cere o cale de restaurare pentru produsele non-consumabile.
async function restore(){
  if(!configured) return { ok:false, error:'cumpărăturile nu sunt disponibile' };
  try{
    const { customerInfo }=await Purchases.restorePurchases();
    return { ok:true, granted:reconcile(customerInfo) };
  }catch(e){
    console.warn('[billing] restore:',e);
    return { ok:false, error:(e&&e.message)||'restaurare eșuată' };
  }
}

export { billingReady, buy, initBilling, isBusy, priceOf, restore };
