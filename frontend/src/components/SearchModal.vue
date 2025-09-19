<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const emit = defineEmits(['update:visible']);

const props = defineProps<{
  visible: boolean;
}>();

const localVisible = ref(props.visible);
const searchInput = ref('');

// 监听props.visible变化
watch(() => props.visible, (newVal) => {
  localVisible.value = newVal;
});

// 监听localVisible变化并发出事件
watch(localVisible, (newVal) => {
  if (!newVal) {
    emit('update:visible', false);
  }
});

const handleSearch = () => {
  // 这里是搜索逻辑，目前只是示例
  console.log('Searching for:', searchInput.value);
};

const handleClose = () => {
  localVisible.value = false;
};

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};

// 点击外部区域关闭
const onMaskClick = () => {
  handleClose();
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// 聚焦到搜索输入框
const focusInput = () => {
  setTimeout(() => {
    const input = document.getElementById('search-input');
    if (input) {
      input.focus();
    }
  }, 100);
};

defineExpose({
  focusInput
});
</script>

<template>
  <Dialog 
    v-model:visible="localVisible" 
    :modal="true"
    :draggable="false"
    :resizable="false"
    :closable="true"
    :show-header="false"
    :dismissable-mask="true"
    :content-style="{ padding: '0' }"
    @update:visible="handleClose"
    @show="focusInput"
    @mask-click="onMaskClick"
    :pt="{
      root: { class: 'w-full max-w-md' },
      mask: { class: 'backdrop-blur-sm bg-black/20' },
      content: { class: 'p-0' }
    }"
  >
    <div class="p-4 border-b border-surface-200 dark:border-surface-700">
      <div class="relative">
        <InputText
          id="search-input"
          v-model="searchInput"
          @keyup.enter="handleSearch"
          placeholder="搜索项目..."
          class="w-full p-4 text-lg rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          :pt="{ root: { class: 'pl-12 pr-4 py-4' } }"
        />
      </div>
    </div>
    
    <div class="p-4 max-h-96 overflow-y-auto">
      <div class="text-center py-8 text-surface-500 dark:text-surface-400" v-if="searchInput === ''">
        <i class="pi pi-search text-4xl mb-3"></i>
        <p class="text-lg">输入关键词开始搜索</p>
        <p class="text-sm mt-1">查找演示文稿、主题等内容</p>
      </div>
      
      <div v-else>
        <!-- 搜索结果示例 -->
        <div class="text-surface-500 dark:text-surface-400 text-sm mb-2">
          搜索结果:
        </div>
        <div class="space-y-2">
          <div 
            v-for="i in 3" 
            :key="i"
            class="p-3 border border-surface-200 dark:border-surface-700 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer transition-colors"
          >
            <div class="font-medium">搜索结果 {{ i }}</div>
            <div class="text-sm text-surface-500 dark:text-surface-400 mt-1">
              这里是搜索结果的描述信息...
            </div>
          </div>
        </div>
        
        <div class="mt-4 text-center">
          <Button 
            label="查看所有结果" 
            icon="pi pi-arrow-right" 
            icon-pos="right"
            class="w-full"
            outlined
            @click="handleSearch"
          />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
/* 可以添加额外的样式 */
</style>