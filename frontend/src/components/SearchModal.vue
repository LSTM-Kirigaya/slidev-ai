<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import { useSlidesSearchStore } from '@/store/slidesSearch';


const emit = defineEmits(['update:visible']);
const router = useRouter();

const props = defineProps<{
  visible: boolean;
}>();

const localVisible = ref(props.visible);
const searchInput = ref('');

const slidesSearchStore = useSlidesSearchStore();


// 监听props.visible变化
watch(() => props.visible, (newVal) => {
  localVisible.value = newVal;
  if (newVal) {
    // 打开模态框时清除之前的搜索
    slidesSearchStore.clearSearch();
    searchInput.value = '';
  }
});

// 监听localVisible变化并发出事件
watch(localVisible, (newVal) => {
  if (!newVal) {
    emit('update:visible', false);
    // 关闭时清除搜索状态
    slidesSearchStore.clearSearch();
    searchInput.value = '';
  }
});

// 监听搜索输入，执行防抖搜索
watch(searchInput, (newVal) => {
  slidesSearchStore.debouncedSearch(newVal);
});

const handleSearch = () => {
  if (searchInput.value.trim()) {
    slidesSearchStore.debouncedSearch(searchInput.value);
  }
};

const handleClose = () => {
  localVisible.value = false;
};

// 点击搜索结果项
const handleResultClick = (slide: any) => {
  // 根据幻灯片状态决定跳转目标
  if (slide.processing_status === 'completed' && slide.preview_hash) {
    // 如果幻灯片已完成处理，跳转到预览页面
    router.push(`/preview/${slide.preview_hash}`);
  } else {
    // 否则跳转到处理页面
    router.push({
      name: 'slide-processing',
      query: { id: slide.id }
    });
  }
  handleClose();
};

// 当前选中的搜索结果索引
const selectedResultIndex = ref(-1);

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (slidesSearchStore.searchResult != undefined && slidesSearchStore.searchResult.total > 0) {
      selectedResultIndex.value = Math.min(selectedResultIndex.value + 1, slidesSearchStore.searchResult.slides.length - 1);
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (slidesSearchStore.searchResult != undefined && slidesSearchStore.searchResult.slides.length > 0) {
      selectedResultIndex.value = Math.max(selectedResultIndex.value - 1, -1);
    }
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (selectedResultIndex.value >= 0 && slidesSearchStore.searchResult && slidesSearchStore.searchResult.slides[selectedResultIndex.value]) {
      handleResultClick(slidesSearchStore.searchResult.slides[selectedResultIndex.value]);
    } else {
      handleSearch();
    }
  }
};

// 重置选中索引
watch([slidesSearchStore.searchResult, searchInput], () => {
  selectedResultIndex.value = -1;
});

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
        <!-- 搜索图标 -->
        <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-surface-400">
          <i class="pi pi-search"></i>
        </div>
        
        <InputText
          id="search-input"
          v-model="searchInput"
          @keydown="handleKeydown"
          placeholder="搜索演示文稿..."
          class="w-full pl-12 pr-12 py-4 text-lg rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        
        <!-- 清空按钮 -->
        <button
          v-if="searchInput"
          @click="searchInput = ''"
          class="absolute right-4 top-1/2 transform -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
      
      <!-- 快捷键提示 -->
      <div class="flex items-center justify-between mt-2 text-xs text-surface-500 dark:text-surface-400">
        <span>搜索标题、描述和内容</span>
        <div class="flex items-center gap-2">
          <kbd class="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-xs">↑↓</kbd>
          <span>导航</span>
          <kbd class="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-xs">Enter</kbd>
          <span>选择</span>
          <kbd class="px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 rounded text-xs">Esc</kbd>
          <span>关闭</span>
        </div>
      </div>
    </div>
    
    <div class="p-4 max-h-96 overflow-y-auto">
      <!-- 空状态 - 未输入搜索词 -->
      <div class="text-center py-8 text-surface-500 dark:text-surface-400" v-if="!searchInput.trim()">
        <i class="pi pi-search text-4xl mb-3"></i>
        <p class="text-lg">输入关键词开始搜索</p>
        <p class="text-sm mt-1">查找演示文稿、主题等内容</p>
      </div>
      
      <!-- 加载状态 -->
      <div class="text-center py-8" v-else-if="slidesSearchStore.isLoading">
        <ProgressSpinner style="width: 40px; height: 40px" strokeWidth="4" />
        <p class="text-surface-500 dark:text-surface-400 mt-3">正在搜索...</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="slidesSearchStore.error" class="py-4">
        <Message severity="error" :closable="false">
          {{ slidesSearchStore.error }}
        </Message>
      </div>
      
      <!-- 搜索结果 -->
      <div v-else-if="slidesSearchStore.searchResult!=undefined &&slidesSearchStore.searchResult.total!=undefined && slidesSearchStore.searchResult?.total > 0">
        
        <!-- 有结果 -->
        <div v-if="slidesSearchStore.searchResult.total > 0">
          <div class="text-surface-500 dark:text-surface-400 text-sm mb-3">
            找到 {{ slidesSearchStore.searchResult.total }} 个结果
          </div>
          <div class="space-y-2">
            <div 
              v-for="(slide, index) in slidesSearchStore.searchResult.slides" 
              :key="slide.id"
              :class="[
                'search-result-item p-3 border border-surface-200 dark:border-surface-700 rounded-lg cursor-pointer transition-colors',
                index === selectedResultIndex 
                  ? 'bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700' 
                  : 'hover:bg-surface-100 dark:hover:bg-surface-800'
              ]"
              @click="handleResultClick(slide)"
              @mouseenter="selectedResultIndex = index"
              @mouseleave="selectedResultIndex = -1"
            >  
            <h2>{{ slide.title }}</h2>
            </div>
          </div>
        </div>
        
        <!-- 无结果 -->
        <div v-else class="text-center py-8 text-surface-500 dark:text-surface-400">
          <i class="pi pi-search text-3xl mb-3"></i>
          <p class="text-base">未找到相关内容</p>
          <p class="text-sm mt-1">尝试使用不同的关键词搜索</p>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 搜索结果项悬停效果 */
.search-result-item {
  transition: all 0.2s ease;
}

.search-result-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 键盘快捷键样式 */
kbd {
  font-family: inherit;
  font-size: inherit;
  border: 1px solid var(--p-surface-300);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 搜索输入框容器 */
.search-input-container {
  position: relative;
}

/* 清空按钮样式 */
.clear-button {
  transition: all 0.2s ease;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-button:hover {
  background-color: var(--p-surface-100);
}
</style>