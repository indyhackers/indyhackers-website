import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next'
import Icons from 'unplugin-icons/vite'
import IconsResolve from 'unplugin-icons/resolver'
import { VitePluginRadar } from 'vite-plugin-radar'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('givebutter-')
        }
      }
    }),
    vueDevTools(),
    Components({
      resolvers: [BootstrapVueNextResolver(), IconsResolve()]
    }),
    Icons({
      compiler: 'vue3',
      autoInstall: true
    }),
    VitePluginRadar({
      // Google Analytics tag injection — load after page renders
      analytics: {
        id: 'G-ZF5Q1C13NM',
        injectTo: 'body'
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3's SCSS still trips Dart Sass's `mixed-decls` (and
        // related) deprecations. Those come from node_modules, not our styles,
        // so silence dependency-originated warnings while keeping them for our
        // own SCSS. (Dart Sass 1.77 predates `silenceDeprecations`, so use
        // `quietDeps`.)
        quietDeps: true
      }
    }
  }
})
