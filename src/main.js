import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next'
//import { BVToastPlugin } from 'bootstrap-vue'
//import { jQuery } from 'jQuery'
import pocketbase from './pocketbase'
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

const emitter = mitt()
//const toaster = useToast()

const app = createApp(App)
app.config.globalProperties.pocketbase = pocketbase
app.config.globalProperties.emitter = emitter
app.provide('pocketbase', pocketbase)
app.provide('router', router)
app.provide('emitter', emitter)
//app.config.globalProperties.$bvToast = toaster

//window.jQuery = jQuery

app.use(createPinia())
app.use(createBootstrap())
//app.use(BVToastPlugin)
app.use(router)

prepareApp().then(() => {
  app.mount('#app')
})
