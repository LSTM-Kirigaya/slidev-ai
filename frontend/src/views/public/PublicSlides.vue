<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { API_BASE_URL } from '@/utils/api'
import { useToast } from 'primevue'

interface Slide {
    id: string
    title: string
    createdAt: string
    user?: {
        username: string
    }
}

const slides = ref<Slide[]>([])
const loading = ref(true)
const error = ref('')
const loadingMore = ref(false)
const hasMore = ref(true)
const skip = ref(0)
const take = ref(10)

const fetchPublicSlides = async (loadMore = false) => {
    try {
        if (loadMore) {
            loadingMore.value = true
        } else {
            loading.value = true
        }

        const response = await axios.get(`${API_BASE_URL}/slides/public`, {
            params: {
                skip: skip.value,
                take: take.value
            }
        })

        const [newSlides, totalCount] = response.data

        if (loadMore) {
            slides.value = [...slides.value, ...newSlides]
        } else {
            slides.value = newSlides
        }

        skip.value += newSlides.length
        hasMore.value = skip.value < totalCount
    } catch (err) {
        error.value = 'Failed to fetch public slides'
        console.error(err)
    } finally {
        loading.value = false
        loadingMore.value = false
    }
}

const loadMore = () => {
    if (!hasMore.value || loadingMore.value) return
    fetchPublicSlides(true)
}

const viewSlide = (hash: string) => {
    window.open(`${API_BASE_URL}/slides/preview/${hash}`, '_blank')
}

// Format date for display
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
    fetchPublicSlides()
})

// Intersection Observer for infinite scroll
let observer: IntersectionObserver | null = null

const loadMoreTrigger = (el: Element) => {
    if (observer) {
        observer.disconnect()
    }

    observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore.value && !loadingMore.value) {
            loadMore()
        }
    })

    if (el) {
        observer.observe(el)
    }
}

const toast = useToast();

</script>

<template>
    <div class="public-slides p-4 mt-4">
        <div class="header flex justify-content-between align-items-center mb-4">
            <h1>Public Slides</h1>
        </div>

        <div v-if="loading" class="text-center p-4">
            <div class="grid grid-nogutter">
                <div v-for="i in 3" :key="i" class="col-12 md:col-6 lg:col-4 p-2">
                    <Card>
                        <template #content>
                            <Skeleton width="100%" height="150px"></Skeleton>
                            <div class="mt-3">
                                <Skeleton width="80%" height="1.2rem"></Skeleton>
                                <Skeleton width="60%" height="1rem" class="mt-2"></Skeleton>
                                <Skeleton width="40%" height="1rem" class="mt-2"></Skeleton>
                            </div>
                        </template>
                    </Card>
                </div>
            </div>
        </div>

        <div v-else-if="error">
            <Message severity="error">{{ error }}</Message>
        </div>

        <div v-else>
            <div v-if="slides.length === 0" class="text-center p-8">
                <div class="no-slides-message">
                    <h2>No Public Slides</h2>
                    <p class="my-4">There are no public slides available at the moment.</p>
                </div>
            </div>

            <div v-else>
                <div class="grid grid-nogutter">
                    <div v-for="slide in slides" :key="slide.id" class="col-12 p-2">
                        <Card class="h-full">
                            <template #title>
                                <div class="flex justify-content-between align-items-start">
                                    <div>
                                        <h3>{{ slide.title }}</h3>
                                        <div class="flex align-items-center mt-1">
                                            <span class="text-sm text-500 mr-3">
                                                by {{ slide.user?.username || 'Unknown' }}
                                            </span>
                                            <span class="text-sm text-500">
                                                {{ formatDate(slide.createdAt) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #content>
                                <div class="flex gap-2">
                                    <Button @click="viewSlide(slide.id)" label="View" icon="pi pi-eye" size="small"
                                        severity="success" />
                                </div>
                            </template>
                        </Card>
                    </div>
                </div>

                <div ref="loadMoreTrigger" class="load-more-trigger py-4 flex justify-content-center">
                    <div v-if="loadingMore" class="text-center">
                        <i class="pi pi-spin pi-spinner mr-2"></i>
                        Loading more slides...
                    </div>
                    <div v-else-if="hasMore" class="text-center text-500">
                        Scroll down to load more
                    </div>
                    <div v-else class="text-center text-500">
                        You've reached the end
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.public-slides {
    max-width: 1200px;
    margin: 0 auto;
}

.no-slides-message {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    border-radius: 8px;
    background-color: #f8f9fa;
}

.load-more-trigger {
    height: 60px;
}
</style>