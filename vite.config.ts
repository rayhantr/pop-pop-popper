import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// Camera access needs a secure context. Plain http://localhost already IS
// one, so normal dev runs on HTTP — no certificate warnings. Self-signed
// HTTPS is only needed when opening the game from a phone via your LAN IP:
// use `yarn dev:https` for that.
export default defineConfig(({ mode }) => ({
  // Absolute base for the root-domain deploy (https://popr.sindbug.com) so the
  // service worker scope and precache URLs are correct. For subfolder hosting,
  // switch back to './' and adjust the PWA `scope`/`start_url` below to match.
  base: '/',
  plugins: [
    ...(mode === 'https' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Icons are generated from branding/icon.svg by scripts/seo-assets.mjs
      // (yarn prebuild) and live in public/. The <link rel="manifest"> tag is
      // injected automatically; the favicon/apple-touch <link>s are in index.html.
      manifest: {
        name: 'Pop Pop Popper!',
        short_name: 'Popper',
        description:
          'Pop balloons with your bare hands using your webcam. Free, no download, private on-device hand tracking.',
        lang: 'en',
        start_url: '/?utm_source=pwa',
        scope: '/',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#69c8ff',
        theme_color: '#69c8ff',
        categories: ['games', 'entertainment', 'kids'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
        ],
        screenshots: [
          {
            src: 'og-image.png',
            sizes: '1200x630',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Pop balloons with your hands',
          },
          {
            src: 'og-image.png',
            sizes: '1200x630',
            type: 'image/png',
            label: 'Pop balloons with your hands',
          },
        ],
      },
      workbox: {
        // Precache the same-origin app shell. The ~10MB MediaPipe WASM is
        // deliberately NOT precached (kept out of these globs) so touch-only
        // players don't pay for it — it is runtime-cached on first camera use.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // The MediaPipe JS bundle is large; raise the precache size ceiling so
        // it isn't silently skipped (default is 2 MiB).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // MediaPipe hand-landmarker model (~7.8MB, cross-origin CDN).
            urlPattern: ({ url }) => url.origin === 'https://storage.googleapis.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // MediaPipe WASM runtime (same-origin, bundled by Vite).
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // Keep the SW out of `vite dev` so camera + HMR work without cache
      // interference; the production build / `yarn preview` has it for
      // offline testing.
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true },
}))
