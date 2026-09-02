/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { handleChatRequest } from './api/_core/chat'
import { isLoopbackOrigin, parseAllowedOrigins } from './api/_core/request'

/**
 * Dev-only: mount the same core the Vercel function uses at /api/chat,
 * so `npm run dev` works without `vercel dev`. Reads the key from .env.
 *
 * This middleware holds his real OpenRouter key, so who may call it matters even
 * here. On the default (loopback) bind only pages from this machine can; in LAN
 * mode he has deliberately published the server to the network, so the origin
 * check cannot add a guarantee and does not pretend to.
 */
function chatDevApi(apiKey: string | undefined, lan: boolean): Plugin {
  return {
    name: 'chat-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
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
          const origin = req.headers.origin
          const result = await handleChatRequest({
            messages,
            ip,
            origin,
            allowedOrigins:
              lan && origin
                ? [origin]
                : parseAllowedOrigins(isLoopbackOrigin(origin) ? origin : undefined),
            apiKey,
          })
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

  // The dev server mounts /api/chat with his real OPENROUTER_API_KEY in it, so
  // binding it to every interface publishes that key to everyone on the network
  // — a cafe or an office LAN included. It stays on loopback unless he asks:
  // `npm run dev:lan` sets VITE_LAN=1 for the phone-testing case, which is the
  // only reason the option exists.
  const lan = env.VITE_LAN === '1'

  return {
    plugins: [react(), chatDevApi(env.OPENROUTER_API_KEY, lan)],
    // cors stays off: the site calls its own origin, so nothing here needs
    // Access-Control-Allow-Origin, and sending one invites other pages to read
    // dev responses.
    server: { host: lan, cors: false },
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
