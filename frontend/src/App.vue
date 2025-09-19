<script setup lang="ts">
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import Navbar from './components/Navbar.vue';
import { useAuthStore } from './store/auth';
import Toast from 'primevue/toast';
import Divider from 'primevue/divider';


const router = useRouter();
const authStore = useAuthStore();

// Check if user is authenticated
const checkAuth = async () => {
    const res = await authStore.login();
    if (!res.success) {
        router.push('/public');
    }
}

// Check auth on mount
onMounted(() => {
    checkAuth();
});
</script>

<template>
    <Toast />
    <Navbar />
    <div class="router-main">
        <router-view />
    </div>

    <!-- 背景高斯模糊圆球 -->
    <div class="glow-ball-lg"></div>
    <div class="glow-ball-sm"></div>

    <!-- Footer -->
    <Divider />
    <div class="text-center p-4 text-gray-500 text-sm">
        Slidev AI - 由
        <a href="https://kirigaya.cn/about" target="_blank" class="text-primary">锦恢</a>
        和
        <a href="https://peacesheep.xyz/home" target="_blank" class="text-primary">太平羊羊</a>
        共同呈现
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
}

.p-dataview-content {
    background-color: unset !important;
}

.my-app-dark .p-dataview-content {
    background-color: unset !important;
}

.router-main {
    min-height: calc(100vh - 150px);
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

body {
    color: rgba(51, 51, 51, 1);
    background-color: rgb(245, 245, 245);
}

.my-app-dark body {
    background-color: rgba(18, 22, 29, 0.85);
    color: rgba(224, 224, 224, 1);
}

.my-app-dark .p-card {
    background: rgba(45, 45, 45, 0.5);
    color: #e0e0e0;
}

.p-menubar {
    background-color: unset !important;
}

.my-app-dark .p-button {
    color: #fff;
}

.slide-card {
    display: flex;
    flex-direction: column;
    transition: all .2s ease-in-out;
}

.slide-card:hover {
    scale: 1.05;
    transition: all .2s ease-in-out;
}

.my-app-dark .slide-card {
    background-color: rgba(34, 38, 46, 0.8);
}

.glow-ball-lg {
    position: fixed;
    top: -10%;       /* 稍微溢出，避免球体压住内容 */
    left: -10%;
    width: 45vw;     /* 占宽度约 35% */
    height: 45vw;
    border-radius: 50%;
    background: rgba(95, 164, 250, 0.15); /* 半透明蓝色，柔和 */
    filter: blur(140px);
    z-index: -1;
    pointer-events: none;
    transition: background 0.3s ease, transform 0.3s ease;
}

.my-app-dark .glow-ball-lg {
    background: rgba(95, 164, 250, 0.15);
}

.glow-ball-sm {
    position: fixed;
    bottom: -5%;
    right: -5%;
    width: 25vw;
    height: 25vw;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.15); /* 紫色 */
    filter: blur(140px);
    z-index: -1;
    pointer-events: none;
}

.my-app-dark .glow-ball-sm {
    background: rgba(139, 92, 246, 0.15);
}

</style>