import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './assets/index.css'
import App from './App.vue'
import router from './router'

// PrimeVue imports
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice';
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

// PrimeVue components
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'
import Avatar from 'primevue/avatar'
import 'primeicons/primeicons.css'

const app = createApp(App)

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{blue.50}',
            100: '{blue.100}',
            200: '{blue.200}',
            300: '{blue.300}',
            400: '{blue.400}',
            500: '{blue.500}',
            600: '{blue.600}',
            700: '{blue.700}',
            800: '{blue.800}',
            900: '{blue.900}',
            950: '{blue.950}'
        }
    }
});

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: MyPreset,
        options: {
            darkModeSelector: '.my-app-dark'
        }
    }
});
app.use(ConfirmationService)

app.use(ToastService);

// Register PrimeVue components
app.component('Menubar', Menubar)
app.component('Button', Button)
app.component('Avatar', Avatar)

app.mount('#app')