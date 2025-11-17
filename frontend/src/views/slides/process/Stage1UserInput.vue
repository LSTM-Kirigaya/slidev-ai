<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Card from 'primevue/card';
import Message from 'primevue/message';
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown';
import Divider from 'primevue/divider';
import Carousel from 'primevue/carousel';

import ProcessSteps from '@/components/ProcessSteps.vue';
import { useSlidesStore } from '@/store/slide';
import { t } from '@/i18n';
import { useToast } from 'primevue';
import { useSlidevStore } from '@/store/slidev';
import { ThemeDto } from './dto';

const emit = defineEmits<{
    (e: 'complete', slideId: number): void;
}>();

const props = defineProps<{
    id: number;
}>();

const router = useRouter();
const title = ref('');
const content = ref('');
const file = ref<any>(null);
const fileUpload = ref<any>(null);
const loading = ref(false);
const error = ref('');
const visibility = ref('public');
const theme = ref<ThemeDto | null>(null);
const themes = ref<ThemeDto[]>([]);

const toast = useToast();
const slidesStore = useSlidesStore();
const slidevStore = useSlidevStore();

const showSettingsDialog = ref(false)

// Visibility options for the dropdown
const visibilityOptions = ref([
    { label: t('dashboard.tag.public'), value: 'public' },
    { label: t('dashboard.tag.private'), value: 'private' }
]);

// const onFileSelect = (event: any) => {
//     // Get the first selected file
//     if (event.files && event.files.length > 0) {
//         file.value = event.files[0]
//         error.value = ''
//     }
// }

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

const collectForm = () => {
    const formData = new FormData();
    formData.append('title', title.value);

    if (content.value.trim()) {
        formData.append('content', content.value);
    }

    if (file.value) {
        formData.append('file', file.value);
    }
    formData.append('visibility', visibility.value);
    formData.append('theme', theme.value?.name || 'default');

    return formData;
}

const gotoOutline = async () => {
    if (!title.value.trim()) {
        error.value = t('process.input.error.title-required')
        return
    }

    // Either content or file must be provided
    if (!content.value.trim() && !file.value) {
        error.value = t('process.input.error.content-required')
        return
    }

    loading.value = true
    error.value = ''

    try {
        const formData = collectForm();

        if (props.id) {
            await slidesStore.saveSlide(props.id, formData);
            emit('complete', props.id);
        } else {
            const res = await slidesStore.createSlide(formData);
            emit('complete', res.data.id);
        }

    } catch (err: any) {
        console.error('Create slide error:', err)
        if (err.response && err.response.status === 401) {
            // Token is invalid or expired
            error.value = t('process.input.error.auth')

            // Add slight delay before redirecting to allow user to see error message
            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } else if (err.response) {
            // Server responded with error status
            error.value = t('process.input.error.create-failed')
        } else if (err.request) {
            // Request was made but no response received
            error.value = t('process.input.error.network')
        } else {
            // Other error
            error.value = t('process.input.error.create-failed')
        }
    } finally {
        loading.value = false
    }
}

const saveSlide = async () => {

    try {
        const formData = collectForm();
        const res = await slidesStore.saveSlide(props.id, formData);

        if (!res.data.success) {
            toast.add({
                severity: 'error',
                summary: t('process.input.save-failed'),
                life: 5000
            });
        } else {
            toast.add({
                severity: 'success',
                summary: t('process.input.success'),
                detail: t('process.input.success.save'),
                life: 5000
            });

        }

    } catch (error) {
        toast.add({
            severity: 'error',
            summary: t('process.input.error'),
            detail: error,
            life: 3000
        });
    }
}

// Add example outline to help users
const addExample = () => {
    title.value = t("process.input.title.example");
    content.value = t("process.input.slide-content.example");
}

const initForm = async () => {
    if (!props.id) {
        return;
    }
    try {
        const slide = await slidesStore.getSlideById(props.id);

        if (slide) {
            title.value = slide.title || '';
            content.value = slide.content || '';
            visibility.value = slide.visibility || 'public';
            file.value = null;

            const corTheme = themes.value.find(t => t.name === slide.theme);
            if (corTheme) {
                theme.value = corTheme;
            }

            toast.add({
                severity: 'success',
                summary: t('process.input.success'),
                detail: t('process.input.success.load'),
                life: 5000
            })
        }
    } catch (error) {
        console.error('Failed to init form:', error);
        toast.add({
            severity: 'error',
            summary: t('process.input.error'),
            detail: t('process.input.error.load') + error,
            life: 5000
        });
    }
}


const initThemes = async () => {
    try {
        const response = await slidevStore.getThemes();
        themes.value = response;
        theme.value = themes.value[0];

    } catch (error) {
        console.error('Failed to load themes:', error);
        toast.add({
            severity: 'error',
            summary: t('process.input.error'),
            detail: t('process.input.error.themes-load'),
            life: 5000
        });
    }
}

onMounted(async () => {
    await initThemes();
    await initForm();
});
</script>

<template>
    <div class="create-slide p-4">
        <ProcessSteps :currentStep="1" />

        <Card>
            <template #content>
                <div class="chat-input">
                    <!-- 标题 -->
                    <div>
                        <label class="block mb-2 font-bold">{{ t('process.input.slide-title') }}</label>
                        <InputText v-model="title" class="w-full" :disabled="loading" />
                    </div>

                    <br>

                    <!-- 内容 -->
                    <div>
                        <label class="block mb-2 font-bold">{{ t('process.input.slide-content') }}</label>
                        <Textarea
                            v-model="content"
                            :placeholder="t('process.input.slide-content.placeholder')"
                            rows="10"
                            class="w-full"
                            :disabled="loading"
                            @keydown.enter.stop
                        />
                    </div>

                    <!-- 工具栏按钮 -->
                    <div class="flex flex-wrap gap-2 mb-3">
                        <Button icon="pi pi-cog" text label="设置" @click="showSettingsDialog = true" />
                        <Button icon="pi pi-lightbulb" text label="示例" @click="addExample" />
                    </div>

                    <!-- 已选择的文件展示 -->
                    <div v-if="file"
                        class="p-2 bg-primary-100 border-round flex align-items-center justify-content-between">
                        <span class="mr-2">{{ file.name }}</span>
                        <Button icon="pi pi-times" rounded text severity="danger" @click="removeFile"
                            :disabled="loading" size="small" />
                    </div>
                </div>


                <!-- 错误信息 -->
                <div v-if="error" class="mb-4">
                    <Message severity="error">{{ error }}</Message>
                </div>
            </template>

            <template #footer>
                <div class="flex justify-between items-center">
                    <Button type="button" @click="$router.push('/dashboard')" :label="t('process.input.cancel')"
                        severity="secondary" :disabled="loading" />
                    <div class="flex space-x-2">
                        <Button :label="t('process.input.save-draft')" icon="pi pi-save" severity="info"
                            :disabled="loading" @click="saveSlide" />
                        <Button type="submit" :label="loading ? t('process.input.saving') : t('process.input.continue')"
                            :disabled="loading" icon="pi pi-arrow-right" @click="gotoOutline" />
                    </div>
                </div>
            </template>
        </Card>

        <!-- 合并后的对话框 -->
        <Dialog v-model:visible="showSettingsDialog" header="设置" modal :closable="true" style="width: 600px">
            <div class="flex flex-col gap-4">

                <!-- 可见性 -->
                <div>
                    <label class="block mb-2 font-bold">{{ t("process.input.visibility") }}</label>
                    <Dropdown v-model="visibility" :options="visibilityOptions" optionLabel="label" optionValue="value"
                        class="w-full" />
                </div>

                <Divider />

                <!-- 主题 -->
                <div>
                    <label class="block mb-2 font-bold">{{ t('theme') }}</label>

                    <Dropdown v-model="theme" :options="themes" optionLabel="name" class="w-full">
                        <template #option="{ option }">
                            <div class="flex items-center gap-2">
                                <img v-if="option?.images?.length" :src="slidevStore.getImageSsoUrl(option.images[0])"
                                    alt="preview" class="w-6 h-6 object-cover rounded" />
                                <span>{{ option.name }}</span>
                            </div>
                        </template>

                        <template #value="{ value }">
                            <div v-if="value" class="flex items-center gap-2">
                                <img v-if="value?.images?.length" :src="slidevStore.getImageSsoUrl(value.images[0])"
                                    alt="preview" class="w-6 h-6 object-cover rounded" />
                                <span>{{ value.name }}</span>
                            </div>
                            <span v-else class="text-gray-400">{{ t('choose-theme') }}</span>
                        </template>
                    </Dropdown>

                    <!-- 主题预览轮播图 -->
                    <div v-if="theme">
                        <h4 class="mt-4 mb-2">{{ t('theme-preview') }}</h4>
                        <Carousel :value="theme.images" :numVisible="1" :numScroll="1" circular
                            :autoplayInterval="2000">
                            <template #item="slotProps">
                                <div class="flex justify-center items-center h-64">
                                    <img :src="slidevStore.getImageSsoUrl(slotProps.data)"
                                        :alt="slotProps.data.imageName"
                                        class="max-h-full object-contain rounded-lg shadow" />
                                </div>
                            </template>
                        </Carousel>

                        <!-- 作者信息 / GitHub 仓库 -->
                        <div class="mt-3 text-sm text-gray-600 flex items-center gap-2">
                            <span class="font-medium">{{ theme.name }}</span>
                            <a v-if="theme.github" :href="theme.github" target="_blank" rel="noopener noreferrer"
                                class="text-blue-500 hover:underline">
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    </div>
</template>

<style scoped>
.chat-input {
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 1rem;
    background: var(--surface-card);
}
</style>


<style scoped>
.create-slide {
    max-width: 800px;
    margin: 0 auto;
}
</style>