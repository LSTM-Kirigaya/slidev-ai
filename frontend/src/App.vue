<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import Navbar from './components/Navbar.vue'

const router = useRouter()

// Check if user is authenticated
const checkAuth = () => {
    const token = localStorage.getItem('token')
    const publicPages = ['/login']
    const authRequired = !publicPages.includes(router.currentRoute.value.path)

    if (authRequired && !token) {
        router.push('/login')
    }
}

// Check auth on mount
onMounted(() => {
    checkAuth()
})

// Watch for route changes
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    const publicPages = ['/login']
    const authRequired = !publicPages.includes(to.path)

    if (authRequired && !token) {
        next('/login')
    } else {
        next()
    }
})
</script>

<template>
    <div id="app">
        <Navbar />
        <router-view />
    </div>
</template>

<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #333;
    background-color: #f5f5f5;
}

.my-app-dark body {
    background-color: #333;
}

#app {
    min-height: 100vh;
}

a {
    text-decoration: none;
    color: inherit;
}

.p-component {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

/* Dark mode styles */
.my-app-dark {
    background-color: #1e1e1e;
    color: #e0e0e0;
}

.my-app-dark body {
    background-color: #1e1e1e;
    color: #e0e0e0;
}

.my-app-dark .p-card {
    background: #2d2d2d;
    color: #e0e0e0;
}

.my-app-dark .p-inputtext {
    background: #3c3c3c;
    border: 1px solid #555;
    color: #e0e0e0;
}

.my-app-dark .p-button {
    color: #fff;
}
</style>