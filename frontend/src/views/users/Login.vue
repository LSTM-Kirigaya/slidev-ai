<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Card from 'primevue/card';
import Message from 'primevue/message';
import { useAuthStore } from '@/store/auth';
import { t } from '@/i18n/index';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const error = ref('');



const handleSubmit = async () => {
    const res = await authStore.login({
        username: username.value,
        password: password.value
    });

    if (res.success) {
        router.push('/dashboard');
    } else {
        error.value = res.error || t('auth.login.error');
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
                        Slidev AI
                    </h1>
                    <p class="text-gray-600 mt-2">{{ t('auth.tagline') }}</p>
                </div>

                <Card>
                    <template #title>
                        <h2>{{ t('auth.login.title') }}</h2>
                    </template>

                    <template #content>
                        <form @submit.prevent="handleSubmit">
                            <div class="p-field mb-4">
                                <label for="username" class="block mb-2">{{ t('auth.login.username') }}</label>
                                <InputText id="username" v-model="username" type="text" required class="w-full" />
                            </div>

                           
                            <div class="p-field mb-4 w-100">
                                <label for="password" class="block mb-2">{{ t('auth.login.password') }}</label>
                                <Password id="password" v-model="password" :feedback="false" toggleMask required
                                    class="w-full" />
                            </div>

                            <Button type="submit" :label="t('auth.login.button')" icon="pi pi-sign-in"
                                class="w-full mt-4" />

                            <div v-if="error" class="mt-4">
                                <Message severity="error">{{ error }}</Message>
                            </div>
                        </form>

                        <div class="mt-4 text-center">
                            <p>
                                {{ t('auth.login.prompt.no-account') }}
                                <Button @click="router.push('/register')" :label="t('auth.login.prompt.register-link')" link/>
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