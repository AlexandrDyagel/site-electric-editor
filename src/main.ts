import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './style.css'
import App from './App.vue'
import router from './router'
import { useUiStore } from './stores/uiStore'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const ui = useUiStore(pinia)
ui.initializeTheme()

app.mount('#app')
