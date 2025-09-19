<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { API_BASE_URL, UPLOADS_BASE_URL } from '@/utils/api'
import { useRouter } from 'vue-router'
import {t} from '@/i18n/index'
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
    <div class="dashboard p-6">
        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-12 text-gray-500">
            <i class="pi pi-spin pi-spinner text-2xl mb-3"></i>
            {{ t('common.loading.slides') }}
        </div>

        <!-- Error -->
        <div v-else-if="error">
            <Message severity="error">{{ error }}</Message>
        </div>

        <!-- Content -->
        <div v-else>
            <!-- Empty State -->
            <div v-if="sortedSlides.length === 0" class="text-center p-10 rounded-lg p-card">
                <h2 class="text-xl font-semibold mb-2">{{ t('info.public-slide.no-public-slide') }}</h2>
                <p class="mb-4 text-gray-500">{{ t('info.public-slide.check-back-later') }}</p>
            </div>

            <!-- Slide Cards -->
            <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="slide in sortedSlides" :key="slide.id"
                    class="slide-card cursor-pointer rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-800"
                    @click="gotoPreview(slide)">
                    <!-- Thumbnail -->
                    <div
                        class="w-full h-48 rounded-t-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <img v-if="slide.coverFilename" :src="getCoverImageUrl(slide.coverFilename)" :alt="slide.title"
                            class="w-full h-full object-cover" />
                        <i v-else class="pi pi-image text-5xl text-gray-400"></i>
                    </div>

                    <!-- Info -->
                    <div class="p-4 flex flex-col gap-2">
                        <span class="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">{{ slide.title
                        }}</span>

                        <div class="flex items-center gap-2 text-sm text-gray-500"
                            @click.stop="router.push(`/profile/${slide.user?.id}`)"
                        >

                            <Avatar v-if="slide.user?.avatar"
                                :image="`${UPLOADS_BASE_URL}/avatars/${slide.user?.avatar}`" shape="circle"
                                class="cursor-pointer" :title="t('common.user.profile-title')"
                            />
                            <Avatar v-else :label="slide.user?.username.charAt(0).toUpperCase()" shape="circle"
                                class="cursor-pointer" :title="t('common.user.profile-title')"
                            />
                            <span class="text-primary-200">{{ slide.user?.username || t('common.user.anonymous') }}</span>
                        </div>

                        <div class="text-sm text-gray-500">
                            <span>{{ t('info.public-slide.created-at') }} {{ formatDate(slide.createdAt) }}</span> |
                            <span>{{ t('info.public-slide.updated-at') }} {{ formatDate(slide.updatedAt) }}</span>
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
