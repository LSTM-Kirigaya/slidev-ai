<script setup lang="ts">
import { useSlidesStore } from '@/store/slide';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const slideStore = useSlidesStore();

import { t } from '@/i18n/index';

const stages = [
    { key: 'input', label: t('process.stage.user-input'), icon: 'pi pi-user' },
    { key: 'outline', label: t('process.stage.outline'), icon: 'pi pi-list' },
    { key: 'markdown', label: t('process.stage.markdown'), icon: 'pi pi-desktop' }
] as const;

type Stage = typeof stages[number]['key'];

const completedStages = ref<Stage[]>([]);
const currentStage = ref<Stage>('input');

const stageIdx = (key: Stage) => stages.findIndex(s => s.key === key);
const currentIdx = computed(() => stageIdx(currentStage.value));

const isCompleted = (key: Stage) => completedStages.value.includes(key);
const isBeforeCurrent = (key: Stage) => stageIdx(key) < currentIdx.value;
const isAfterCurrent = (key: Stage) => stageIdx(key) > currentIdx.value;
const isFutureCompleted = (key: Stage) => isAfterCurrent(key) && isCompleted(key);

const goToStage = (stage: Stage) => {
    router.push({
        path: '/slides/process',
        query: { id: route.query.id, stage }
    });
};

onMounted(async () => {
    if (!route.query.id) {
        return;
    }
    
    try {
        const slideId = parseInt(route.query.id + '');
        const slide = await slideStore.getSlideById(slideId);

        if (!slide) {
            return;
        }

        if (slide.content) {
            completedStages.value.push('input');
        }
        if (slide.outlines) {
            completedStages.value.push('outline');
        }
        // Markdown 完成判定：后端目前未返回 slidevEntryFile 字段，使用 processingStatus 或 slidevHome/slidevName 作为依据
        if (
            slide.processingStatus === 'markdown-saved' ||
            slide.processingStatus === 'completed' ||
            (slide.slidevName && slide.slidevHome)
        ) {
            if (!completedStages.value.includes('markdown')) {
                completedStages.value.push('markdown');
            }
        }

        // 从 URL query 获取想要进入的阶段
        let stageFromUrl = (route.query.stage as Stage) || 'input';

        // ✅ 校验依赖：不能跳过
        const stageIndex = stages.findIndex(s => s.key === stageFromUrl);
        const lastCompletedIndex = stages.reduce(
            (acc, s, idx) => (completedStages.value.includes(s.key) ? idx : acc),
            -1
        );

        if (stageIndex > lastCompletedIndex + 1) {
            currentStage.value = stages[lastCompletedIndex + 1].key;
            router.replace({ query: { ...route.query, stage: currentStage.value } });
        } else {
            currentStage.value = stageFromUrl;
        }
    } catch (error) {
        console.error('Init stage failed:', error);
    }
});
</script>

<template>
    <div class="w-full bg-white p-card rounded-lg shadow p-2 mb-6">
        <div class="flex items-center justify-between relative">
            <!-- 循环渲染步骤 -->
            <div v-for="(stage, _) in stages" :key="stage.key" class="flex flex-col items-center flex-1">
                <!-- 包一层相对定位，用于放右上角徽标 -->
                <div class="relative flex items-center justify-center w-8 h-8 rounded-full transition-colors" :class="[
                    currentStage === stage.key
                        ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                        : isBeforeCurrent(stage.key)
                            ? 'bg-green-500 text-white cursor-pointer hover:opacity-90'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500',
                    isFutureCompleted(stage.key) ? 'cursor-pointer hover:opacity-90' : ''
                ]" @click="(isBeforeCurrent(stage.key) || isFutureCompleted(stage.key)) ? goToStage(stage.key) : null"
                    :title="t('process.tooltip.finished')">
                    <i :class="stage.icon"></i>

                    <!-- 右上角小对勾徽标（未来且已完成） -->
                    <span v-if="isFutureCompleted(stage.key)"
                        class="absolute -top-1 -right-1 inline-flex items-center justify-center w-3 h-3 rounded-full bg-green-500 text-white text-[8px] ring-2 ring-white dark:ring-gray-900 pointer-events-none"
                        aria-hidden="true">
                    </span>
                </div>

                <!-- 文本颜色：当前蓝、之前绿、之后灰 -->
                <span class="mt-2 text-sm font-medium" :class="[
                    currentStage === stage.key
                        ? 'text-blue-600 dark:text-blue-400'
                        : isBeforeCurrent(stage.key)
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-300'
                ]">
                    {{ stage.label }}
                </span>
            </div>

        </div>
    </div>
</template>
