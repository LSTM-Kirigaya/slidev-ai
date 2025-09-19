<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Card from 'primevue/card';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

import { useAuthStore } from '@/store/auth';
import { t } from '@/i18n/index';
import { apiGetCaptcha } from '@/api/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const captchaText = ref('');
const error = ref('');
const captcha = ref<{ svg: string; id: string } | null>(null);

const loadCaptcha = async () => {
    console.log('enter');

    const res = await apiGetCaptcha();
    console.log(res);

    if (res.success) {
        captcha.value = res.data;
    }
};

onMounted(() => {
    loadCaptcha();
});

const handleSubmit = async () => {
    const res = await authStore.login({
        username: username.value,
        password: password.value,
        captchaId: captcha.value?.id || '',
        captchaText: captchaText.value
    });

    if (res.success) {
        router.push('/dashboard');
    } else {
        error.value = res.error || t('auth.login.error');
        // 重新加载验证码
        loadCaptcha();
    }
}
</script>

<template>
    <div>
        <div class="auth-container">
            <div class="auth-form">
                <!-- 标题区 -->
                <div class="flex flex-col items-center mb-4">
                    <h1 class="text-3xl font-bold mt-2 flex items-center gap-2">
                        <img src="/favicon.svg" alt="logo" width="50px" />
                        {{ t('auth.login.title') }}
                    </h1>
                    <p class="text-gray-600 mt-2">{{ t('auth.tagline') }}</p>
                </div>

                <Card>
                    <template #content>
                        <form @submit.prevent="handleSubmit">
                            <!-- 用户名 -->
                            <div class="p-field mb-8 mt-4">
                                <FloatLabel>
                                    <InputText id="username" v-model="username" type="text" required class="w-full" />
                                    <label for="username">{{ t('auth.login.username') }}</label>
                                </FloatLabel>
                            </div>

                            <!-- 密码 -->
                            <div class="p-field mb-8">
                                <FloatLabel>
                                    <Password id="password" v-model="password" :feedback="false" toggleMask required
                                        class="w-full" />
                                    <label for="password">{{ t('auth.login.password') }}</label>
                                </FloatLabel>
                            </div>

                            <!-- 验证码 -->
                            <div class="p-field mb-6">
                                <div class="flex gap-3 items-center">
                                    <!-- 输入框 -->
                                    <div class="flex-1">
                                        <FloatLabel>
                                            <InputText id="captcha" v-model="captchaText" type="text" required
                                                class="w-full" />
                                            <label for="captcha">{{ t('auth.login.captcha.title') }}</label>
                                        </FloatLabel>
                                    </div>

                                    <!-- 验证码图 -->
                                    <div v-if="captcha"
                                        class="flex items-center border rounded-lg px-2 py-1 border-gray-500">
                                        <div v-html="captcha.svg"></div>
                                    </div>

                                    <!-- 刷新按钮 -->
                                    <Button type="button" icon="pi pi-refresh" @click="loadCaptcha"
                                        class="p-button-rounded p-button-text"
                                        :aria-label="t('auth.login.captcha.refresh')" />
                                </div>
                            </div>

                            <!-- 登录按钮 -->
                            <Button type="submit" :label="t('auth.login.button')" icon="pi pi-sign-in"
                                class="w-full mt-4" />

                            <!-- 错误提示 -->
                            <div v-if="error" class="mt-4">
                                <Message severity="error">{{ error }}</Message>
                            </div>
                        </form>

                        <!-- 注册引导 -->
                        <div class="mt-4 text-center">
                            <p>
                                {{ t('auth.login.prompt.no-account') }}
                                <Button @click="router.push('/register')" :label="t('auth.login.prompt.register-link')"
                                    link />
                            </p>
                        </div>
                    </template>
                </Card>
            </div>
        </div>
    </div>
</template>


<style scoped>
.auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

.auth-form {
    width: 100%;
    max-width: 400px;
}
</style>