'use strict';
/**
 * De unde iau testele serverul de relay.
 *
 * Serverul adevărat trăiește în repo-ul lui, `kawaii-relay`. Dacă îl ai clonat
 * alături (`D:\git\kawaii-relay` lângă `D:\git\kawaii-invaders`), testele îl
 * folosesc pe ACELA — deci verifică serverul care rulează de fapt pe Render,
 * nu o copie care poate fi rămas în urmă.
 *
 * `server-relay.js` din dosarul ăsta e doar plasa de siguranță: pe alt
 * calculator, fără clona serverului, testele merg în continuare.
 *
 * Dacă cele două diferă, primești un avertisment cu comanda de sincronizare.
 */
const fs = require('fs');
const path = require('path');

const COPIE = path.join(__dirname, 'server-relay.js');
const REAL  = path.join(__dirname, '..', '..', 'kawaii-relay', 'server.js');

function relayPath() {
  if (!fs.existsSync(REAL)) return COPIE;
  try {
    if (fs.readFileSync(REAL, 'utf8') !== fs.readFileSync(COPIE, 'utf8')) {
      console.warn('\n  ⚠  Copia locală a serverului a rămas în urmă.');
      console.warn('     Rulez testele pe serverul ADEVĂRAT: ' + REAL);
      console.warn('     Ca să aduci copia la zi:');
      console.warn('       copy "' + REAL + '" "' + COPIE + '"\n');
    }
  } catch (e) { /* dacă nu pot citi, merg mai departe cu ce am */ }
  return REAL;
}

/** Serverul adevărat nu-și are pachetele instalate; îi împrumutăm `ws` de aici. */
function relayEnv(extra) {
  return Object.assign({}, process.env, {
    NODE_PATH: path.join(__dirname, 'node_modules')
  }, extra || {});
}

function relayName() {
  return relayPath() === REAL ? 'serverul adevărat (kawaii-relay)' : 'copia din dosar';
}

module.exports = { relayPath, relayEnv, relayName, COPIE, REAL };
