<script setup>
import { store } from './store.js'
import ScanView from './components/ScanView.vue'
import CorrectView from './components/CorrectView.vue'
import FilterView from './components/FilterView.vue'
import LibraryView from './components/LibraryView.vue'
import ExportView from './components/ExportView.vue'

const views = [
  { key: 'scan', label: '扫描' },
  { key: 'correct', label: '校正' },
  { key: 'filter', label: '滤镜' },
  { key: 'library', label: '文档库' },
  { key: 'export', label: '导出' },
]

function go(v) {
  store.view = v
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <button
        v-for="v in views"
        :key="v.key"
        :class="{ active: store.view === v.key }"
        @click="go(v.key)"
      >
        {{ v.label }}
      </button>
    </header>

    <main class="content">
      <ScanView v-if="store.view === 'scan'" />
      <CorrectView v-else-if="store.view === 'correct'" />
      <FilterView v-else-if="store.view === 'filter'" />
      <LibraryView v-else-if="store.view === 'library'" />
      <ExportView v-else-if="store.view === 'export'" />
    </main>

    <div v-if="store.toast" class="toast">{{ store.toast }}</div>
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  pointer-events: none;
}
</style>
