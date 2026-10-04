const C='ki-v71';
const A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-512-maskable.png','apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener('message',e=>{ if(e.data&&e.data.t==='skip')self.skipWaiting(); });
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET')return;
  const req=e.request, url=new URL(req.url), same=url.origin===self.location.origin;
  // fetch()-urile spre alte servere (ex. trezirea serverului de co-op) nu trec prin cache
  if(!same && req.destination==='')return;
  const isDoc = same && (req.mode==='navigate' || (req.destination==='document') || url.pathname.endsWith('/') || url.pathname.endsWith('index.html'));
  if(isDoc){
    e.respondWith(fetch(req).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put('index.html',cp)); return res; })
      .catch(()=>caches.match('index.html').then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{ const cp=res.clone(); caches.open(C).then(c=>c.put(req,cp)); return res; }).catch(()=>caches.match('index.html'))));
});
