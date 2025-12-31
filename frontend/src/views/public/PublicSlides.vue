<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { API_BASE_URL, UPLOADS_BASE_URL } from '@/utils/api'
import { useRouter } from 'vue-router'
import { t } from '@/i18n/index'
const slides = ref([])
const loading = ref(true)
const error = ref('')

const sortedSlides = computed(() => {
    return [...slides.value].sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ) as any[];
})

const router = useRouter()

const fetchSlides = async () => {
    loading.value = true
    error.value = ''
    try {
        const response = await axios.get(`${API_BASE_URL}/slides/public`)
        slides.value = response.data[0]
    } catch (err) {
        error.value = t('common.error.fetch-slides')
    } finally {
        loading.value = false
    }
}

const gotoPreview = (slide: any) => {
    window.open(`${API_BASE_URL}/presentation/${slide.id}`, '_blank')
}

const getCoverImageUrl = (coverFilename: string) =>
    `${API_BASE_URL.replace('/api', '')}/uploads/screenshots/${coverFilename}`

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString()

onMounted(fetchSlides)
</script>

<template>
    <div class="dashboard p-6 max-w-7xl mx-auto min-h-screen">
        <header class="mb-8 flex justify-between items-end">
            <div>
            </div>
        </header>

        <div v-if="loading" class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="i in 8" :key="i"
                class="animate-pulse bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div class="bg-gray-200 dark:bg-gray-700 h-48 w-full"></div>
                <div class="p-4 space-y-3">
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div class="flex items-center space-x-2">
                        <div class="rounded-full bg-gray-200 h-8 w-8"></div>
                        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        </div>

        <div v-else-if="error" class="flex flex-col items-center py-20">
            <Message severity="error" variant="outline">{{ error }}</Message>
            <Button icon="pi pi-refresh" label="重试" @click="fetchSlides" class="mt-4 p-button-text" />
        </div>

        <div v-else>
            <div v-if="sortedSlides.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
                <div class="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                    <i class="pi pi-inbox text-4xl text-gray-400"></i>
                </div>
                <h2 class="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">{{
                    t('info.public-slide.no-public-slide') }}</h2>
                <p class="text-gray-500">{{ t('info.public-slide.check-back-later') }}</p>
            </div>

            <div class="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="slide in sortedSlides" :key="slide.id"
                    class="group relative flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer"
                    @click="gotoPreview(slide)">
                    <div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
                        <img v-if="slide.coverFilename" :src="getCoverImageUrl(slide.coverFilename)" :alt="slide.title"
                            class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                            loading="lazy" />
                        <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            <i class="pi pi-image text-4xl mb-2 opacity-50"></i>
                            <span class="text-xs uppercase tracking-wider">No Preview</span>
                        </div>
                        <div
                            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span
                                class="bg-white text-gray-900 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2">
                                <i class="pi pi-eye"></i> 预览
                            </span>
                        </div>
                    </div>

                    <div class="p-4 flex flex-col flex-grow">
                        <h3 class="font-bold text-gray-800 dark:text-gray-100 mb-3 line-clamp-1 group-hover:text-primary-500 transition-colors"
                            :title="slide.title">
                            {{ slide.title }}
                        </h3>

                        <div class="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50 dark:border-gray-700/50 hover:opacity-80 transition-opacity"
                            @click.stop="router.push(`/profile/${slide.user?.id}`)">
                            <Avatar v-if="slide.user?.avatar"
                                :image="`${UPLOADS_BASE_URL}/avatars/${slide.user?.avatar}`" shape="circle"
                                size="normal" />
                            <Avatar v-else :label="slide.user?.username?.charAt(0).toUpperCase()" shape="circle"
                                class="bg-primary-100 text-primary-700" />
                            <div class="flex flex-col">
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{
                                    slide.user?.username || '匿名用户' }}</span>
                                <span class="text-[10px] text-gray-400 uppercase tracking-tighter">
                                    {{ formatDate(slide.createdAt) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dashboard {
    max-width: 1200px;
    margin: auto;
}
</style>
