import { createApp } from 'vue'
import { appPinia } from './stores/collection-context'

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(appPinia)
app.use(router)

app.mount('#app')
