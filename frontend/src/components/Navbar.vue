<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { setLanguage } from '@/i18n/index';
import { t } from '@/i18n/index';
import { useAppStore } from '@/store/website';
import OverlayPanel from 'primevue/overlaypanel';
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
const searchModal = ref();

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
    <Menubar :model="items">
        <template #start>
            <div class="flex items-center gap-2">
                <img src="/favicon.svg" alt="logo" class="w-8 h-8" />
                <span class="font-bold text-xl slidev-ai-title">Slidev AI</span>
            </div>
        </template>

        <template #end>
            <div class="flex items-center gap-2">
                <div class="relative">
                    <Button 
                        outlined
                        aria-label="Search"
                        class="p-button-sm"
                        @click="openSearch"
                    >
                    <i class="pi pi-search"></i>
                    <span>{{ t('search') }}</span>
                    <span class="ml-2">⌘ + k</span>
                    </Button>
                </div>
                
                <div class="relative">
                    <Button 
                        text 
                        rounded 
                        icon="pi pi-globe"
                        severity="secondary" 
                        aria-label="Language selector"
                        @click="op.toggle($event)"
                    />
                    <OverlayPanel 
                        ref="op" 
                        :dismissable="true" 
                        :pt="{ root: { class: 'p-0' } }"
                        :autoZIndex="true"
                    >
                        <Listbox 
                            :options="localeOptions" 
                            optionLabel="label" 
                            optionValue="value"
                            :modelValue="selectedLocaleItem"
                            @change="changeLocale"
                            :pt="{
                                root: { style: 'border: none; box-shadow: none;' },
                                listContainer: { style: 'border: none;' }
                            }"
                        />
                    </OverlayPanel>
                </div>
                
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
                    </div>
                    <Button v-else :label="t('auth.login.button')" @click="router.push('/login')"
                        icon="pi pi-sign-in" />
                </div>
            </div>
        </template>
    </Menubar>
    
    <SearchModal 
      v-model:visible="searchModalVisible" 
      ref="searchModal"
    />
</template>

<style scoped>

.p-listbox {
    background-color: unset !important;
}

.navbar {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 100;
}

:deep(.p-menubar) {
    border-radius: 0;
    border: none;
    padding: 0.5rem 1rem;
}


.slidev-ai-title {
  background: linear-gradient(90deg, rgb(95, 164, 250), rgb(139, 92, 246));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}
</style>