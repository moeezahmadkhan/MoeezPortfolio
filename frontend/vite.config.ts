/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleFamiliarRequest } from './api/_core/familiar'

// Dev-only: mount the same core the Vercel function uses at /api/familiar,
// so `npm run dev` works without `vercel dev`. Reads the key from .env.
function familiarDevApi(apiKey: string | undefined): Plugin {
  return {
    name: 'familiar-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/familiar', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let raw = ''
        req.on('error', () => {
          res.statusCode = 400
          res.end()
        })
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', async () => {
          let messages
          try {
            messages = JSON.parse(raw || '{}').messages
          } catch {
            messages = undefined
          }
          const ip = req.socket.remoteAddress || 'local'
          const result = await handleFamiliarRequest({ messages, ip, apiKey })
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), familiarDevApi(env.OPENROUTER_API_KEY)],
    // host:true exposes the dev server on the LAN (reachable at http://<LAN-IP>:5173
    // from other devices); cors:true sends Access-Control-Allow-Origin so cross-origin
    // requests aren't blocked.
    server: { host: true, cors: true },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // react/react-dom are shared between the eager entry and the lazily-loaded
            // 3D stage — pin them to their own chunk so Rollup doesn't fold them into
            // the "three" chunk, which would give the eager entry a static import edge
            // into the very code the reduced-motion gate is supposed to keep lazy.
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
            if (/node_modules\/(three|@react-three)\//.test(id)) return 'three'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
      env: { VITE_WEB3FORMS_KEY: 'test-key' },
    },
  }
})
