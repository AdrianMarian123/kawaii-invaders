// Adresa serverului de relay pentru co-op si UI-ul campului de server.
// Prioritatea adresei: ?relay= din URL > localStorage (kw_relay_url) >
// serverul livrat in cod (Render).
import { el } from '../game/utils.js';

const DEFAULT_RELAY = 'wss://kawaii-relay.onrender.com';
const RELAY_KEY = 'kw_relay_url';
// accepta orice forma (https://, http://, sau doar domeniul) si o normalizeaza la ws/wss
function normRelay(u){
  u = String(u||'').trim().replace(/\s+/g,'');
  if(!u) return '';
  if(/^https:\/\//i.test(u))      u = 'wss://' + u.slice(8);
  else if(/^http:\/\//i.test(u))  u = 'ws://'  + u.slice(7);
  else if(!/^wss?:\/\//i.test(u)) u = (/^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u) ? 'ws://' : 'wss://') + u;
  return u.replace(/\/+$/,'');
}
function relayIsSet(u){ return !!u && u.indexOf('REPLACE') < 0; }
// prioritate: ?relay=... din URL  >  ce a salvat jucatorul  >  valoarea din cod
function getRelay(){
  try{ const q = new URLSearchParams(location.search).get('relay');
       if(q){ const n = normRelay(q); if(n){ try{localStorage.setItem(RELAY_KEY,n);}catch(e){} return n; } } }catch(e){}
  try{ const sv = localStorage.getItem(RELAY_KEY); if(sv){ const n = normRelay(sv); if(n) return n; } }catch(e){}
  return normRelay(DEFAULT_RELAY);
}
function setRelay(u){
  const n = normRelay(u);
  try{ if(n) localStorage.setItem(RELAY_KEY, n); else localStorage.removeItem(RELAY_KEY); }catch(e){}
  return n;
}
function relayHint(txt, col){ const h=el('coopRelayHint'); if(h){ h.textContent=txt||''; h.style.color=col||'rgba(255,255,255,.6)'; } }
function refreshRelayUI(){
  const f = el('coopRelay'); if(!f) return;
  const cur = getRelay(), set = relayIsSet(cur);
  f.value = set ? cur : '';
  f.style.borderColor = 'rgba(255,255,255,.22)';
  relayHint(set ? '✓ salvată pe acest dispozitiv' : 'ex: wss://kawaii-relay.onrender.com · se salvează automat', set ? '#7ef9d2' : null);
}
function saveRelayFromField(){ const f = el('coopRelay'); return f ? setRelay(f.value) : getRelay(); }
// textul lung de explicatii nu mai e util odata ce ai codul — il ascundem ca sa incapa codul
function showCoopIntro(show){ const m = el('coopMsg'); if(m) m.style.display = show ? '' : 'none'; }
function showRelayBox(open){
  const b = el('coopRelayBox'); if(!b) return;
  b.style.display = open ? 'flex' : 'none';
  if(open) refreshRelayUI();
}

export { getRelay, normRelay, refreshRelayUI, relayHint, relayIsSet, saveRelayFromField, setRelay, showCoopIntro, showRelayBox };
