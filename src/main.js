import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import { VueHeadMixin } from '@unhead/vue'
import { createBootstrap } from 'bootstrap-vue-next'
//import { BVToastPlugin } from 'bootstrap-vue'
//import { jQuery } from 'jQuery'
import PocketBase from 'pocketbase'
import mitt from 'mitt'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
import '@popperjs/core/dist/umd/popper.min.js'
import 'bootstrap/dist/js/bootstrap.min.js'

import App from './App.vue'
import router from './router'

async function prepareApp() {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker } = await import('./mocks/browser')
  return worker.start()
}

const pbURL = import.meta.env.DEV ? '/' : window.location.origin
const pocketbase = new PocketBase(pbURL)
const emitter = mitt()
//const toaster = useToast()

const app = createApp(App)
const head = createHead()
app.config.globalProperties.pocketbase = pocketbase
app.config.globalProperties.emitter = emitter
app.provide('pocketbase', pocketbase)
app.provide('router', router)
app.provide('emitter', emitter)
//app.config.globalProperties.$bvToast = toaster

//window.jQuery = jQuery

app.use(head)
// Enables the Options-API `head()` component option (reactive) alongside the
// `useHead()` composable — used by App.vue for route-driven meta.
app.mixin(VueHeadMixin)
app.use(createPinia())
app.use(createBootstrap())
//app.use(BVToastPlugin)
app.use(router)

prepareApp().then(() => {
  app.mount('#app')
})
