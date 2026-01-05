<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { setLanguage } from '@/i18n/index';
import { t } from '@/i18n/index';
import { useAppStore } from '@/store/website';
import Popover from 'primevue/popover';
import Listbox from 'primevue/listbox';
import { useRoute, useRouter } from 'vue-router';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import Avatar from 'primevue/avatar';
import { useAuthStore } from '@/store/auth';
import { UPLOADS_BASE_URL } from '@/utils/api';
import SearchModal from './SearchModal.vue';

const op = ref();
const appStore = useAppStore();
const route = useRoute();
const router = useRouter();
const searchModalVisible = ref(false);

const localeOptions = computed(() => [
    { label: 'English', value: 'en' },
    { label: '简体中文', value: 'zh-CN' }
]);

const selectedLocaleItem = computed(() => {
    return localeOptions.value.find(option => option.value === appStore.locale);
});

const changeLocale = (event: any) => {

    if (event.value) {
        appStore.setLocale(event.value);
        setLanguage(event.value.value);
        window.location.reload();
    }
};

const darkMode = ref(false);
const authStore = useAuthStore();

// Toggle dark mode
const toggleDarkMode = () => {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('my-app-dark', darkMode.value)
    localStorage.setItem('darkMode', darkMode.value.toString())
}

// 打开搜索模态框
const openSearch = () => {
    searchModalVisible.value = true;
};

// 处理键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
    // Cmd/Ctrl + K 打开搜索
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        openSearch();
    }
};

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

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    // 移除键盘事件监听器
    document.removeEventListener('keydown', handleKeydown);
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
    <nav class="navbar-wrapper sticky top-0 z-[100]">
        <Menubar :model="items" class="custom-menubar">
            <template #start>
                <div class="flex items-center gap-2 mr-4 cursor-pointer hover:opacity-80 transition-opacity"
                    @click="router.push('/')">
                    <img src="/favicon.svg" alt="logo" class="w-8 h-8 drop-shadow-sm" />
                    <span
                        class="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700">
                        Slidev AI
                    </span>
                </div>
            </template>

            <template #end>
                <div class="flex items-center gap-1.5 md:gap-3">
                    <div class="hidden sm:block">
                        <button @click="openSearch"
                            class="search-trigger flex items-center gap-3 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 hover:border-primary-400 transition-all group">
                            <i class="pi pi-search text-sm group-hover:text-primary-500"></i>
                            <span class="text-sm">{{ t('search') }}</span>
                            <kbd
                                class="hidden lg:inline-flex items-center gap-1 px-1.5 font-sans text-[10px] font-medium text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                                ⌘K
                            </kbd>
                        </button>
                    </div>


                    <div
                        class="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 ml-1 pl-1 md:ml-2 md:pl-2">
                        <Button text rounded icon="pi pi-globe" severity="secondary" @click="op.toggle($event)"
                            class="nav-icon-btn" />

                        <Button text rounded @click="toggleDarkMode" :icon="darkMode ? 'pi pi-moon' : 'pi pi-sun'"
                            severity="secondary" class="nav-icon-btn" />

                        <a href="https://github.com/LSTM-Kirigaya/slidev-ai" target="_blank"
                            class="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <i class="pi pi-github text-xl"></i>
                        </a>
                    </div>

                    <div v-if="!route.path.startsWith('/reset-password')" class="ml-2">
                        <div v-if="authStore.user" class="flex items-center">
                            <Avatar v-if="authStore.user.avatar"
                                :image="`${UPLOADS_BASE_URL}/avatars/${authStore.user.avatar}`" shape="circle"
                                class="cursor-pointer ring-2 ring-transparent hover:ring-primary-500 transition-all"
                                @click="router.push(`/profile/${authStore.user.id}`)" />
                            <Avatar v-else :label="authStore.user.username.charAt(0).toUpperCase()" shape="circle"
                                class="cursor-pointer bg-primary-100 text-primary-700"
                                @click="router.push(`/profile/${authStore.user.id}`)" />
                        </div>
                        <Button v-else :label="t('auth.login.button')" size="small" rounded
                            @click="router.push('/login')" icon="pi pi-sign-in" />
                    </div>
                </div>
            </template>
        </Menubar>

        <Popover ref="op" :dismissable="true" class="custom-popover">
            <div class="flex flex-col p-1 min-w-[120px]">
                <div v-for="option in localeOptions" :key="option.value" @click="changeLocale({ value: option })"
                    class="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors duration-200"
                    :class="[
                        appStore.locale === option.value
                            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    ]">
                    <span class="text-sm font-medium">{{ option.label }}</span>
                    <i v-if="appStore.locale === option.value" class="pi pi-check text-xs"></i>
                </div>
            </div>
        </Popover>
    </nav>

    <SearchModal v-model:visible="searchModalVisible" ref="searchModal" />
</template>

<style scoped>
/* 容器支持毛玻璃 */
.navbar-wrapper {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.my-app-dark .navbar-wrapper {
    background: rgba(15, 23, 42, 0.7);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

/* 覆盖 PrimeVue 默认 Menubar 样式 */
:deep(.p-menubar) {
    background: transparent !important;
    border: none;
    border-radius: 0;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0.75rem 1.5rem;
}

/* 搜索框快捷键样式 */
.search-trigger {
    width: 180px;
    justify-content: space-between;
}

/* 统一图标按钮尺寸 */
.nav-icon-btn {
    width: 2.5rem !important;
    height: 2.5rem !important;
}

:deep(.p-popover-content) {
    padding: 0 !important;
}

/* 确保弹出层阴影和圆球背景呼应 */
.custom-popover {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
    border: 1px solid rgba(0, 0, 0, 0.05) !important;
    border-radius: 12px !important;
}

.my-app-dark .custom-popover {
    background: #1e293b !important; /* 匹配深色背景 */
    border-color: rgba(255, 255, 255, 0.1) !important;
}

/* 语言项交互动画 */
.flex.items-center.justify-between:active {
    transform: scale(0.98);
}

:deep(.p-listbox) {
    border: none;
    padding: 0.25rem;
}

:deep(.p-listbox-item) {
    border-radius: 6px;
    margin-bottom: 2px;
}

/* 菜单项悬停动画 */
:deep(.p-menubar-item-link) {
    transition: all 0.2s ease;
}

:deep(.p-menubar-item-link:hover) {
    background: rgba(var(--primary-500), 0.1) !important;
}
</style>