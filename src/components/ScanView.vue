<script setup>
import { ref } from 'vue'
import { store, toast } from '../store.js'
import { fileToImageData } from '../lib/imageio.js'

const busy = ref(false)

async function onPick(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  busy.value = true
  try {
    const img = await fileToImageData(file)
    store.sourceImage = img
    store.sourceMeta = { width: img.width, height: img.height, name: file.name }
    store.view = 'correct'
  } catch (err) {
    toast('读取图片失败：' + (err && err.message ? err.message : err))
  } finally {
    busy.value = false
    e.target.value = ''
  }
}
</script>

<template>
  <div class="card">
    <h3>扫描</h3>
    <p class="muted">
      导入一张图片（桌面端为文件选择），或在手机上用系统相机拍摄。本复刻版省略实时边缘引导，采用拍后处理流程。
    </p>
    <div class="row">
      <label class="primary" style="display: inline-block; padding: 8px 14px; border-radius: 10px; cursor: pointer">
        选择图片 / 拍照
        <input type="file" accept="image/*" capture="environment" @change="onPick" style="display: none" />
      </label>
    </div>
    <p class="muted" v-if="busy">处理中…</p>
    <p class="muted" v-if="store.pages.length">当前文档已添加 {{ store.pages.length }} 页</p>
  </div>
</template>
