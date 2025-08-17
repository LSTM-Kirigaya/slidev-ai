<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { MessageItem, SlidevProjectSchema } from './dto';
import { useSlidesStore } from '@/store/slide';
import axios from 'axios';
import { API_BASE_URL } from '@/utils/api';
import ProcessSteps from '@/components/ProcessSteps.vue';

const props = defineProps<{
    id: number
}>();

const emit = defineEmits<{
    (e: 'complete'): void;
    (e: 'update:data', data: SlidevProjectSchema): void;
}>();

const router = useRouter();
const toast = useToast();
const slidesStore = useSlidesStore();

// State management
const error = ref<string>('');
const eventSource = ref<EventSource | null>(null);
const isProcessing = ref<boolean>(true);
const connectionRetries = ref<number>(0);
const MAX_RETRIES = 3;
const isButtonDisabled = ref(false);

const messages = ref<MessageItem[]>([]);

// Methods
const handleSSEError = (event: Event) => {
    console.error('SSE connection error:', event);

    if (connectionRetries.value < MAX_RETRIES) {
        connectionRetries.value++;
        toast.add({
            severity: 'warn',
            summary: 'Connection Issue',
            detail: `Attempting to reconnect (${connectionRetries.value}/${MAX_RETRIES})...`,
            life: 3000
        });
        setTimeout(initializeSSE, 2000 * connectionRetries.value);
        return;
    }

    error.value = 'Failed to establish connection after multiple attempts. Please try again later.';
    isProcessing.value = false;

    messages.value.push({
        type: 'error',
        status: 'failed',
        error: error.value,
        timestamp: Date.now()
    });

    toast.add({
        severity: 'error',
        summary: 'Connection Failed',
        detail: error.value,
        life: 5000
    });
};

const saveProjectData = async (projectData: any) => {
    const res = await axios.post(`${API_BASE_URL}/slides/${props.id}/save-slides-prj-meta`, projectData);

    console.log('save prj data', res);

    if (!res.data.success) {
        toast.add({
            severity: 'error',
            summary: 'Save Failed',
            detail: res.data.error,
            life: 5000
        });
    }
};

const handleSSEMessage = async (event: MessageEvent, toolcallMapper: Map<string, { index: number }>) => {
    try {
        const data = JSON.parse(event.data);

        if (data.type === 'toolcall') {
            const toolcall = data.toolcall;
            const message: MessageItem = {
                type: 'toolcall',
                name: toolcall.function?.name,
                status: 'pending',
                timestamp: Date.now()
            };

            toolcallMapper.set(toolcall.id, { index: messages.value.length });
            messages.value.push(message);

        } else if (data.type === 'toolcalled') {
            // Mark the last pending toolcall as done
            const toolcalled = data.toolcalled;
            console.log(toolcalled);

            if (toolcallMapper.has(toolcalled.id)) {
                const { index } = toolcallMapper.get(toolcalled.id)!;
                messages.value[index].status = 'done';
                messages.value[index].timestamp = Date.now();

                if (messages.value[index].name === 'slidev_export_project') {
                    const projectData = JSON.parse(toolcalled.content[0]?.text || {}) as SlidevProjectSchema;
                    await saveProjectData(projectData);
                    emit('update:data', projectData);
                }
            }
        }

        if (data.done) {
            isProcessing.value = false;
            toast.add({
                severity: 'success',
                summary: 'Processing Complete',
                detail: 'Markdown generation finished successfully',
                life: 3000
            });

            // 触发完成事件
            emit('complete');
        }
    } catch (parseError) {
        console.error('Error parsing SSE message:', parseError);
        messages.value.push({
            type: 'error',
            status: 'failed',
            error: 'Failed to parse server message',
            timestamp: Date.now()
        });
    }
};

// 检查slide是否已经有slidev项目数据
const checkExistingSlidevProject = async () => {
    const id = props.id;
    if (!id) {
        error.value = 'Invalid slide ID';
        return;
    }


    try {
        const slideData = await slidesStore.getSlideById(id);

        if (!slideData) {
            error.value = 'Failed to fetch slide data';
            return;
        }

        console.log(slideData);


        // 检查是否有现成的slidev项目数据
        if (slideData.slidevName && slideData.slidevHome && slideData.slidevEntryFile) {
            // 构造项目数据对象
            const projectData: SlidevProjectSchema = {
                name: slideData.slidevName,
                home: slideData.slidevHome,
                slides_path: slideData.slidevEntryFile
            };

            // 发出事件通知父组件
            emit('update:data', projectData);

            // 显示成功消息
            isProcessing.value = false;
            toast.add({
                severity: 'success',
                summary: 'Loaded Existing Project',
                detail: 'Using previously generated Slidev project',
                life: 3000
            });

            return true;
        } else {
            initializeSSE();
            return false;
        }
    } catch (err) {
        console.error('Error fetching slide data:', err);
        error.value = 'Failed to fetch slide data';
        return false;
    }
}

const initializeSSE = () => {
    const id = props.id;
    if (!id) {
        error.value = 'Invalid slide ID';
        return;
    }

    isButtonDisabled.value = true;
    toast.add({
        severity: 'info',
        summary: 'Connecting',
        detail: 'Establishing connection to regenerate markdown...',
        life: 3000
    });

    try {
        const url = `${API_BASE_URL}/slides/process/make-markdown/${id}`;
        eventSource.value = new EventSource(url, {
            withCredentials: true
        });

        const toolcallMapper = new Map();
        eventSource.value.addEventListener('error', handleSSEError);
        eventSource.value.addEventListener('message', event => handleSSEMessage(event, toolcallMapper));

    } catch (setupError) {
        error.value = 'Failed to initialize connection';
        console.error('SSE setup error:', setupError);
        isButtonDisabled.value = false;
    }
};

// Enable buttons when processing is done or error occurs
watch([isProcessing, error], ([processing, err]) => {
    if (!processing || err) {
        isButtonDisabled.value = false;
    }
});

const cancelProcessing = () => {
    if (eventSource.value) {
        eventSource.value.close();
    }
    router.push('/dashboard');
};

const previewSlide = async () => {
    const id = props.id;
    if (!id) {
        toast.add({
            severity: 'error',
            summary: 'Invalid ID',
            detail: 'Slide ID is invalid',
            life: 3000
        });
        return;
    }

    try {
        const response = await axios.get(`${API_BASE_URL}/slides/preview-id/${id}`);
        const port = response.data.port;

        // 在新窗口中打开预览页面
        window.open(`http://localhost:${port}/`, '_blank');

    } catch (error) {
        console.error('Error getting preview port:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error getting preview port: ' + error
        })
    }
};

const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
};

// Lifecycle hooks
onMounted(() => {
    checkExistingSlidevProject();
});

onUnmounted(() => {
    if (eventSource.value) {
        eventSource.value.close();
    }
});
</script>

<template>
    <div class="p-4 max-w-4xl mx-auto">
        <ProcessSteps />
        <Card>
            <template #title>
                <div class="flex justify-between items-center">
                    <h1>Markdown Generator</h1>
                    <Button icon="pi pi-times" outlined @click="cancelProcessing" severity="secondary"
                        aria-label="Cancel processing" />
                </div>
            </template>

            <template #content>
                <div v-if="error">
                    <Message severity="error" :closable="false">{{ error }}</Message>
                </div>

                <div v-else>
                    <!-- Processing state with progress -->
                    <div v-if="isProcessing" class="flex flex-col items-center justify-center py-10 space-y-4">
                        <ProgressSpinner />
                        <p class="mt-2 text-center">
                            Generating markdown...
                            <span class="block text-sm text-gray-500">Please wait while we process your
                                presentation</span>
                        </p>
                    </div>

                    <!-- Message stream with timestamps -->
                    <div class="mb-6 space-y-3">
                        <transition-group name="message" tag="div" class="space-y-3">
                            <div v-for="(message, index) in messages" :key="index"
                                class="p-3 rounded transition-all animate-fade-in" :class="{
                                    'bg-purple-50 border-l-4 border-purple-500': message.type === 'done',
                                    'bg-red-50 border-l-4 border-red-500': message.type === 'error'
                                }">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <span v-if="message.type === 'toolcall'" class="font-medium">
                                            <i class="pi pi-cog mr-2 animate-spin"
                                                v-if="message.status === 'pending'"></i>
                                            <i class="pi pi-check mr-2" v-else-if="message.status === 'done'"></i>
                                            {{ message.name || 'Unknown tool' }}
                                        </span>
                                        <span v-else-if="message.type === 'toolcalled'" class="font-medium">
                                            <i class="pi pi-check-circle mr-2"></i>
                                            Tool response received
                                        </span>
                                        <span v-else-if="message.type === 'error'" class="font-medium text-red-600">
                                            <i class="pi pi-exclamation-triangle mr-2"></i>
                                            Error: {{ message.error || 'Unknown error' }}
                                        </span>
                                    </div>
                                    <span class="text-xs text-gray-500">
                                        {{ formatTimestamp(message.timestamp) }}
                                    </span>
                                </div>
                                <div v-if="message.status === 'pending'" class="mt-1">
                                    <ProgressSpinner style="width: 20px; height: 20px" />
                                </div>
                            </div>
                        </transition-group>
                    </div>

                    <!-- Empty state -->
                    <div v-if="!isProcessing" class="text-center py-10">
                        <i class="pi pi-check-circle text-4xl text-green-500 mb-4"></i>
                        <p class="text-gray-600">Markdown generation completed successfully!</p>
                        <div class="flex justify-center gap-2 mt-4">
                            <Button label="Preview Slides" icon="pi pi-eye" class="mr-2" @click="previewSlide" :disabled="isButtonDisabled" />
                            <Button label="Regenerate" icon="pi pi-refresh" severity="warning" @click="initializeSSE" :disabled="isButtonDisabled" />
                            <Button label="Deploy" icon="pi pi-send" severity="success" @click="() => {}" :disabled="isButtonDisabled" />
                        </div>
                    </div>
                </div>
            </template>

            <template #footer>
                <div class="flex justify-between items-center">
                    <Button label="Cancel" icon="pi pi-times" @click="cancelProcessing" severity="secondary"
                        :disabled="!isProcessing" />
                </div>
            </template>
        </Card>
    </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.message-enter-active {
    transition: all 0.3s ease;
}

.message-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}
</style>