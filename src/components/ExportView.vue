<script setup>
import { ref } from 'vue'
import { store, toast } from '../store.js'
import { buildPdf, savePdf } from '../lib/pdf.js'
import { imageDataToBlob, imageDataToDataURL } from '../lib/opencv.js'
import * as db from '../lib/db.js'
import { savePageImage } from '../lib/storage.js'

const busy = ref(false)

function imgUrl(p) {
  return imageDataToDataURL(p.imageData)
}

async function exportPdf() {
  if (store.pages.length === 0) {
    toast('没有可导出的页面')
    return
  }
  busy.value = true
  try {
    const blob = await buildPdf(store.pages)
    const ok = await savePdf(blob, `clearscan-${Date.now()}.pdf`)
    toast(ok ? '已保存 PDF' : '已取消')
  } catch (e) {
    toast('导出失败：' + (e && e.message ? e.message : e))
  } finally {
    busy.value = false
  }
}

async function saveAsDoc() {
  if (store.pages.length === 0) {
    toast('没有可保存的页面')
    return
  }
  const title = window.prompt('文档标题') || `文档 ${new Date().toLocaleString()}`
  busy.value = true
  try {
    const docId = await db.createDoc(title, null)
    for (let i = 0; i < store.pages.length; i++) {
      const pg = store.pages[i]
      const blob = await imageDataToBlob(pg.imageData)
      const path = await savePageImage(docId, i + 1, blob)
      await db.addPage(docId, i + 1, path, pg.filter, pg.params)
    }
    toast(`已保存文档「${title}」（${store.pages.length} 页）`)
    store.pages = []
  } catch (e) {
    toast('保存失败：' + (e && e.message ? e.message : e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="card">
    <h3>导出</h3>
    <p class="muted">当前文档包含 {{ store.pages.length }} 页。</p>
    <div class="row">
      <button class="primary" @click="exportPdf" :disabled="busy || store.pages.length === 0">
        导出为 PDF
      </button>
      <button @click="saveAsDoc" :disabled="busy || store.pages.length === 0">存入文档库</button>
    </div>
    <p class="muted" v-if="busy">处理中…</p>
    <div class="row" style="margin-top: 10px; flex-wrap: wrap">
      <img
        v-for="p in store.pages"
        :key="p.id"
        :src="imgUrl(p)"
        style="width: 90px; border-radius: 6px"
        alt="page"
      />
    </div>
  </div>
</template>
