/**
 * Incarca ../index.html ca text, exact ca fs.readFileSync, dar cu orice
 * <script src="..."></script> inlocuit cu continutul fisierului de pe disc.
 *
 * De ce: testele cauta bucati de cod dupa markeri text (ex. HTML.indexOf('// ===...'))
 * sau ruleaza tot fisierul intr-un jsdom. Ambele presupun un singur text mare,
 * la fel ca azi. Odata ce jocul e impartit in fisiere .js separate, jsdom nu le
 * mai incarca singur (nu face fetch la resurse externe) — asa ca le lipim
 * inapoi in text, in ordine, inainte sa ajunga la jsdom/vm. Rezultatul e
 * echivalent octet-cu-octet cu fisierul dinainte de impartire.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SCRIPT_SRC_RE = /<script(?![^>]*type=["']module["'])([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/g;

function loadGameHtml() {
  const file = path.join(__dirname, '..', 'index.html');
  const dir = path.dirname(file);
  const html = fs.readFileSync(file, 'utf8');
  return html.replace(SCRIPT_SRC_RE, (match, before, src, after) => {
    const code = fs.readFileSync(path.join(dir, src), 'utf8');
    return `<script${before}${after}>${code}</script>`;
  });
}

module.exports = { loadGameHtml };
