import { ref } from 'vue'
import { searchSlidesApi, searchSlidesReq, searchSlidesRes } from '@/api/slides';
import { defineStore } from 'pinia';

export const useSlidesSearchStore = defineStore('slidesSearch', () => {

  const delay = 300; // 防抖延迟时间（毫秒）
  const searchResult = ref<searchSlidesRes>();
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let currentSearchId = 0

  /**
   * 执行搜索
   * @param query 搜索关键词
   */
  const executeSearch = async (query: string) => {
    if (!query.trim()) {
      searchResult.value = { total: 0, slides: [] }
      return
    }

    // 生成唯一的搜索ID，用于处理并发搜索
    const searchId = ++currentSearchId
    isLoading.value = true
    error.value = null

    try {
      const req: searchSlidesReq = { query: query.trim() };
      const results = await searchSlidesApi(req)
      
      // 只有最新的搜索请求才更新结果
      if (searchId === currentSearchId) {
        searchResult.value = results
      }
    } catch (err: any) {
      // 只有最新的搜索请求才更新错误状态
      if (searchId === currentSearchId) {
        error.value = err.message || '搜索失败'
      }
    } finally {
      if (searchId === currentSearchId) {
        isLoading.value = false
      }
    }
  }

  
  /**
   * 防抖搜索
   * @param query 搜索关键词
   */
  const debouncedSearch = (query: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      executeSearch(query)
    }, delay)
  }

  /**
   * 清除搜索结果
   */
  const clearSearch = () => {
    searchResult.value = { total: 0, slides: [] }
    isLoading.value = false
    error.value = null
    
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  /**
   * 立即搜索（不经过防抖）
   * @param query 搜索关键词
   */
  const immediateSearch = (query: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    executeSearch(query)
  }

  return {
    searchResult,
    isLoading,
    error,
    debouncedSearch,
    immediateSearch,
    clearSearch
  }
});