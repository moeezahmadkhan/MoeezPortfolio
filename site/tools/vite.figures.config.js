import { defineConfig } from 'vite'

/**
 * A dev server rooted at tools/, used only by `npm run figures`. Keeping it
 * separate from the site config is the point: the source GLBs and the Draco
 * and Basis decoders are ~7MB and must never be reachable from the build that
 * ships. The site only ever serves the rendered images.
 */
export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  publicDir: false,
  server: { port: 5199, strictPort: true },
})
