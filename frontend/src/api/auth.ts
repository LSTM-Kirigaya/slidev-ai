import http from './http';
import { Result } from './base.ts';
import { API_BASE_URL } from '@/utils/api'

export interface LoginDto {
    username: string;
    password: string;
    captchaId: string;
    captchaText: string;
}

export interface RegisterDto {
    username: string;
    email: string;
    password: string;
    invitationCode: string;
}

export interface UserDTO {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'user';
    avatar?: string | null;
    website?: string | null;
    egoId?: number | null;
}

export interface CaptchaResponse {
    svg: string;
    id: string;
}


export async function apiGetCaptcha(): Promise<Result<CaptchaResponse>> {
    try {
        const { data, status } = await http.post(`${API_BASE_URL}/auth/captcha`);
        if (data?.success && data?.data) {
            return { success: true, data: data.data };
        }
        if (typeof data?.error === 'string') {
            return { success: false, error: data.error, status };
        }
        return { success: false, error: data?.message || 'Failed to get captcha', status };
    } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Failed to get captcha';
        return { success: false, error: msg, status };
    }
}

export async function apiLogin(dto?: LoginDto): Promise<Result<UserDTO>> {
    try {
        const { data, status } = await http.post(`${API_BASE_URL}/auth/login`, dto);
        if (data?.success && data?.user) {
            return { success: true, data: data.user, message: data.message };
        }
        if (typeof data?.error === 'string') {
            return { success: false, error: data.error, status };
        }
        return { success: false, error: data?.message || 'Login failed', status };
    } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Login failed';
        return { success: false, error: msg, status };
    }
}

export async function apiRegister(dto: RegisterDto): Promise<Result<void>> {
    try {
        const res = await http.post(`${API_BASE_URL}/auth/register`, dto);
        if (res.status >= 200 && res.status < 300) {
            return { success: true, data: undefined };
        }
        return { success: false, error: 'Registration failed', status: res.status };
    } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Registration failed';
        return { success: false, error: msg, status };
    }
}

export async function apiLogout(): Promise<Result<void>> {
    try {
        await http.post(`${API_BASE_URL}/auth/logout`);
        return { success: true, data: undefined };
    } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message || 'Logout failed';
        return { success: false, error: msg, status };
    }
}
