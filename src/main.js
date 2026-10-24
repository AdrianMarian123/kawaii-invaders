// Punctul de intrare al jocului. Ordinea importurilor pastreaza ordinea
// textuala din vechiul index.html: intai bootstrap-ul de UI (service worker,
// blocare landscape, butonul de instalare), apoi jocul propriu-zis.
// Datele (window.__SPRITES__/__BG__) vin din scripturile clasice din
// index.html, care ruleaza la parsare — deci inaintea acestui modul (deferred).
import './boot-ui.js';
import './game/sim.js';
import { initAds } from './monetize/ads.js';
import { initBilling } from './monetize/billing.js';
import { installStoreUI } from './monetize/store-ui.js';

// Monetizarea porneste dupa ce jocul e pe picioare: ambele initializari fac
// cereri de retea (consimtamant UMP, prima reclama, preturile din Play) si
// n-au de ce sa concureze cu spriturile si muzica pentru primul cadru.
// Pe web ambele sunt no-op, iar promisiunile nu resping niciodata — de aici
// .catch() tacut, ca sa nu polueze consola si testele.
installStoreUI();
setTimeout(()=>{
  initAds().catch(()=>{});
  initBilling().catch(()=>{});
}, 1200);
