<template>
    <Dialog v-model:visible="visible" :header="`${t('dashboard.source.header')} - ${slideTitle}`" :modal="true"
        :style="{ width: '85vw', maxWidth: '1400px', height: '85vh', minHeight: '600px' }" :closable="true"
        :draggable="false" @hide="onHide">
        <div v-if="isLoading" class="flex justify-center items-center h-64">
            <i class="pi pi-spin pi-spinner text-3xl text-primary-500"></i>
        </div>
        <div v-else class="flex flex-col h-full">
            <!-- Editor container with better styling -->
            <div
                class="editor-container flex-grow mb-4 rounded-lg overflow-hidden">
                <div :ref="el => (sourceEditorRef as any) = el" class="w-full h-full min-h-[500px]"></div>
            </div>

            <!-- Action buttons with improved layout -->
            <div
                class="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('dashboard.source.info') }}
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                    <Button :label="t('dashboard.source.save')" icon="pi pi-save" @click="saveSourceCode"
                        class="p-button-primary p-button-sm" :loading="isSaving" />
                    <Button :label="t('dashboard.source.deploy')" icon="pi pi-cloud-upload" @click="deploySlide"
                        class="p-button-success p-button-sm" :loading="isDeploying" />
                </div>
            </div>
        </div>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { t } from '@/i18n/index';
import { API_BASE_URL } from '@/utils/api';
import axios from 'axios';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';

// Define props
const props = defineProps<{
    modelValue: boolean;
    slideId: string;
    slideTitle: string;
}>();

// Define emits
const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
    deployed: [];
}>();

// Reactive variables
const visible = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeploying = ref(false);
const sourceEditorRef = ref<HTMLElement>();
const markdownSource = ref('');
let editorView: EditorView | null = null;

// Watch for changes in the visible prop
watch(() => props.modelValue, async (newVal) => {
    visible.value = newVal;
    if (newVal) {
        await loadSourceCode();
    } else {
        cleanupEditor();
    }
});

// Load source code when dialog opens
const loadSourceCode = async () => {
    isLoading.value = true;
    try {
        const response = await axios.get(`${API_BASE_URL}/slides/${props.slideId}/source`);
        markdownSource.value = response.data.source || '';
    } catch (err) {
        console.error('Error fetching source code:', err);
        // Emit an error event or show notification as needed
    } finally {
        isLoading.value = false;
    }

    await nextTick();
    await initCodeMirror();
};

// Initialize CodeMirror editor
const initCodeMirror = async () => {
    if (!sourceEditorRef.value) return;

    // Destroy existing editor if present
    if (editorView) {
        editorView.destroy();
        editorView = null;
    }

    const state = EditorState.create({
        doc: markdownSource.value,
        extensions: [
            basicSetup,
            markdown(),
            EditorView.lineWrapping,
            oneDark,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    markdownSource.value = update.state.doc.toString();
                }
            })
        ]
    });

    editorView = new EditorView({
        state,
        parent: sourceEditorRef.value
    });
};

const saveSourceCode = async () => {
    if (!editorView) return;

    const source = editorView.state.doc.toString();
    if (!source.trim()) return;

    isSaving.value = true;
    try {
        await axios.put(`${API_BASE_URL}/slides/${props.slideId}/source`, {
            source
        });
        emit('saved');
    } finally {
        isSaving.value = false;
    }
};


// Deploy slide
const deploySlide = async () => {
    isDeploying.value = true;
    try {
        await axios.post(`${API_BASE_URL}/slides/${props.slideId}/deploy`);
        emit('deployed');
        // Close the dialog after deployment
        onHide();
    } catch (err) {
        console.error('Error deploying slide:', err);
        // Handle error as needed
    } finally {
        isDeploying.value = false;
    }
};

// Handle dialog hide
const onHide = () => {
    cleanupEditor();
    emit('update:modelValue', false);
};

// Clean up editor when component unmounts or dialog closes
const cleanupEditor = () => {
    if (editorView) {
        editorView.destroy();
        editorView = null;
    }
};

onUnmounted(() => {
    cleanupEditor();
});
</script>

<style scoped>
.editor-container {
    transition: all 0.2s ease;
}

:deep(.cm-editor) {
    height: 100%;
    outline: none;
}

:deep(.cm-scroller) {
    font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
}

@media (max-width: 640px) {
    .editor-container {
        min-height: 400px;
    }
}
</style>