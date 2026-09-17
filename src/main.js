// Punctul de intrare al jocului. Ordinea importurilor pastreaza ordinea
// textuala din vechiul index.html: intai bootstrap-ul de UI (service worker,
// blocare landscape, butonul de instalare), apoi jocul propriu-zis.
// Datele (window.__SPRITES__/__MUS__/__BG__) vin din scripturile clasice din
// index.html, care ruleaza la parsare — deci inaintea acestui modul (deferred).
import './boot-ui.js';
import './game/sim.js';
