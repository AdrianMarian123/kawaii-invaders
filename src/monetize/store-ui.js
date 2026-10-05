// Tabul „💳 Magazin" din shop: produsele cu bani reali.
//
// Se inregistreaza in meta.js prin registerStore(), deci meta.js nu afla
// niciodata de RevenueCat. Tabul apare DOAR daca Billing e configurat si Google
// a intors preturi — pe web (GitHub Pages) nu apare deloc.
//
// Foloseste aceleasi clase CSS (.shopcard/.sbtn) ca restul magazinului, ca sa
// nu arate ca o bucata lipita.

import { registerStore, shop } from '../game/meta.js';
import { toast } from '../game/sim.js';
import { adsRemoved } from './ads.js';
import { billingReady, buy, isBusy, priceOf, restore } from './billing.js';
import { PRODUCTS } from './catalog.js';

// Un non-consumabil deja deținut NU mai poate fi cumparat: Google respinge a
// doua cumparare cu „already owned", si jucatorul ar vedea doar o eroare. Deci
// il arătăm ca deținut, iar skin-ul se echipeaza din tabul lui de cosmetice.
// Pachetele conteaza ca deținute doar cand jucatorul are TOT ce contin.
function alreadyOwned(p){
  if(p.repeatable) return false;
  const g = p.grant;
  if(!g) return false;
  if(g.t === 'ads_off') return adsRemoved();
  if(g.t === 'own') return (g.ids || []).length > 0 && (g.ids || []).every(id => !!shop.owned[id]);
  return false;
}

function card(p, rerender){
  const c = document.createElement('div');
  c.className = 'shopcard';

  const ic = document.createElement('div');
  ic.className = 'sw';
  ic.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:40px;height:76px';
  ic.textContent = p.ic || '🛒';
  c.appendChild(ic);

  const nm = document.createElement('div');
  nm.className = 'sname';
  nm.textContent = p.n;
  c.appendChild(nm);

  if(p.d){
    const d = document.createElement('div');
    d.className = 'sdesc';
    d.textContent = p.d;
    c.appendChild(d);
  }

  const b = document.createElement('button');
  const price = priceOf(p.id);
  if(alreadyOwned(p)){
    b.className = 'sbtn on'; b.textContent = 'deținut ✓'; b.disabled = true;
  } else if(!price){
    // produsul e in catalog dar nu in Play Console (sau nu e inca activ)
    b.className = 'sbtn cant'; b.textContent = 'indisponibil'; b.disabled = true;
  } else {
    b.className = 'sbtn buy';
    b.textContent = price;                 // pretul vine de la Google, nu din cod
    b.onclick = async () => {
      if(isBusy()) return;
      b.disabled = true; b.textContent = '...';
      const r = await buy(p.id);
      if(r.ok) toast('✨ ' + p.n + ' — mulțumim!', '#ffd24a');
      else if(!r.cancelled) toast('⚠️ ' + (r.error || 'cumpărare eșuată'), '#ff8fc7');
      rerender();                          // reface tabul: preturi, deținut, monede
    };
  }
  c.appendChild(b);
  return c;
}

function render(grid, rerender){
  for(const p of PRODUCTS) grid.appendChild(card(p, rerender));

  // Google cere o cale de restaurare pentru produsele non-consumabile: fara ea,
  // un jucator pe telefon nou si-a pierdut cumparatura.
  const r = document.createElement('div');
  r.className = 'shopcard';
  const ic = document.createElement('div');
  ic.className = 'sw';
  ic.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:40px;height:76px';
  ic.textContent = '♻️';
  r.appendChild(ic);
  const nm = document.createElement('div'); nm.className = 'sname'; nm.textContent = 'Restaurează';
  r.appendChild(nm);
  const d = document.createElement('div'); d.className = 'sdesc';
  d.textContent = 'Ai cumpărat deja, pe alt telefon?';
  r.appendChild(d);
  const b = document.createElement('button');
  b.className = 'sbtn eqbtn'; b.textContent = 'restaurează';
  b.onclick = async () => {
    b.disabled = true; b.textContent = '...';
    const res = await restore();
    if(!res.ok) toast('⚠️ ' + (res.error || 'restaurare eșuată'), '#ff8fc7');
    else if(res.granted) toast('✨ cumpărături restaurate!', '#7ef9d2');
    else toast('nimic de restaurat pe acest cont', '#8fd3ff');
    rerender();
  };
  r.appendChild(b);
  grid.appendChild(r);
}

// Apelat o data la pornire, din src/main.js
export function installStoreUI(){
  registerStore({ available: billingReady, render });
}
