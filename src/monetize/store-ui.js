// Tabul „💳 Magazin" din shop: produsele cu bani reali.
// Se inregistreaza in meta.js prin registerStore(), deci meta.js nu afla de
// RevenueCat. Tabul apare doar daca Billing e configurat si Google a dat preturi.

import { registerStore, shop } from '../game/meta.js';
import { toast } from '../game/sim.js';
import { adsRemoved } from './ads.js';
import { billingReady, buy, isBusy, priceOf, restore } from './billing.js';
import { PRODUCTS } from './catalog.js';

// Un non-consumabil deja detinut nu mai poate fi cumparat — Google respinge a
// doua cumparare cu „already owned" si jucatorul ar vedea doar o eroare.
// Pachetele conteaza ca detinute abia cand are TOT ce contin.
function owned(p){
  const g=p.grant;
  if(p.repeatable||!g) return false;
  if(g.t==='ads_off') return adsRemoved();
  if(g.t==='own') return (g.ids||[]).length>0 && g.ids.every(id=>!!shop.owned[id]);
  return false;
}

// Aceleasi clase ca restul magazinului, ca sa nu arate ca o bucata lipita.
function card(ic, name, desc, btn){
  const c=document.createElement('div'); c.className='shopcard';
  const i=document.createElement('div'); i.className='sw';
  i.style.cssText='display:flex;align-items:center;justify-content:center;font-size:40px;height:76px';
  i.textContent=ic; c.appendChild(i);
  const n=document.createElement('div'); n.className='sname'; n.textContent=name; c.appendChild(n);
  if(desc){ const d=document.createElement('div'); d.className='sdesc'; d.textContent=desc; c.appendChild(d); }
  c.appendChild(btn);
  return c;
}

function render(grid, rerender){
  for(const p of PRODUCTS){
    const b=document.createElement('button');
    const price=priceOf(p.id);
    if(owned(p)){ b.className='sbtn on'; b.textContent='deținut ✓'; b.disabled=true; }
    else if(!price){ b.className='sbtn buy cant'; b.textContent='indisponibil'; b.disabled=true; }
    else {
      b.className='sbtn buy';
      b.textContent=price;                  // pretul vine de la Google, nu din cod
      b.onclick=async()=>{
        if(isBusy()) return;
        b.disabled=true; b.textContent='...';
        const r=await buy(p.id);
        if(r.ok) toast('✨ '+p.n+' — mulțumim!','#ffd24a');
        else if(!r.cancelled) toast('⚠️ '+(r.error||'cumpărare eșuată'),'#ff8fc7');
        rerender();
      };
    }
    grid.appendChild(card(p.ic||'🛒', p.n, p.d, b));
  }

  // Google cere o cale de restaurare pentru non-consumabile: fara ea, un jucator
  // pe telefon nou si-a pierdut cumparatura.
  const b=document.createElement('button');
  b.className='sbtn eqbtn'; b.textContent='restaurează';
  b.onclick=async()=>{
    b.disabled=true; b.textContent='...';
    const r=await restore();
    if(!r.ok) toast('⚠️ '+(r.error||'restaurare eșuată'),'#ff8fc7');
    else if(r.granted) toast('✨ cumpărături restaurate!','#7ef9d2');
    else toast('nimic de restaurat pe acest cont','#8fd3ff');
    rerender();
  };
  grid.appendChild(card('♻️','Restaurează','Ai cumpărat deja, pe alt telefon?',b));
}

// Apelat o data la pornire, din src/main.js
export function installStoreUI(){ registerStore({ available: billingReady, render }); }
