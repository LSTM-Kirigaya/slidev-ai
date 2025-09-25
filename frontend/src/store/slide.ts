// stores/slides.ts
import { API_BASE_URL } from '@/utils/api';
import { SlidevDto } from '@/views/slides/process/dto';
import axios from 'axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSlidesStore = defineStore('slides', () => {
    // 存储slide数据的映射
    const slides = ref<Record<number, SlidevDto>>({})

    // 正在获取的数据ID集合，避免重复请求
    const loadingIds = ref<Set<number>>(new Set())

    /**
     * 获取指定ID的slide数据
     * @param id slide ID
     * @returns slide数据
     */
    const getSlideById = async (id: number): Promise<SlidevDto | null> => {
        // 如果数据已存在，直接返回
        if (slides.value[id]) {
            return slides.value[id]
        }

        // 标记为正在加载
        loadingIds.value.add(id);

        try {
            const response = await axios.get(`${API_BASE_URL}/slides/${id}`);
            const slideData = response.data;

            slides.value[id] = slideData;

            return slideData;
        } catch (error) {
            console.error(`Failed to fetch slide ${id}:`, error);
            return null;
        } finally {
            // 移除加载标记
            loadingIds.value.delete(id)
        }
    }

    /** 强制刷新：忽略缓存重新获取 */
    const refreshSlide = async (id: number): Promise<SlidevDto | null> => {
        try {
            loadingIds.value.add(id);
            const response = await axios.get(`${API_BASE_URL}/slides/${id}`);
            const slideData = response.data;
            slides.value[id] = slideData;
            return slideData;
        } catch (error) {
            console.error(`Failed to refresh slide ${id}:`, error);
            return null;
        } finally {
            loadingIds.value.delete(id);
        }
    }

    /**
     * 清除指定ID的slide数据缓存
     * @param id slide ID
     */
    const clearSlide = (id: number) => {
        delete slides.value[id]
    }

    /**
     * 清除所有slide数据缓存
     */
    const clearAll = () => {
        slides.value = {}
    }


    const createSlide = async (formData: FormData) => {
        const res = await axios.post(`${API_BASE_URL}/slides/create`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return res;
    }

    const saveSlide = async (id: number, formData: FormData) => {
        const res = await axios.post(`${API_BASE_URL}/slides/${id}/save-slide`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (res.data.success) {
            const slide = slides.value[id];
            slide.title = formData.get('title') as string || slide.title;
            slide.content = formData.get('content') as string || slide.content;
            slide.visibility = formData.get('visibility') as string || slide.visibility;
            slide.theme = formData.get('theme') as string || slide.theme;
        }

        return res;
    }

    const saveOutlines = async (id: number, outlines: any) => {
        const res = await axios.post(`${API_BASE_URL}/slides/${id}/save-outlines`, {
            outlines: JSON.stringify(outlines)
        });

        if (!res.data.success) {
            throw new Error('Failed to save outlines');
        } else {
            const slide = slides.value[id];
            slide.outlines = JSON.stringify(outlines);
        }
    }

    const buildSlidev = async (id: number) => {
        const res = await axios.post(`${API_BASE_URL}/slides/${id}/build-slidev`);
        return res;
    }

    const importSlide = async (formData: FormData) => {
        const res = await axios.post(`${API_BASE_URL}/slides/import`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return res;
    }

    /**
     * 搜索幻灯片
     * @param query 搜索关键词
     * @returns 搜索结果
     */
    const searchSlides = async (query: string) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/slides/search`, {
                query: query.trim()
            });
            // 后端返回的数据结构是 { total: number, slides: array }
            // 我们只需要返回 slides 数组
            return response.data.slides || [];
        } catch (error) {
            console.error('Failed to search slides:', error);
            throw error;
        }
    }

    return { 
        slides, 
        getSlideById, 
        refreshSlide, 
        clearSlide, 
        clearAll, 
        saveOutlines, 
        createSlide, 
        saveSlide, 
        buildSlidev,
        importSlide,  // 添加导入方法
        searchSlides  // 添加搜索方法
    }
})