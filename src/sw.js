// Service worker sursa (Vite il compileaza cu vite-plugin-pwa, strategia
// injectManifest: self.__WB_MANIFEST devine lista reala de fisiere cu hash
// generata la build). Politica: navigatiile (documentul) sunt network-first
// — la fel ca inainte —, restul e precache-uit cu hash, deci nu mai are
// nevoie de cache-first manual. La activate stergem orice cache vechi
// 'ki-*' ramas de la service worker-ul dinaintea acestui refactor.
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'ki-doc' })
);

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('ki-v')).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.t === 'skip') self.skipWaiting();
});
