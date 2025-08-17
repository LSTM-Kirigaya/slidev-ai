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

    const saveOutlines = async (id: number, outlines: any) => {
        const res = await axios.post(`${API_BASE_URL}/slides/${id}/outlines`, {
            outlines: JSON.stringify(outlines)
        });

        if (!res.data.success) {
            throw new Error('Failed to save outlines');
        }
    }

    return { slides, getSlideById, clearSlide, clearAll, saveOutlines }
})