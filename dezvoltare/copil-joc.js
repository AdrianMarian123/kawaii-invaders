'use strict';
/**
 * Driver de proces-copil: o instanta COMPLETA de joc intr-un proces separat.
 *
 * De ce: modulele ES se incarca o singura data pe proces, deci doua instante
 * de joc (gazda + oaspete, pentru co-op) au nevoie de doua procese. Parintele
 * vorbeste cu fiecare copil prin IPC:
 *
 *   const { pornesteCopil } = require('./copil-joc');
 *   const H = await pornesteCopil({ url:'...?relay=ws://...', faraBucla:true });
 *   await H.eval("return __dbg.state");        // corpul unei functii async:
 *   await H.eval("__dbg.netHost(); return null");  // mediu, w, document, __dbg in scope
 *   await H.click('startBtn');
 *   await H.erori();                           // lista de erori stransa in copil
 *   H.omoara();
 *
 * Valorile intoarse trec prin JSON — doar date simple.
 */

if (process.env.COPIL_JOC === '1') {
  // ————— modul copil —————
  const { pornesteJocul } = require('./mediu-joc');
  (async () => {
    let mediu;
    try {
      mediu = await pornesteJocul(JSON.parse(process.env.COPIL_OPT || '{}'));
      process.send({ gata: true });
    } catch (e) {
      process.send({ gata: false, eroare: String((e && e.stack) || e) });
      process.exit(1);
      return;
    }
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    process.on('message', async (m) => {
      if (!m || !m.id) return;
      try {
        let val = null;
        if (m.op === 'eval') {
          const f = new AsyncFunction('mediu', 'w', 'document', '__dbg', m.cod);
          const r = await f(mediu, mediu.w, mediu.doc, mediu.dbg);
          val = r === undefined ? null : r;
        } else if (m.op === 'click') { mediu.click(m.el); }
        else if (m.op === 'erori') { val = mediu.erori; }
        else throw new Error('op necunoscut: ' + m.op);
        process.send({ id: m.id, val });
      } catch (e) { process.send({ id: m.id, err: String((e && e.stack) || e) }); }
    });
  })();
} else {
  // ————— modul parinte —————
  const { fork } = require('child_process');
  async function pornesteCopil(opt) {
    const c = fork(__filename, {
      env: Object.assign({}, process.env, { COPIL_JOC: '1', COPIL_OPT: JSON.stringify(opt || {}) }),
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    });
    let seq = 0; const asteapta = new Map();
    c.on('message', m => {
      if (m && m.id && asteapta.has(m.id)) {
        const { res, rej } = asteapta.get(m.id); asteapta.delete(m.id);
        m.err ? rej(new Error(m.err)) : res(m.val);
      }
    });
    await new Promise((res, rej) => {
      c.once('message', m => (m && m.gata) ? res() : rej(new Error((m && m.eroare) || 'copilul nu a pornit')));
      c.once('exit', () => rej(new Error('copilul a murit la pornire')));
    });
    const cere = (op, extra) => new Promise((res, rej) => {
      const id = ++seq; asteapta.set(id, { res, rej });
      c.send(Object.assign({ id, op }, extra));
    });
    return {
      eval: cod => cere('eval', { cod }),
      click: el => cere('click', { el }),
      erori: () => cere('erori'),
      omoara() { try { c.kill(); } catch (e) {} }
    };
  }
  module.exports = { pornesteCopil };
}
