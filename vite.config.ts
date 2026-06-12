import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Camera access needs a secure context. Plain http://localhost already IS
// one, so normal dev runs on HTTP — no certificate warnings. Self-signed
// HTTPS is only needed when opening the game from a phone via your LAN IP:
// use `npm run dev:https` for that.
export default defineConfig(({ mode }) => ({
  // Relative base so the built site works from any static host / subfolder.
  base: './',
  plugins: mode === 'https' ? [basicSsl()] : [],
  server: { host: true },
}))
