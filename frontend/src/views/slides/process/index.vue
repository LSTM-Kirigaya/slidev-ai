<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StageUserInput from './Stage1UserInput.vue';  
import StageMakeOutline from './Stage2MakeOutline.vue';
import StageMakeMarkdown from './Stage3MakeMarkdown.vue';
import { OutlineItem, SlidevProjectSchema } from './dto';

const route = useRoute();
const router = useRouter();

// 获取查询参数
const id = computed(() => parseInt(route.query.id + ''));
const stage = computed(() => route.query.stage || 'input');

// 处理大纲数据
const outlines = ref<OutlineItem[]>([]);
const projectData = ref<SlidevProjectSchema | null>(null);

// 验证参数
const isValid = computed(() => {
    // 对于input阶段，不需要id参数
    if (stage.value === 'input') {
        return true;
    }
    // 对于其他阶段，需要有效的id参数
    return id.value && !Array.isArray(id.value);
});

const handleOutlinesUpdate = (newOutlines: OutlineItem[]) => {
    outlines.value = newOutlines;
};

const handleSlidevProjectDataUpdate = (newProjectData: SlidevProjectSchema) => {
    projectData.value = newProjectData;
};

const handleStageComplete = (slideId?: number) => {
    if (stage.value === 'input') {
        // input阶段完成，跳转到outline阶段
        if (slideId) {
            router.push(`/slides/process?id=${slideId}&stage=outline`);
        }
    } else if (stage.value === 'outline') {
        // 从outline阶段切换到markdown阶段
        const idValue = id.value;
        if (idValue && !Array.isArray(idValue)) {
            router.push(`/slides/process?id=${idValue}&stage=markdown`);
        }
    } else if (stage.value === 'markdown') {
        // router.push('/dashboard');
    }
};
</script>

<template>
    <div v-if="!isValid">
        <div class="p-4 max-w-4xl mx-auto">
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="pi pi-exclamation-triangle text-red-500"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">
                            Invalid parameters. Please provide a valid slide ID.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <transition name="fade" mode="out-in">
        <StageUserInput
            v-if="stage === 'input'" 
            key="input" 
            :id="id"
            @complete="handleStageComplete"
        />

        <StageMakeOutline
            v-else-if="stage === 'outline'" 
            key="outline" 
            :id="id"
            @update:outlines="handleOutlinesUpdate"
            @complete="handleStageComplete"
        />

        <StageMakeMarkdown
            v-else-if="stage === 'markdown'" 
            key="markdown" 
            :id="id"
            @update:data="handleSlidevProjectDataUpdate"
            @complete="handleStageComplete"
        />

        <div v-else class="p-4 max-w-4xl mx-auto" key="error">
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="pi pi-exclamation-triangle text-red-500"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-red-700">
                            Invalid stage. Valid stages are 'input', 'outline' and 'markdown'.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>