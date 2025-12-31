<script setup>

</script>

<template>
    <footer class="footer-container mt-12">
        <div class="container mx-auto px-6">
            <div
                class="h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-8">
            </div>

            <div class="flex flex-col items-center justify-center space-y-4 pb-10">
                <div class="flex items-center gap-2 mb-2">
                    <span
                        class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700">
                        Slidev AI
                    </span>
                    <span class="text-gray-300 dark:text-gray-600">|</span>
                    <div class="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                        <div class="creator-link">
                            <span class="opacity-70 mr-2">由</span>
                            <a href="https://kirigaya.cn/about" target="_blank" class="hover-link">锦恢</a>
                            和
                            <a href="https://peacesheep.xyz/home" target="_blank" class="hover-link">太平羊羊</a>
                            共同呈现
                        </div>
                    </div>
                </div>



                <div class="text-[12px] text-gray-400 mt-4 flex items-center gap-2">
                    <span>&copy; {{ new Date().getFullYear() }} Slidev AI.</span>
                    <span>All Rights Reserved.</span>
                </div>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.footer-container {
    position: relative;
    z-index: 10;
    /* 确保在模糊球之上或之下根据需求调整 */
}

.hover-link {
    @apply font-medium transition-all duration-300 relative text-primary dark:text-primary;
}

.hover-link::after {
    content: '';
    @apply absolute bottom-0 left-0 w-0 h-[1px] bg-primary-500 transition-all duration-300;
}

.hover-link:hover {
    @apply text-primary-500;
}

.hover-link:hover::after {
    @apply w-full;
}


/* 如果需要适配你原本的高斯模糊球，可以给 footer 增加一点毛玻璃感 */
/* footer {
    backdrop-filter: blur(4px);
} 
*/
</style>