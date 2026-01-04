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
import { API_BASE_URL, PREVIEW_URL } from '@/utils/api';
import ProcessSteps from '@/components/ProcessSteps.vue';
import SourceCodeDialog from '@/components/SourceCodeDialog.vue';
import { t } from '@/i18n';
import STATUS_CODE from '@/constant/status-code';
import { IamBusy, IamFree } from '@/utils/loading';

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
const isProcessing = ref<boolean>(false);
const connectionRetries = ref<number>(0);
const MAX_RETRIES = 3;
const isButtonDisabled = ref(false);
const hasFinished = ref<boolean>(false);
const isBusy = ref<boolean>(false);

const messages = ref<MessageItem[]>([]);

// Source code editor state
const showSourceDialog = ref(false);
const currentSlideTitle = ref('');

// Methods
const handleSSEError = (event: Event) => {
    console.error('SSE connection error:', event);
    if (hasFinished.value || isBusy.value) {
        return; // 已完成或忙状态不重试
    }
    if (connectionRetries.value < MAX_RETRIES) {
        connectionRetries.value++;
        toast.add({
            severity: 'warn',
            summary: t('process.markdown.connection-issue'),
            detail: t('process.markdown.reconnect.attempt', String(connectionRetries.value), String(MAX_RETRIES)),
            life: 3000
        });
        setTimeout(initializeSSE, 2000 * connectionRetries.value);
        return;
    }

    error.value = t('process.markdown.error.sse');
    isProcessing.value = false;
    IamFree();

    messages.value.push({
        type: 'error',
        status: 'failed',
        error: error.value,
        timestamp: Date.now()
    });

    toast.add({
    severity: 'error',
    summary: t('process.markdown.connection-failed'),
        detail: error.value,
        life: 5000
    });
};

const saveProjectData = async (projectData: SlidevProjectSchema) => {
    if (!projectData) return;
    try {
        const res = await axios.post(`${API_BASE_URL}/slides/${props.id}/save-slides-prj-meta`, projectData);
        if (!res.data.success) {
            toast.add({ severity: 'error', summary: 'Save Failed', detail: res.data.error, life: 5000 });
        } else {
            // 同步更新缓存，避免重新生成
            const slide = slidesStore.slides[props.id];
            if (slide) {
                slide.slidevName = projectData.name;
                slide.slidevHome = projectData.home || projectData.name;
                if (slide.processingStatus !== 'markdown-saved' && slide.processingStatus !== 'completed') {
                    slide.processingStatus = 'markdown-saved';
                }
            }
        }
    } catch (e: any) {
        console.error('saveProjectData error', e);
        toast.add({ severity: 'error', summary: 'Save Failed', detail: e?.message || e, life: 4000 });
    }
};

const handleSSEMessage = async (event: MessageEvent, toolcallMapper: Map<string, { index: number }>) => {
    try {
        const data = JSON.parse(event.data);

        if (data.type === 'busy') {
            isProcessing.value = false;
            IamFree();

            hasFinished.value = true;
            messages.value.push({ type: 'busy', status: 'failed', message: `${data.message}，请稍后再试`, timestamp: Date.now() });
            toast.add({ severity: 'warn', summary: t('process.markdown.slide-busy'), detail: `${data.message}，请稍后再试`, life: 4000 });
            if (eventSource.value) eventSource.value.close();
            return;
        } else if (data.type === 'toolcall') {
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
                    let raw = toolcalled?.content?.[0]?.text;
                    let projectData: SlidevProjectSchema | null = null;
                    if (typeof raw === 'string') {
                        try { projectData = JSON.parse(raw); } catch { /* ignore parse error */ }
                    } else if (raw && typeof raw === 'object') {
                        // 已是对象结构
                        projectData = raw as any;
                    }
                    if (projectData && projectData.name) {
                        await saveProjectData(projectData);
                        emit('update:data', projectData);
                    } else {
                        console.warn('Invalid projectData from toolcalled', raw);
                    }
                }
            }
        }

        console.log('SSE message received:', data);

        if (data.done) {
            isProcessing.value = false;
            IamFree();

            hasFinished.value = true;

            toast.add({
                severity: 'success',
                summary: t('process.markdown.processing-complete'),
                detail: t('process.markdown.finished'),
                life: 3000
            });

            if (eventSource.value) {
                eventSource.value.close();
                eventSource.value = null;
            }
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
    error.value = t('process.markdown.error.invalid-id');
        return;
    }

    try {
        const slideData = await slidesStore.getSlideById(id);

        if (!slideData) {
            error.value = t('process.markdown.error.fetch-failed');
            return;
        }

        const statusReady = slideData.processingStatus === 'markdown-saved' || slideData.processingStatus === 'completed';
        const hasMeta = slideData.slidevName && slideData.slidevHome;
        if (statusReady) {
            // 即使缺少 name/home，也不要自动重跑；只提示用户可手动重新生成
            const inferredSlidesPath = hasMeta ? `${slideData.slidevHome}/slides.md` : '';
            if (hasMeta) {
                const projectData: SlidevProjectSchema = {
                    name: slideData.slidevName!,
                    home: slideData.slidevHome!,
                    slides_path: inferredSlidesPath
                };
                emit('update:data', projectData);
            }
            isProcessing.value = false;
            IamFree();

            toast.add({
                severity: 'info',
                summary: t('process.markdown.loaded-existing'),
                detail: hasMeta ? t('process.markdown.using-existing') : t('process.markdown.missing-meta'),
                life: 3000
            });
            return true;
        }
        // 仅未进入 markdown-saved 状态时才真正开始生成
        initializeSSE();
        return false;
    } catch (err) {
        console.error('Error fetching slide data:', err);
        error.value = t('process.markdown.error.fetch-failed');
        return false;
    }
}

const initializeSSE = () => {
    const id = props.id;
    if (!id) {
    error.value = t('process.markdown.error.invalid-id');
        return;
    }

    // 若已有连接尚未关闭，先关闭，防止重复并行连接
    if (eventSource.value) {
        try { eventSource.value.close(); } catch { /* ignore */ }
        eventSource.value = null;
    }

    isProcessing.value = true;
    IamBusy();

    hasFinished.value = false;
    isButtonDisabled.value = true;

    try {
        const url = `${API_BASE_URL}/slides/process/make-markdown/${id}`;
        eventSource.value = new EventSource(url, {
            withCredentials: true
        });

        const toolcallMapper = new Map();
        eventSource.value.addEventListener('error', handleSSEError);
        eventSource.value.addEventListener('message', event => handleSSEMessage(event, toolcallMapper));

    } catch (setupError) {
        error.value = t('process.markdown.error.init-conn');
        console.error('SSE setup error:', setupError);
        isButtonDisabled.value = false;
    }
};

const buildSlidevProject = async () => {
    const buildingMessage = {
        severity: 'info',
        summary: t('process.markdown.building'),
        detail: t('process.markdown.building.detail'),
        closable: false,
    };

    toast.add(buildingMessage);
    try {
        const res = await slidesStore.buildSlidev(props.id);

        toast.remove(buildingMessage);

        if (res.data.code != STATUS_CODE.SUCCESS) {
            toast.add({
                severity: 'error',
                summary: t('process.markdown.build-failed'),
                detail: res.data.message,
                life: 5000
            });
        } else {
            toast.add({
                severity: 'success',
                summary: t('process.markdown.build-success'),
                detail: res.data.message,
                life: 5000
            });

            setTimeout(() => {
                router.push('/dashboard');
            }, 500);
        }
    } catch (error) {
        toast.remove(buildingMessage);
        toast.add({
            severity: 'error',
            summary: t('process.markdown.error'),
            detail: (error as any)?.message || t('process.markdown.error.unknown'),
            life: 5000
        });
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
            summary: t('process.markdown.invalid-id'),
            detail: t('process.markdown.error.invalid-id'),
            life: 3000
        });
        return;
    }

    const buildingMessage = {
        severity: 'info',
        summary: t('process.markdown.building'),
        detail: t('process.markdown.building-preview'),
        closable: false,
    };

    toast.add(buildingMessage);

    try {
        const response = await axios.get(`${API_BASE_URL}/slides/preview-id/${id}`);
        const port = response.data.port;

        // 在新窗口中打开预览页面
        window.open(`${PREVIEW_URL}:${port}/`, '_blank');

    } catch (error) {
        console.error('Error getting preview port:', error);
        toast.add({
            severity: 'error',
            summary: t('process.markdown.error'),
            detail: t('process.markdown.error.get-preview-port') + error
        })
    }

    toast.remove(buildingMessage);
};

const showSourceCode = async () => {
    try {
        // Get the slide data to get the title
        const slideData = await slidesStore.getSlideById(props.id);
        if (slideData) {
            currentSlideTitle.value = slideData.title;
        } else {
            currentSlideTitle.value = `Slide ${props.id}`;
        }
        showSourceDialog.value = true;
    } catch (err) {
        console.error('Error fetching slide data:', err);
        currentSlideTitle.value = `Slide ${props.id}`;
        showSourceDialog.value = true;
    }
};

const handleSourceSaved = () => {
    toast.add({
        severity: 'success',
        summary: t('success'),
        detail: t('common.saved'),
        life: 3000
    })
}

const handleSourceDeployed = () => {
    toast.add({
        severity: 'success',
        summary: t('success'),
        detail: t('common.deployed'),
        life: 3000
    })
}

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
            <template #content>
                <div v-if="error">
                    <Message severity="error" :closable="false">{{ error }}</Message>
                </div>

                <div v-else>
                    <!-- Processing state with progress -->
                    <div v-if="isProcessing" class="flex flex-col items-center justify-center py-10 space-y-4">
                        <ProgressSpinner />
                        <p class="mt-2 text-center">
                            {{ t('process.markdown.generating') }}
                            <span class="block text-sm text-gray-500">{{ t('process.markdown.generating.help') }}</span>
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
                                            {{ message.name || t('process.markdown.error.unknown-tool') }}
                                        </span>
                                        <span v-else-if="message.type === 'toolcalled'" class="font-medium">
                                            <i class="pi pi-check-circle mr-2"></i>
                                            {{ t('process.markdown.tool-response') }}
                                        </span>
                                        <span v-else-if="message.type === 'error'" class="font-medium text-red-600">
                                            <i class="pi pi-exclamation-triangle mr-2"></i>
                                            {{ t('process.markdown.error') }}: {{ message.error || t('process.markdown.error.unknown') }}
                                        </span>
                                        <span v-else-if="message.type === 'busy'" class="font-medium text-yellow-600">
                                            <i class="pi pi-exclamation-triangle mr-2"></i>
                                            {{ message.message }}
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
                        <p class="text-gray-600">{{ t('process.markdown.completed-success') }}</p>
                        <div class="flex flex-wrap justify-center gap-2 mt-4">
                            <Button :label="t('process.markdown.preview')" icon="pi pi-eye" @click="previewSlide"
                                :disabled="isButtonDisabled" />
                            <Button :label="t('process.markdown.source')" icon="pi pi-code" @click="showSourceCode"
                                :disabled="isButtonDisabled" severity="secondary" outlined />
                            <Button :label="t('process.markdown.regenerate')" icon="pi pi-refresh" severity="warning" @click="initializeSSE"
                                :disabled="isButtonDisabled" />
                            <Button :label="t('process.markdown.deploy')" icon="pi pi-send" severity="success" @click="buildSlidevProject"
                                :disabled="isButtonDisabled" />
                        </div>
                    </div>
                </div>
            </template>
        </Card>

        <!-- Source Code Dialog Component -->
        <SourceCodeDialog
            v-model="showSourceDialog"
            :slide-id="props.id.toString()"
            :slide-title="currentSlideTitle"
            @saved="handleSourceSaved"
            @deployed="handleSourceDeployed"
        />
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