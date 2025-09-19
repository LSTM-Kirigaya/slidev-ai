<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Card from 'primevue/card';
import Message from 'primevue/message';
import FloatLabel from 'primevue/floatlabel';

import { useAuthStore } from '@/store/auth';
import { t } from '@/i18n/index';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const invitationCode = ref('');
const error = ref('');

const handleSubmit = async () => {
    // Check if passwords match
    if (password.value !== confirmPassword.value) {
        error.value = t('auth.register.password-mismatch');
        return;
    }

    const res = await authStore.register({
        username: username.value,
        email: email.value,
        password: password.value,
        invitationCode: invitationCode.value
    });

    if (res.success) {
        router.push('/login');
    } else {
        error.value = res.error || t('auth.register.error');
    }
}
</script>

<template>
    <div>
        <div class="auth-container">
            <div class="auth-form">
                <div class="flex flex-col items-center mb-4">
                    <h1 class="text-3xl font-bold mt-2 flex items-center gap-1">
                        <img src="/favicon.svg" alt="" width="50px">
                        {{ t('auth.register.title') }}
                    </h1>
                    <p class="text-gray-600 mt-2">{{ t('auth.tagline') }}</p>
                </div>

                <Card>
                    <template #content>
                        <form @submit.prevent="handleSubmit">
                            <div class="p-field mb-8 mt-2">
                                <FloatLabel>
                                    <InputText id="username" v-model="username" type="text" required class="w-full" />
                                    <label for="username">{{ t('auth.register.username') }}</label>
                                </FloatLabel>
                            </div>

                            <div class="p-field mb-8">
                                <FloatLabel>
                                    <InputText id="email" v-model="email" type="email" required class="w-full" />
                                    <label for="email">{{ t('auth.register.email') }}</label>
                                </FloatLabel>
                            </div>

                            <div class="p-field mb-8 w-100">
                                <FloatLabel>
                                    <Password id="password" v-model="password" :feedback="true" toggleMask required
                                        class="w-full" />
                                    <label for="password">{{ t('auth.register.password') }}</label>
                                </FloatLabel>
                            </div>

                            <div class="p-field mb-8 w-100">
                                <FloatLabel>
                                    <Password id="confirmPassword" v-model="confirmPassword" :feedback="false" toggleMask required
                                        class="w-full" />
                                    <label for="confirmPassword">{{ t('auth.register.confirm-password') }}</label>
                                </FloatLabel>
                            </div>

                            <div class="p-field mb-8">
                                <FloatLabel>
                                    <InputText id="invitationCode" v-model="invitationCode" type="text" required class="w-full" />
                                    <label for="invitationCode">{{ t('auth.register.invitation-code') }}</label>
                                </FloatLabel>
                            </div>

                            <Button type="submit" :label="t('auth.register.button')" icon="pi pi-user-plus"
                                class="w-full mt-4" />

                            <div v-if="error" class="mt-4">
                                <Message severity="error">{{ error }}</Message>
                            </div>
                        </form>

                        <div class="mt-4 text-center">
                            <p>
                                {{ t('auth.register.prompt.has-account') }}
                                <Button @click="router.push('/login')" :label="t('auth.register.prompt.login-link')" link />
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