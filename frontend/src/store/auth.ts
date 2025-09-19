// stores/auth.ts
import { apiLogin, apiLogout, apiRegister } from '@/api/auth'
import { apiGetMe, apiUpdateMe } from '@/api/user'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { LoginDto, UserDTO } from '@/api/auth'
import type { Result as ApiResult } from '@/api/base'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<UserDTO | null>(null);

    const login = async (
        credentials?: LoginDto
    ): Promise<ApiResult<UserDTO>> => {
        const res = await apiLogin(credentials);
        if (res.success) user.value = res.data;
        return res;
    };

    const register = async (
        userData: { username: string; email: string; password: string; invitationCode: string }
    ): Promise<ApiResult<any>> => {
        const res = await apiRegister(userData);
        if (!res.success) return { success: false, error: res.error, status: res.status };
        // 注册成功后自动登录拿到 user
        return res;
    };

    const logout = async (): Promise<ApiResult<void>> => {
        const res = await apiLogout();
        if (res.success) user.value = null;
        return res;
    };

    const refreshMe = async () => {
        const res = await apiGetMe();
        if (res.success) {
            user.value = res.data;
        } else {
            throw new Error(res.error);
        }
        return res;
    };

    const updateProfile = async (payload: { email?: string; avatar?: File, website?: string, egoId?: number }) => {
        const res = await apiUpdateMe(payload);
        if (res.success) user.value = res.data;
        return res;
    };

    return { user, login, register, logout, refreshMe, updateProfile };
})