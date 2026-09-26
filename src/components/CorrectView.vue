<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { store, toast } from '../store.js'
import { loadOpenCV } from '../lib/opencv.js'
import { detectQuad, warpQuad, quadToCanvas, canvasToQuad } from '../lib/perspective.js'

const canvas = ref(null)
const loading = ref(true)
const quad = ref(null) // 画布像素坐标 [{x,y}*4]
let cv = null
let dragging = -1

function fitCanvas(img) {
  const maxW = Math.min(window.innerWidth - 40, 900)
  const scale = Math.min(1, maxW / img.width)
  const c = canvas.value
  c.width = Math.round(img.width * scale)
  c.height = Math.round(img.height * scale)
  return c
}

function paintBase(img, ctx, w, h) {
  const tmp = document.createElement('canvas')
  tmp.width = img.width
  tmp.height = img.height
  tmp.getContext('2d').putImageData(img, 0, 0)
  ctx.drawImage(tmp, 0, 0, w, h)
}

function drawQuad(ctx, pts) {
  ctx.strokeStyle = '#36c98d'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = '#36c98d'
  for (const p of pts) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2)
    ctx.fill()
  }
}

function draw(normQuad) {
  const img = store.sourceImage
  const c = fitCanvas(img)
  const ctx = c.getContext('2d')
  paintBase(img, ctx, c.width, c.height)
  quad.value = quadToCanvas(normQuad, c.width, c.height)
  drawQuad(ctx, quad.value)
}

function redraw() {
  const img = store.sourceImage
  const c = canvas.value
  const ctx = c.getContext('2d')
  paintBase(img, ctx, c.width, c.height)
  drawQuad(ctx, quad.value)
}

function pos(e) {
  const r = canvas.value.getBoundingClientRect()
  const t = e.touches ? e.touches[0] : e
  return { x: t.clientX - r.left, y: t.clientY - r.top }
}
function onDown(e) {
  if (!quad.value) return
  const p = pos(e)
  let best = -1
  let bd = 1e9
  quad.value.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  if (bd < 36) dragging = best
}
function onMove(e) {
  if (dragging < 0 || !quad.value) return
  e.preventDefault()
  const p = pos(e)
  quad.value[dragging] = p
  redraw()
}
function onUp() {
  dragging = -1
}

async function init() {
  if (!store.sourceImage) {
    store.view = 'scan'
    return
  }
  cv = await loadOpenCV()
  const q = detectQuad(cv, store.sourceImage)
  store.autoQuad = q
  const base = q || [
    { x: 0.03, y: 0.03 },
    { x: 0.97, y: 0.03 },
    { x: 0.97, y: 0.97 },
    { x: 0.03, y: 0.97 },
  ]
  draw(base)
  loading.value = false
}

function resetAuto() {
  if (store.autoQuad) draw(store.autoQuad)
  else toast('未检测到文档边界')
}

async function apply() {
  if (!quad.value || !cv) return
  const norm = canvasToQuad(quad.value, canvas.value.width, canvas.value.height)
  const out = warpQuad(cv, store.sourceImage, norm)
  store.correctedImage = out
  store.view = 'filter'
}

onMounted(init)
onBeforeUnmount(() => {
  dragging = -1
})
</script>

<template>
  <div class="card">
    <h3>透视校正</h3>
    <p class="muted">拖动四个绿点调整文档边界，然后校正。</p>
    <canvas
      v-show="!loading"
      ref="canvas"
      @mousedown="onDown"
      @mousemove="onMove"
      @mouseup="onUp"
      @mouseleave="onUp"
      @touchstart="onDown"
      @touchmove="onMove"
      @touchend="onUp"
    ></canvas>
    <p class="muted" v-if="loading">正在加载 OpenCV 并检测文档边界…</p>
    <div class="row" style="margin-top: 10px">
      <button @click="resetAuto">恢复自动检测</button>
      <button class="primary" @click="apply" :disabled="loading">校正并下一步</button>
    </div>
  </div>
</template>
