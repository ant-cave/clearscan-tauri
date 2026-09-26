<script setup>
import { ref, onMounted } from 'vue'
import { toast } from '../store.js'
import * as db from '../lib/db.js'
import { readPageImage } from '../lib/storage.js'

const docs = ref([])
const openId = ref(null)
const pages = ref([]) // [{ seq, url }]

async function refresh() {
  docs.value = await db.listDocs(null)
}

async function newDoc() {
  const title = window.prompt('文档标题')
  if (!title) return
  await db.createDoc(title, null)
  await refresh()
}

async function delDoc(id) {
  if (!window.confirm('删除该文档及其全部页面？')) return
  await db.deleteDoc(id)
  if (openId.value === id) {
    openId.value = null
    pages.value = []
  }
  await refresh()
}

function bytesToPreview(bytes) {
  const blob = new Blob([bytes], { type: 'image/png' })
  const url = URL.createObjectURL(blob)
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      res(c.toDataURL('image/png'))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => res('')
    img.src = url
  })
}

async function openDoc(id) {
  openId.value = id
  const rows = await db.listPages(id)
  const list = []
  for (const r of rows) {
    try {
      const bytes = await readPageImage(r.image_path)
      list.push({ seq: r.seq, url: await bytesToPreview(bytes) })
    } catch (e) {
      list.push({ seq: r.seq, url: '' })
    }
  }
  list.sort((a, b) => a.seq - b.seq)
  pages.value = list
}

onMounted(refresh)
</script>

<template>
  <div class="card">
    <h3>文档库</h3>
    <div class="row" style="margin-bottom: 10px">
      <button class="primary" @click="newDoc">新建文档</button>
    </div>

    <div v-if="docs.length === 0" class="muted">暂无文档（在“导出”页把当前页面存为文档）</div>

    <div
      v-for="d in docs"
      :key="d.id"
      class="card"
      style="display: flex; justify-content: space-between; align-items: center"
    >
      <div>
        <strong>{{ d.title }}</strong>
        <div class="muted">{{ new Date(d.updated_at * 1000).toLocaleString() }}</div>
      </div>
      <div class="row">
        <button @click="openDoc(d.id)">打开</button>
        <button @click="delDoc(d.id)">删除</button>
      </div>
    </div>

    <div v-if="openId" class="card">
      <h4>页面</h4>
      <div class="row">
        <img
          v-for="p in pages"
          v-show="p.url"
          :key="p.seq"
          :src="p.url"
          style="width: 120px; border-radius: 6px"
          alt="page"
        />
        <span v-if="pages.length === 0" class="muted">无页面</span>
      </div>
    </div>
  </div>
</template>
