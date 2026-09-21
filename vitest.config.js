import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.js'],
      // Frontend unit tests live beside the code as *.test.js; PocketBase hook
      // tests live under pb/hooks/__tests__ as *.spec.js (they load the hook's
      // CommonJS source directly — see jobs_util.spec.js).
      include: ['src/**/*.test.{js,ts}', 'pb/hooks/**/*.spec.{js,ts}'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
