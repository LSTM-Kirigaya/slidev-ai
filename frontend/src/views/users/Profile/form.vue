<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { t } from '@/i18n';

import Card from 'primevue/card'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import { UPLOADS_BASE_URL } from '@/utils/api'
import { useAuthStore } from '@/store/auth'
import type { UserDTO } from '@/api/auth'
import { useToast } from 'primevue'

const props = defineProps<{
    user: UserDTO | null
    isSelf: boolean
    selectedNode: number | null
}>()

const emit = defineEmits<{
    (e: 'login'): void,
    (e: 'update:selectedNode', value: number | null): void
}>();

const authStore = useAuthStore()

const email = ref('')
const website = ref('')
const avatarFile = ref<File | null>(null)
const loading = ref(false);

const originalEmail = ref('')
const originalWebsite = ref('')
const originalAvatar = ref<string | null>(null)
const originalEgoId = ref<number | null>(null)

const toast = useToast();

// 校验 email
const isEmailValid = computed(() => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email.value)
})

// 校验 website
const isWebsiteValid = computed(() => {
    try {
        const url = new URL(website.value.startsWith('http') ? website.value : `https://${website.value}`)
        return !!url
    } catch {
        return false
    }
});

const openEmail = () => {
    if (isEmailValid.value) {
        window.location.href = `mailto:${email.value}`
    } else {
        toast.add({ severity: 'warn', summary: 'Invalid Email', detail: 'Please enter a valid email address', life: 3000 })
    }
}

const openWebsite = () => {
    if (isWebsiteValid.value) {
        const url = website.value.startsWith('http') ? website.value : `https://${website.value}`
        window.open(url, '_blank')
    } else {
        toast.add({ severity: 'warn', summary: 'Invalid Website', detail: 'Please enter a valid website URL', life: 3000 })
    }
}

watch(
    () => props.user,
    val => {
        if (val) {
            email.value = val.email
            website.value = val.website || ''
            emit('update:selectedNode', val.egoId || null)

            originalEmail.value = val.email
            originalWebsite.value = val.website || ''
            originalAvatar.value = val.avatar || null
            originalEgoId.value = val.egoId || null
        }
    },
    { immediate: true }
)

const onAvatarClick = () => {
    document.getElementById('avatarInput')?.click()
}

const onAvatarSelect = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) avatarFile.value = file
}

// const hasChanges = computed(() => {
//     if (!props.isSelf) {
//         return false;
//     }

//     return (
//         (email.value !== originalEmail.value) ||
//         (props.selectedNode !== originalEgoId.value) ||
//         (website.value !== originalWebsite.value)
//     )
// })


const submit = async () => {
    if (!props.isSelf) return
    loading.value = true
    await authStore.updateProfile({
        email: email.value !== props.user?.email ? email.value : undefined,
        avatar: avatarFile.value || undefined,
        website: website.value || undefined,
        egoId: props.selectedNode || undefined
    });
    try {
        await authStore.refreshMe();
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Profile updated successfully',
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update profile',
            life: 3000
        });
    }
    loading.value = false
    avatarFile.value = null
}

const getImageUrl = (file: any) => {
    return URL.createObjectURL(file);
}

const goLogin = () => {
    emit('login')
}

// Logout function
const logout = async () => {
    await authStore.logout();
    // refresh
    window.location.reload();
}

</script>

<template>
    <Card>
        <template #title>
            <div class="text-xl font-semibold">{{ t('common.user.profile-title') }}</div>
        </template>

        <template #content>
            <div v-if="props.user" class="flex flex-col items-center gap-6">
                <!-- Avatar -->
                <div class="relative group cursor-pointer" v-tooltip.top="'Change Avatar'" @click="onAvatarClick">
                    <Avatar v-if="props.user.avatar && !avatarFile"
                        :image="`${UPLOADS_BASE_URL}/avatars/${props.user.avatar}`" shape="circle" size="large"
                        class="p-avatar-lg shadow-md" />
                    <Avatar v-else-if="avatarFile" :image="getImageUrl(avatarFile)" shape="circle" size="large"
                        class="p-avatar-lg shadow-md" />
                    <Avatar v-else :label="props.user.username.charAt(0).toUpperCase()" shape="circle" size="large"
                        class="p-avatar-lg shadow-md" />
                    <input id="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarSelect" />
                </div>

                <!-- User Info -->
                <div class="w-full space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-500 mb-1">{{ t('profile.username') }}</label>
                        <div class="text-lg font-semibold">{{ props.user.username }}</div>
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="block text-sm font-medium text-gray-500 mb-1">{{ t('profile.email') }}</label>
                            <Button v-if="isEmailValid" icon="pi pi-envelope" severity="secondary" text
                                @click="openEmail" />
                        </div>
                        <InputText v-model="email" :disabled="!props.isSelf" placeholder="Enter new email"
                            class="w-full" />
                    </div>
                    <div>
                        <div class="flex items-center justify-between">
                            <label class="block text-sm font-medium text-gray-500 mb-1">{{ t('profile.website')
                                }}</label>
                            <Button v-if="isWebsiteValid" icon="pi pi-external-link" severity="secondary" text
                                @click="openWebsite" />
                        </div>
                        <InputText v-model="website" :disabled="!props.isSelf"
                            placeholder="Your beloved blog or website" class="w-full" />
                    </div>
                </div>

                <Button v-if="props.isSelf" :label="t('save-change')" :loading="loading" icon="pi pi-save"
                    class="mt-4 w-full" @click="submit" />

                <Button :label="t('auth.logout.button')" @click="logout" icon="pi pi-sign-out" class="mt-1 w-full"
                    severity="danger" />
            </div>

            <div v-else class="flex flex-col items-center gap-4 py-6 text-center">
                <div class="text-gray-600">{{ t('you-are-not-log-in') }}</div>
                <Button label="Login" icon="pi pi-sign-in" @click="goLogin" />
            </div>
        </template>
    </Card>
</template>

<style scoped>
.p-avatar-lg {
    width: 120px;
    height: 120px;
    font-size: 3rem;
}
</style>
