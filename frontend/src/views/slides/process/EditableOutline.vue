<script setup lang="ts">
import { ref, computed } from 'vue';
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { OutlineItem } from './dto';

const props = defineProps<{
    outlines: OutlineItem[]
}>();

const emit = defineEmits<{
    (e: 'update:outlines', outlines: OutlineItem[]): void;
    (e: 'collapse-all'): void;
}>();

// 为每个大纲项添加原始索引的类型
interface ExtendedOutlineItem extends OutlineItem {
    originalIndex: number;
}

// 按group分组
const groupedOutlines = computed(() => {
    const groups: { [key: string]: ExtendedOutlineItem[] } = {};
    props.outlines.forEach((outline, index) => {
        if (!groups[outline.group]) {
            groups[outline.group] = [];
        }
        groups[outline.group].push({ ...outline, originalIndex: index });
    });
    return groups;
});

// 控制所有面板是否展开的状态
const expandedGroups = ref<Record<string, boolean>>({});

// 初始化所有组为展开状态
const initializeExpandedGroups = () => {
    Object.keys(groupedOutlines.value).forEach(group => {
        expandedGroups.value[group] = true;
    });
};

// 更新group
const updateGroup = (originalIndex: number, newGroup: string) => {
    const updatedOutlines = [...props.outlines];
    updatedOutlines[originalIndex].group = newGroup;
    emit('update:outlines', updatedOutlines);
};

// 更新content
const updateContent = (originalIndex: number, newContent: string) => {
    const updatedOutlines = [...props.outlines];
    updatedOutlines[originalIndex].content = newContent;
    emit('update:outlines', updatedOutlines);
};

// 收起所有面板
const collapseAll = () => {
    Object.keys(expandedGroups.value).forEach(group => {
        expandedGroups.value[group] = false;
    });
    emit('collapse-all');
};

// 展开所有面板
const expandAll = () => {
    Object.keys(expandedGroups.value).forEach(group => {
        expandedGroups.value[group] = true;
    });
};

// 更新特定组的展开状态
const updateGroupExpanded = (group: string, expanded: boolean) => {
    expandedGroups.value[group] = expanded;
};

// 在分组变化时重新初始化展开状态
const updateExpandedGroups = () => {
    const newExpandedGroups: Record<string, boolean> = {};
    Object.keys(groupedOutlines.value).forEach(group => {
        // 保持现有状态，如果有的话，否则默认为true(展开)
        newExpandedGroups[group] = expandedGroups.value[group] ?? true;
    });
    expandedGroups.value = newExpandedGroups;
};

// 监听分组变化
computed(() => {
    updateExpandedGroups();
});

// 初始化展开状态
initializeExpandedGroups();

defineExpose({
    collapseAll, expandAll
});
</script>

<template>
    <div class="space-y-4">
        <Panel v-for="(groupOutlines, group) in groupedOutlines" :key="group" :header="`Group: ${group}`" toggleable
            :collapsed="!expandedGroups[group]" @update:collapsed="(val: boolean) => updateGroupExpanded(group.toString(), !val)">
            <div v-for="outline in groupOutlines" :key="outline.originalIndex"
                class="mb-4 p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div class="mb-2">
                    <label class="block text-sm font-medium mb-1">Group</label>
                    <InputText :model-value="outline.group"
                        @update:model-value="newGroup => updateGroup(outline.originalIndex, newGroup || '')"
                        class="w-full" size="small" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Content</label>
                    <Textarea :model-value="outline.content"
                        @update:model-value="newContent => updateContent(outline.originalIndex, newContent)"
                        class="w-full" rows="3" />
                </div>
            </div>
        </Panel>
    </div>
</template>

<style scoped>
/* 使用PrimeVue和TailwindCSS，尽量不写自定义CSS */
</style>