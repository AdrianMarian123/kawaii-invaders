import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' — merge si pe GitHub Pages (subcale /kawaii-invaders/) si in Capacitor.
export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: null,   // inregistrarea ramane manuala, in boot-ui.js
      manifest: false,        // manifest.webmanifest static din public/, neatins
      injectManifest: {
        // fisierele-date (sprite/muzica/fundal) sunt ~2MB in total; fara asta
        // workbox le-ar exclude tacit din precache si jocul ar ramane fara ele offline
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      }
    })
  ]
});
