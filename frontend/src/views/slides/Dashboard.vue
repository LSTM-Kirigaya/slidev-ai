<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import Button from 'primevue/button'
import Card from 'primevue/card'
import DataView from 'primevue/dataview'
import Message from 'primevue/message'
import Dropdown from 'primevue/dropdown'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from 'primevue/usetoast';
import { API_BASE_URL } from '@/utils/api'
import axios from 'axios'

const router = useRouter()
const slides = ref([])
const loading = ref(true)
const error = ref('')
const visibility = ref('all') // 筛选框选项
const confirm = useConfirm();
const toast = useToast();

// Visibility filter options
const visibilityOptions = [
    { label: 'All', value: 'all' },
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' }
];

const fetchSlides = async () => {
    loading.value = true
    error.value = ''
    try {
        const params: any = {}
        if (visibility.value !== 'all') {
            params.visibility = visibility.value
        }
        const response = await axios.get(`${API_BASE_URL}/slides/self`, {
            params
        })
        slides.value = response.data
    } catch (err) {
        error.value = 'Failed to fetch slides'
        console.error(err)
    } finally {
        loading.value = false
    }
}

const createNewSlide = () => {
    router.push('/slides/process?stage=input')
}

const viewSlide = (id: string) => {
    window.open(`${API_BASE_URL}/slides/preview/${id}`, '_blank')
}


const editSlide = (id: string) => {
    // 路由跳转到 /slides/process?stage=input&id=id
    router.push(`/slides/process?stage=input&id=${id}`);
}

const deleteSlide = async (id: string,title:string) => {
    confirm.require({
        message: `Are you sure you want to delete "${title}"?`,
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'Cancel',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: 'Delete'
        },
        accept: async () => {
            try {
                await axios.delete(`${API_BASE_URL}/slides/${id}`)
                slides.value = slides.value.filter((slide: any) => slide.id !== id)
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Slide deleted successfully',
                    life: 3000
                });
            } catch (err) {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to delete slide',
                    life: 3000
                });
            }
        },
        reject: () => {
            ;
        }
    });

}

// Format date for display
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
}

onMounted(() => {
    fetchSlides()
})

// 监听 visibility 变化自动刷新
watch(visibility, () => {
    fetchSlides()
})
</script>

<template>
    <ConfirmDialog />
    <Toast />

    <div class="dashboard p-4 mt-4">
        <div class="header flex justify-content-between align-items-center mb-4">
            <div class="flex gap-2 items-center">
                <Button @click="createNewSlide" label="Create New Slide" icon="pi pi-plus" />
                <Dropdown v-model="visibility" :options="visibilityOptions" optionLabel="label" optionValue="value"
                    class="ml-4 w-12rem" :disabled="loading" placeholder="Filter" />
            </div>
        </div>

        <div v-if="loading" class="text-center p-4">
            <i class="pi pi-spin pi-spinner mr-2"></i>
            Loading slides...
        </div>

        <div v-else-if="error">
            <Message severity="error">{{ error }}</Message>
        </div>

        <div v-else>
            <div v-if="slides.length === 0" class="text-center p-8">
                <!-- 仅在 all 筛选下展示首次创建提示 -->
                <div class="no-slides-message" v-if="visibility === 'all'">
                    <h2>Welcome to Slidev AI</h2>
                    <p class="my-4">Get started by creating your first presentation</p>
                    <Button @click="createNewSlide" label="Create Your First Slide" icon="pi pi-plus" class="mt-2"
                        size="large" />
                </div>
                <!-- 在 public/private 筛选为空时展示更贴切的提示 -->
                <div class="no-slides-message" v-else>
                    <h2>No slides found</h2>
                    <p class="my-4">
                        {{ visibility === 'public' ? 'You have no public slides yet.' : 'You have no private slides yet.' }}
                    </p>
                    <Button @click="createNewSlide" label="Create New Slide" icon="pi pi-plus" class="mt-2"
                        size="large" />
                </div>
            </div>

            <div v-else>
                <DataView :value="slides">
                    <template #list="slotProps">
                        <div class="grid grid-nogutter">
                            <div v-for="(slide, _) in slotProps.items" :key="slide.id"
                                class="col-12 md:col-6 lg:col-4 p-2">
                                <Card class="h-full">
                                    <template #title>
                                        <div class="flex items-center gap-2">
                                            <h3>{{ slide.title }}</h3>
                                            <span v-if="slide.visibility === 'public'" title="Public">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                    stroke-linejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M2 12h20" />
                                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
                                                </svg>
                                            </span>
                                            <span v-else title="Private">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2" stroke-linecap="round"
                                                    stroke-linejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            </span>
                                        </div>
                                    </template>
                                    <template #content>
                                        <p class="mb-3">Created: {{ formatDate(slide.createdAt) }}</p>
                                        <div class="flex gap-2">
                                            <Button @click="viewSlide(slide.id)" label="View" icon="pi pi-eye"
                                                size="small" severity="success" />
                                            <Button @click="editSlide(slide.id)" label="Edit" icon="pi pi-pencil"
                                                size="small" severity="warning" />
                                            <Button @click="deleteSlide(slide.id,slide.title)" label="Delete" icon="pi pi-trash"
                                                size="small" severity="danger" />
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>
                    </template>
                </DataView>
            </div>
        </div>
    </div>
</template>

<style scoped>
.dashboard {
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

.my-app-dark .no-slides-message {
    background-color: #222222;
    color: #ffffff;
}
</style>