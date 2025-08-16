<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { API_BASE_URL } from '@/utils/api'

const route = useRoute()
const slide = ref<{title: string, content: string} | null>(null)
const loading = ref(true)
const error = ref('')

const getSlideById = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/slides/preview/${route.params.hash}`)
        slide.value = response.data
    } catch (err) {
        error.value = 'Failed to load slide'
        console.error(err)
    } finally {
        loading.value = false
    }
}

const copyToClipboard = async () => {
  if (slide.value) {
    try {
      await navigator.clipboard.writeText(slide.value.content)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }
}

onMounted(() => {
    getSlideById()
})
</script>

<template>
    <div class="preview-container">
        <div v-if="loading" class="loading">
            Loading slide...
        </div>

        <div v-else-if="error" class="error">
            {{ error }}
        </div>

        <div v-else-if="slide" class="slide-content">
            <div class="slide-header">
                <h1>{{ slide.title }}</h1>
                <div class="actions">
                    <button @click="copyToClipboard" class="copy-btn">
                        Copy Markdown
                    </button>
                </div>
            </div>

            <div class="markdown-container">
                <pre>{{ slide.content }}</pre>
            </div>

            <div class="instructions">
                <h3>How to use this Slidev presentation:</h3>
                <ol>
                    <li>Copy the markdown content above</li>
                    <li>Save it as a .md file (e.g., presentation.md)</li>
                    <li>Install Slidev: <code>npm install -g @slidev/cli</code></li>
                    <li>Run: <code>slidev presentation.md</code></li>
                </ol>
            </div>
        </div>

        <div v-else class="not-found">
            Slide not found
        </div>
    </div>
</template>

<style scoped>
.preview-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.loading,
.error,
.not-found {
    text-align: center;
    padding: 2rem;
}

.slide-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;
}

.slide-header h1 {
    color: #333;
    margin: 0;
}

.actions {
    display: flex;
    gap: 0.5rem;
}

.copy-btn {
    padding: 0.5rem 1rem;
    background-color: #409eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.copy-btn:hover {
    background-color: #337ecc;
}

.markdown-container {
    background: #f8f8f8;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 2rem;
}

.markdown-container pre {
    background: #fff;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    margin: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    line-height: 1.4;
}

.instructions {
    background: #e8f4ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
    padding: 1.5rem;
}

.instructions h3 {
    margin-top: 0;
    color: #333;
}

.instructions ol {
    padding-left: 1.5rem;
}

.instructions li {
    margin-bottom: 0.5rem;
}

.instructions code {
    background: #d1e7ff;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', Courier, monospace;
}
</style>