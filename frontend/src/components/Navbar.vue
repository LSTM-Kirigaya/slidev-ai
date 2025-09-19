<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { setLanguage } from '@/i18n/index';
import { t } from '@/i18n/index';
import { useAppStore } from '@/store/website';
import Dropdown from 'primevue/dropdown';
import { useRoute, useRouter } from 'vue-router'; // 添加对useRoute的导入
const appStore = useAppStore();
const route = useRoute(); // 获取当前路由信息
const router = useRouter();
const localeOptions = computed(() => [
    { label: t('locale.english'), value: 'en' },
    { label: t('locale.chinese-simplified'), value: 'zh-CN' }
]);
const selectedLocale = computed({
    get: () => appStore.locale,
    set: async (val: string) => {
        appStore.setLocale(val);
        await setLanguage(val);
        window.location.reload(); // 语言切换后刷新页面，确保所有文本更新
    }
});
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import { useAuthStore } from '@/store/auth';
import { UPLOADS_BASE_URL } from '@/utils/api';
const darkMode = ref(false);
const authStore = useAuthStore();

// Toggle dark mode
const toggleDarkMode = () => {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('my-app-dark', darkMode.value)
    localStorage.setItem('darkMode', darkMode.value.toString())
}

// Logout function
const logout = async () => {
    await authStore.logout();
    // refresh
    window.location.reload();
}

// Initialize dark mode from localStorage or system preference
onMounted(() => {
    const savedDarkMode = localStorage.getItem('darkMode')
    if (savedDarkMode !== null) {
        darkMode.value = savedDarkMode === 'true'
        document.documentElement.classList.toggle('my-app-dark', darkMode.value)
    } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            darkMode.value = true
            document.documentElement.classList.add('my-app-dark')
        }
    }
});


// Define menu items
const items = computed(() => {
    // 如果当前路由是 /reset-password，则不显示导航项
    if (route.path.startsWith('/reset-password')) {
        return [];
    }

    return [
        {
            label: t('nav.public-slides'),
            icon: 'pi pi-globe',
            command: () => router.push('/public')
        },
        {
            label: authStore.user?.role === 'admin' ? t("user.manager") : t('nav.my-slides'),
            icon: authStore.user?.role === 'admin' ? 'pi pi-user' : 'pi pi-folder',
            visible: () => authStore.user !== null,
            command: () => router.push('/dashboard')
        },
        {
            label: t("invitation.manager.code"),
            icon: 'pi pi-key',
            visible: () => authStore.user?.role === 'admin',
            command: () => router.push('/invitations')
        },
        {
            label: t("theme.manager.nav"),
            icon: 'pi pi-palette',
            visible: () => authStore.user?.role === 'admin',
            command: () => router.push('/themes')
        }
    ];
});
</script>

<template>
    <Menubar :model="items">
        <template #start>
            <div class="flex align-items-center gap-2">
                <img src="/favicon.svg" alt="logo" class="w-8 h-8" />
                <span class="font-bold text-xl">Slidev AI</span>
            </div>
        </template>

        <template #end>
            <div class="flex items-center gap-2">
                <Dropdown v-model="selectedLocale" :options="localeOptions" option-label="label" option-value="value"
                    class="w-28 mr-2" size="small" :pt="{ root: { style: 'min-width: 100px' } }" />
                <Button 
                    text 
                    rounded 
                    @click="toggleDarkMode"
                    :icon="darkMode ? 'pi pi-moon' : 'pi pi-sun'" 
                    severity="secondary" 
                    aria-label="Dark mode toggle"
                />
                <a href="https://github.com/LSTM-Kirigaya/slidev-ai" target="_blank" rel="noopener noreferrer"
                    class="text-2xl p-button p-button-text p-button-rounded h-[var(--p-button-icon-only-width)]">
                    <i class="pi pi-github"></i>
                </a>

                <div v-if="route.path.startsWith('/reset-password')">

                </div>
                <div v-else>

                    <div v-if="authStore.user" class="h-[32px] flex items-center gap-2">
                        <Avatar v-if="authStore.user.avatar"
                            :image="`${UPLOADS_BASE_URL}/avatars/${authStore.user.avatar}`" shape="circle"
                            class="cursor-pointer" :title="t('nav.my-profile')"
                            @click="router.push(`/profile/${authStore.user.id}`)" />
                        <Avatar v-else :label="authStore.user.username.charAt(0).toUpperCase()" shape="circle"
                            class="cursor-pointer" :title="t('nav.my-profile')"
                            @click="router.push(`/profile/${authStore.user.id}`)" />
                        <Button :label="t('auth.logout.button')" @click="logout" icon="pi pi-sign-out" text
                            size="small" />
                    </div>
                    <Button v-else :label="t('auth.login.button')" @click="router.push('/login')"
                        icon="pi pi-sign-in" />
                </div>
            </div>
        </template>
    </Menubar>
</template>

<style scoped>
.navbar {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 100;
}

:deep(.p-menubar) {
    border-radius: 0;
    border: none;
    padding: 0.5rem 1rem;
}
</style>