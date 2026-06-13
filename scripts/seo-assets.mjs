// Generates every raster SEO/PWA asset from the tracked SVG sources, using
// sharp (ESM). Outputs into public/ so Vite copies them to dist and precaches
// them. Run via `npm run generate:assets` (also part of `prebuild`).
//
//   from branding/icon.svg:
//     public/pwa-192x192.png, pwa-512x512.png   – manifest "any" icons
//     public/maskable-icon-512x512.png          – Android adaptive (full-bleed)
//     public/apple-touch-icon-180x180.png       – iOS home-screen icon
//     public/favicon.ico                        – legacy 16/32/48 favicon
//   from branding/og-image.svg:
//     public/og-image.png                       – 1200x630 social share card
import sharp from 'sharp'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pub = resolve(root, 'public')
const out = (name) => resolve(pub, name)

await mkdir(pub, { recursive: true })

const iconSvg = await readFile(resolve(root, 'branding/icon.svg'))
const ogSvg = await readFile(resolve(root, 'branding/og-image.svg'))

// Render the square icon at a size. icon.svg is full-bleed (opaque sky), so the
// same render serves both the "any" and "maskable"/apple purposes — the balloon
// already sits inside the maskable safe zone.
const icon = (size) =>
  sharp(iconSvg, { density: 256 }).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 })

// --- PNG icons ---------------------------------------------------------------
await Promise.all([
  icon(192).toFile(out('pwa-192x192.png')),
  icon(512).toFile(out('pwa-512x512.png')),
  icon(512).toFile(out('maskable-icon-512x512.png')),
  icon(180).toFile(out('apple-touch-icon-180x180.png')),
])

// --- favicon.ico (16/32/48, PNG-encoded entries; zero extra deps) ------------
const icoSizes = [16, 32, 48]
const icoPngs = await Promise.all(icoSizes.map((s) => icon(s).toBuffer()))
await writeFile(out('favicon.ico'), buildIco(icoSizes.map((size, i) => ({ size, data: icoPngs[i] }))))

// --- Open Graph share card (2x supersampled, then downscaled) ----------------
await sharp(ogSvg, { density: 144 })
  .resize(1200, 630, { fit: 'cover' })
  .png({ quality: 90, compressionLevel: 9 })
  .toFile(out('og-image.png'))

console.log('✓ SEO/PWA assets generated in public/ (icons, favicon.ico, og-image.png)')

/** Pack PNG buffers into a Windows .ico container (Vista+ PNG-in-ICO). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  const directory = Buffer.alloc(16 * images.length)
  let offset = header.length + directory.length
  images.forEach(({ size, data }, i) => {
    const e = directory.subarray(i * 16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 == 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette colours
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8) // image data size
    e.writeUInt32LE(offset, 12) // image data offset
    offset += data.length
  })

  return Buffer.concat([header, directory, ...images.map((img) => img.data)])
}
