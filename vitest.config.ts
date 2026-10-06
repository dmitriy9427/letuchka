import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Тесты чистой логики (app/lib) — без запуска Nuxt.
export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./app', import.meta.url)) } },
  test: { environment: 'happy-dom', include: ['app/**/*.test.ts'] },
})
