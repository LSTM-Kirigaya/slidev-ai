<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const currentStage = computed(() => {
  return route.query.stage || 'outline';
});
</script>

<template>
  <div class="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-1 mb-6">
    <div class="flex items-center justify-between relative">
      <!-- 连接线 -->
      <div class="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-200 dark:bg-gray-700 -z-10"></div>
      
      <!-- User Input 步骤 -->
      <div class="flex flex-col items-center flex-1">
        <div class="flex items-center justify-center w-8 h-8 rounded-full"
             :class="currentStage === 'outline' || currentStage === 'markdown' 
               ? 'bg-green-500 text-white' 
               : 'bg-gray-200 dark:bg-gray-700 text-gray-500'">
          <i class="pi pi-user"></i>
        </div>
        <span class="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">User Input</span>
      </div>
      
      <!-- Outline 步骤 -->
      <div class="flex flex-col items-center flex-1">
        <div class="flex items-center justify-center w-8 h-8 rounded-full"
             :class="currentStage === 'outline' 
               ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900' 
               : currentStage === 'markdown' 
                 ? 'bg-green-500 text-white' 
                 : 'bg-gray-200 dark:bg-gray-700 text-gray-500'">
          <i class="pi pi-list"></i>
        </div>
        <span class="mt-2 text-sm font-medium"
              :class="currentStage === 'outline' 
                ? 'text-blue-600 dark:text-blue-400' 
                : currentStage === 'markdown' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-600 dark:text-gray-300'">
          Outline
        </span>
      </div>
      
      <!-- PPT 步骤 -->
      <div class="flex flex-col items-center flex-1">
        <div class="flex items-center justify-center w-8 h-8 rounded-full"
             :class="currentStage === 'markdown' 
               ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900' 
               : 'bg-gray-200 dark:bg-gray-700 text-gray-500'">
          <i class="pi pi-desktop"></i>
        </div>
        <span class="mt-2 text-sm font-medium"
              :class="currentStage === 'markdown' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-300'">
          PPT
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 可以添加额外的样式 */
</style>