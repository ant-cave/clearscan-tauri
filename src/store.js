import { reactive } from 'vue'

// 全局共享状态：所有页面/组件共用，避免逐层透传 props
export const store = reactive({
  view: 'scan', // scan | correct | filter | library | export

  sourceImage: null, // 原始 ImageData（导入/拍照后）
  sourceMeta: null, // { width, height, name }

  correctedImage: null, // 透视校正后的 ImageData
  quad: null, // 当前四边形四角 [{x,y}*4]，归一化坐标(0..1)
  autoQuad: null, // 自动检测到的四边形

  filteredImage: null, // 滤镜预览 ImageData
  activeFilter: 'magic', // smartGray | magic | bw | ink | white
  filterParams: {
    threshold: 128, // B&W 阈值
    sharpen: 0, // 锐化强度 0..100
    denoise: 0, // 降噪 0..100
    paperLift: 30, // 纸张提亮 0..100
    enhance: 50, // 增强强度 0..100
  },

  pages: [], // 已添加页面：{ id, dataUrl, filter, params }
  activeDocId: null, // 当前保存到哪个文档
  activeFolderId: null,

  toast: '',
  busy: false,
})

let toastTimer = null
export function toast(msg) {
  store.toast = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (store.toast = ''), 2600)
}
