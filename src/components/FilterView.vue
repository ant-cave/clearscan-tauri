<script setup>
import { ref, watch, onMounted } from 'vue'
import { store, toast } from '../store.js'
import { loadOpenCV, imageDataToDataURL } from '../lib/opencv.js'
import { applyFilter, FILTERS } from '../lib/filters.js'

const cvRef = ref(null)
const preview = ref('')
const busy = ref(false)

async function render() {
  if (!store.correctedImage) {
    store.view = 'correct'
    return
  }
  if (!cvRef.value) cvRef.value = await loadOpenCV()
  busy.value = true
  await new Promise((r) => setTimeout(r, 10))
  const out = applyFilter(cvRef.value, store.correctedImage, store.activeFilter, store.filterParams)
  store.filteredImage = out
  preview.value = imageDataToDataURL(out)
  busy.value = false
}

function addPage() {
  if (!store.filteredImage) return
  store.pages.push({
    id: Date.now(),
    imageData: store.filteredImage,
    filter: store.activeFilter,
    params: { ...store.filterParams },
  })
  toast(`已添加第 ${store.pages.length} 页`)
  store.sourceImage = null
  store.correctedImage = null
  store.filteredImage = null
  store.autoQuad = null
  store.view = 'scan'
}

function finish() {
  if (store.filteredImage) {
    store.pages.push({
      id: Date.now(),
      imageData: store.filteredImage,
      filter: store.activeFilter,
      params: { ...store.filterParams },
    })
  }
  store.view = 'export'
}

onMounted(render)
watch(
  () => [store.activeFilter, { ...store.filterParams }],
  () => render(),
  { deep: true }
)
</script>

<template>
  <div class="card">
    <h3>滤镜（{{ FILTERS.find((f) => f.key === store.activeFilter)?.label }}）</h3>
    <div class="row" style="margin-bottom: 10px">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        :class="{ active: f.key === store.activeFilter }"
        @click="store.activeFilter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <img v-if="preview" :src="preview" style="max-width: 100%; border-radius: 8px" alt="预览" />
    <p class="muted" v-if="busy">滤镜处理中…</p>

    <div class="card" style="margin-top: 10px">
      <label>黑白阈值 {{ store.filterParams.threshold }}</label>
      <input type="range" min="0" max="255" v-model.number="store.filterParams.threshold" />
      <label>锐化 {{ store.filterParams.sharpen }}</label>
      <input type="range" min="0" max="100" v-model.number="store.filterParams.sharpen" />
      <label>降噪 {{ store.filterParams.denoise }}</label>
      <input type="range" min="0" max="100" v-model.number="store.filterParams.denoise" />
      <label>纸张提亮 {{ store.filterParams.paperLift }}</label>
      <input type="range" min="0" max="100" v-model.number="store.filterParams.paperLift" />
      <label>增强 {{ store.filterParams.enhance }}</label>
      <input type="range" min="0" max="100" v-model.number="store.filterParams.enhance" />
    </div>

    <div class="row" style="margin-top: 10px">
      <button class="primary" @click="addPage">添加到文档（拍下一页）</button>
      <button @click="finish">完成并导出</button>
    </div>
    <p class="muted">当前文档已添加 {{ store.pages.length }} 页</p>
  </div>
</template>
