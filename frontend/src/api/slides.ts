import { API_BASE_URL } from '@/utils/api';
import axios from 'axios';

export interface searchSlidesReq {
    query: string;
}

export interface searchSlidesRes {
    total: number;
    slides: Array<{
        id: number;
        title: string;
    }>;
}

export const searchSlidesApi = async (req: searchSlidesReq): Promise<searchSlidesRes> => {
    const res = await axios.post(`${API_BASE_URL}/slides/search`, req);
    return res.data;
}; 