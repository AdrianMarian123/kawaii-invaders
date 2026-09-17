'use strict';
/**
 * Mediul de test: porneste jocul REAL (modulele din src/) peste un DOM fals.
 *
 * Cum functioneaza: citim index.html doar pentru DOM (jsdom nu ruleaza niciun
 * script), punem pe globalThis tot ce atinge jocul (document, window,
 * localStorage, matchMedia, canvas...), apoi importam src/main.js — exact
 * modulele care ajung si in build. Testele vorbesc cu jocul prin
 * window.__dbg (puntea de test din src/game/sim.js) si prin DOM-ul real.
 *
 * Un proces = o singura instanta de joc (modulele ES se incarca o data).
 * Pentru doua instante (co-op) foloseste copil-joc.js.
 *
 * Optiuni: { W, H            — marimea terenului (implicit 720x1280),
 *            url             — adresa paginii (ex. '...?relay=ws://...'),
 *            faraBucla:true  — nu porneste bucla de joc (rAF mort); face
 *                              testele de logica deterministe }
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { JSDOM, VirtualConsole } = require('jsdom');

const noop = () => {};
const PROPS = new Set(['fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','miterLimit','lineDashOffset',
  'font','textAlign','textBaseline','direction','globalAlpha','globalCompositeOperation','shadowBlur',
  'shadowColor','shadowOffsetX','shadowOffsetY','imageSmoothingEnabled','imageSmoothingQuality','filter',
  'letterSpacing','wordSpacing','fontKerning']);

async function pornesteJocul(opt) {
  opt = opt || {};
  const W = opt.W || 720, H = opt.H || 1280;
  const erori = [];

  // context 2d fals care INREGISTREAZA apelurile de desen (ex. testul
  // „nava moarta nu mai e desenata": reset -> drawP2 -> zero apeluri)
  const apeluri = [];
  const ctx2d = new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: W, height: H };
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (k === 'createPattern') return () => null;
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (PROPS.has(k)) return t[k];
      if (typeof k !== 'string') return noop;
      return (...a) => { apeluri.push(k); };
    },
    set(t, k, v) { t[k] = v; return true; }
  });

  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => erori.push('jsdom: ' + String((e && e.detail && e.detail.stack) || (e && e.message) || e)));
  const dom = new JSDOM(html, {
    url: opt.url || 'https://local.test/',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;

  // ——— petice de mediu (aceleasi ca in testele vechi) ———
  w.HTMLCanvasElement.prototype.getContext = () => ctx2d;
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
  const deep = () => new Proxy(function(){}, {
    get(t, k) { if (k === 'currentTime' || k === 'value' || k === 'sampleRate') return 0;
      if (k === 'state') return 'running'; if (k === 'then' || k === Symbol.toPrimitive) return undefined;
      return deep(); },
    set() { return true; }, apply() { return deep(); }, construct() { return deep(); }
  });
  w.AudioContext = w.webkitAudioContext = function(){ return deep(); };
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  w.HTMLMediaElement.prototype.pause = noop;
  w.HTMLMediaElement.prototype.load = noop;
  w.matchMedia = () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop });
  try { Object.defineProperty(w.navigator, 'vibrate', { value: noop, configurable: true }); } catch (e) {}
  // jsdom nu face layout: dam terenului o marime reala, altfel W=H=0
  Object.defineProperty(w, 'innerWidth', { value: W, configurable: true });
  Object.defineProperty(w, 'innerHeight', { value: H, configurable: true });
  w.Element.prototype.getBoundingClientRect = function () {
    return this.id === 'wrap'
      ? { x: 0, y: 0, left: 0, top: 0, right: W, bottom: H, width: W, height: H }
      : { x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  };
  w.onerror = (msg, src, ln, col, err) => { erori.push((err && err.stack) || String(msg)); };
  // jsdom nu are scrollIntoView; il inregistram (testul „codul e adus in vizor")
  w.__scrolled = false;
  w.Element.prototype.scrollIntoView = function () { w.__scrolled = true; };
  // datele (sprite/muzica/fundal) nu se incarca oricum in jsdom — stub-uri goale
  w.__SPRITES__ = {}; w.__MUS__ = {}; w.__BG__ = {};

  // ——— globalele prin care jocul isi vede „browserul" ———
  const def = (nume, valoare) => { try { Object.defineProperty(globalThis, nume, { value: valoare, configurable: true, writable: true }); } catch (e) {} };
  def('window', w);
  def('document', w.document);
  try { Object.defineProperty(globalThis, 'location', { get: () => dom.window.location, configurable: true }); } catch (e) {}
  def('localStorage', w.localStorage);
  try { Object.defineProperty(globalThis, 'navigator', { get: () => w.navigator, configurable: true }); } catch (e) {}
  def('screen', w.screen);
  def('matchMedia', w.matchMedia);
  def('Image', w.Image);
  def('AudioContext', w.AudioContext);
  def('webkitAudioContext', w.AudioContext);
  def('addEventListener', w.addEventListener.bind(w));
  def('removeEventListener', w.removeEventListener.bind(w));
  def('dispatchEvent', w.dispatchEvent.bind(w));
  def('requestAnimationFrame', opt.faraBucla ? (() => 0) : w.requestAnimationFrame.bind(w));
  def('cancelAnimationFrame', w.cancelAnimationFrame ? w.cancelAnimationFrame.bind(w) : noop);
  def('prompt', (...a) => (typeof w.prompt === 'function' ? w.prompt(...a) : null));
  // coopWake face fetch spre serverul de relay ca sa-l trezeasca — irelevant in teste
  def('fetch', () => Promise.resolve({ ok: true }));
  // WebSocket ramane cel din Node (functioneaza cu serverul de relay real)

  process.on('uncaughtException', e => erori.push('exceptie: ' + ((e && e.stack) || e)));
  process.on('unhandledRejection', e => erori.push('promisiune: ' + ((e && e.stack) || e)));

  // ——— pornim jocul adevarat ———
  await import(pathToFileURL(path.join(__dirname, '..', 'src', 'main.js')).href);
  const dbg = w.__dbg;
  if (!dbg) throw new Error('jocul a pornit dar window.__dbg lipseste — verifica src/game/sim.js');

  // istoricul toast-urilor (toast() suprascrie textul; noi le pastram pe toate)
  w.__toasts = [];
  const elToast = w.document.getElementById('toast');
  if (elToast && w.MutationObserver) {
    new w.MutationObserver(() => { if (elToast.textContent) w.__toasts.push(elToast.textContent); })
      .observe(elToast, { childList: true, characterData: true, subtree: true });
  }

  return {
    dom, w, doc: w.document, erori, dbg,
    apeluriDesen: apeluri,
    resetDesen() { apeluri.length = 0; },
    click(id) {
      const e = w.document.getElementById(id);
      if (!e) throw new Error('lipseste #' + id);
      e.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    },
    schimbaUrl(url) { dom.reconfigure({ url }); }
  };
}

module.exports = { pornesteJocul };
