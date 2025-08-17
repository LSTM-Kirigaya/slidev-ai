<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Dropdown from 'primevue/dropdown';
import FileUpload from 'primevue/fileupload';
import ProcessSteps from '@/components/ProcessSteps.vue';
import { API_BASE_URL } from '@/utils/api';
import axios from 'axios';
import { useSlidesStore } from '@/store/slide';
import { useToast } from 'primevue';

const emit = defineEmits<{
    (e: 'complete', slideId: number): void;
}>();

const props = defineProps<{
    id: number;
}>();

const router = useRouter()
const title = ref('')
const content = ref('')
const file = ref<any>(null)
const fileUpload = ref<any>(null)
const loading = ref(false)
const error = ref('')
const visibility = ref('public')

const toast = useToast();
const slidesStore = useSlidesStore();

// Visibility options for the dropdown
const visibilityOptions = ref([
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' }
]);

const onFileSelect = (event: any) => {
    // Get the first selected file
    if (event.files && event.files.length > 0) {
        file.value = event.files[0]
        error.value = ''
    }
}

const onFileRemove = () => {
    file.value = null
    error.value = ''
}

const removeFile = () => {
    if (fileUpload.value) {
        fileUpload.value.clear()
    }
    onFileRemove()
}

const createSlide = async () => {
    if (!title.value.trim()) {
        error.value = 'Please enter a slide title'
        return
    }

    // Either content or file must be provided
    if (!content.value.trim() && !file.value) {
        error.value = 'Please provide either a slide content or upload a file'
        return
    }

    loading.value = true
    error.value = ''

    try {
        const formData = new FormData()
        formData.append('title', title.value)

        if (content.value.trim()) {
            formData.append('content', content.value)
        }

        if (file.value) {
            formData.append('file', file.value)
        }
        formData.append('visibility', visibility.value)


        const response = await axios.post(`${API_BASE_URL}/slides`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        // 触发完成事件，传递创建的slide ID
        emit('complete', response.data.id)
    } catch (err: any) {
        console.error('Create slide error:', err)
        if (err.response && err.response.status === 401) {
            // Token is invalid or expired
            error.value = 'Authentication failed. Please log in again.'

            // Add slight delay before redirecting to allow user to see error message
            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } else if (err.response) {
            // Server responded with error status
            error.value = `Failed to create slide: ${err.response.data.message || err.response.statusText}`
        } else if (err.request) {
            // Request was made but no response received
            error.value = 'Network error. Please check your connection and try again.'
        } else {
            // Other error
            error.value = 'Failed to create slide. Please try again.'
        }
    } finally {
        loading.value = false
    }
}

// Add example outline to help users
const addExample = () => {
    content.value = `Introduction to Slidev AI:
- What is Slidev AI
- Key features
- Benefits of using AI for presentations

How it works:
- Step 1: Enter your topic
- Step 2: Provide an outline
- Step 3: Generate beautiful slides

Getting started:
- Sign up for an account
- Create your first presentation
- Share with your team
`
}

const initForm = async () => {
    try {
        const slide = await slidesStore.getSlideById(props.id);

        if (slide) {
            title.value = slide.title || '';
            content.value = slide.content || '';
            visibility.value = slide.visibility || 'public';
            file.value = null;

            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Slide loaded successfully',
                life: 5000
            })
        }
    } catch (error) {
        console.error('Failed to init form:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load slide:' + error,
            life: 5000
        });
    }
}

onMounted(() => {
    initForm();
});
</script>

<template>
    <div class="create-slide p-4">
        <ProcessSteps :currentStep="1" />

        <div class="header mb-4">
            <h1>Create New Slide</h1>
            <p class="text-600">Enter the basic information for your presentation</p>
        </div>

        <Card>
            <template #content>
                <form @submit.prevent="createSlide">
                    <div class="p-field mb-4">
                        <label for="title" class="block mb-2">Slide Title</label>
                        <InputText id="title" v-model="title" type="text" placeholder="Enter slide title" class="w-full"
                            :disabled="loading" />
                    </div>

                    <div class="p-field mb-4">
                        <div class="flex align-items-center justify-content-between mb-2 gap-2">
                            <label for="outline" class="block m-0">Slide Outline</label>
                            <Button type="button" label="Add Example" text size="small" @click="addExample"
                                :disabled="loading" class="flex-shrink-0" />
                        </div>
                        <Textarea id="content" v-model="content"
                            placeholder="Enter your slide content&#10;&#10;Example:&#10;Introduction&#10;- Main point 1&#10;- Main point 2&#10;Conclusion"
                            :autoResize="true" rows="10" class="w-full" :disabled="loading" />
                        <small class="block mt-2 text-600">
                            Enter your slide outline.
                        </small>
                    </div>

                    <div class="p-field mb-4">
                        <label class="block mb-2">Upload File (Optional)</label>
                        <FileUpload ref="fileUpload" mode="basic" name="file" :auto="false"
                            accept=".pdf,.doc,.docx,.md,.markdown,.txt" :maxFileSize="5000000" @select="onFileSelect"
                            :disabled="loading" :class="{ 'opacity-50 pointer-events-none': loading }" class="w-full" />
                        <div v-if="file"
                            class="mt-2 p-2 bg-primary-100 border-round flex align-items-center justify-content-between">
                            <span class="font-medium">Selected file:</span>
                            <span class="mr-2">{{ file.name }}</span>
                            <Button icon="pi pi-times" rounded text severity="danger" @click="removeFile"
                                :disabled="loading" size="small" />
                        </div>
                        <small class="block mt-2 text-600">
                            Upload a PDF, Word document, or Markdown file as source material (optional, max 5MB)
                        </small>
                    </div>

                    <div class="p-field mb-4">
                        <label for="visibility" class="block mb-2">Visibility</label>
                        <Dropdown id="visibility" v-model="visibility" :options="visibilityOptions" optionLabel="label"
                            optionValue="value" class="w-full" :disabled="loading" placeholder="Select visibility" />
                        <small class="block mt-2 text-600">Choose whether your slide is public or private.</small>
                    </div>

                    <div v-if="error" class="mb-4">
                        <Message severity="error">{{ error }}</Message>
                    </div>

                    <div class="flex justify-content-end gap-2">
                        <Button type="button" @click="$router.push('/dashboard')" label="Cancel" severity="secondary"
                            :disabled="loading" />
                        <Button type="submit" :label="loading ? 'Creating...' : 'Continue to Outline'"
                            :disabled="loading" icon="pi pi-arrow-right" iconPos="right" />
                    </div>
                </form>
            </template>
        </Card>
    </div>
</template>

<style scoped>
.create-slide {
    max-width: 800px;
    margin: 0 auto;
}
</style>