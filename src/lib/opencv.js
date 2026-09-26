// OpenCV.js 加载与图像互转工具
//
// 约定：前端 Canvas/ImageData 始终是 RGBA；送入 OpenCV 的 Mat 始终是 BGR（OpenCV 原生）。
// 互转函数内部完成通道转换，算法层无需关心通道顺序。

let _cv = null
let _loading = null

// 动态加载 public/opencv.js（OpenCV 官方 WASM 构建，挂载到 window.cv）
// 本地优先：运行时从本地 public 目录加载，不依赖 CDN。
export function loadOpenCV() {
  if (_cv && typeof _cv.imread === 'function') return Promise.resolve(_cv)
  if (_loading) return _loading

  _loading = new Promise((resolve, reject) => {
    const waitReady = () => {
      const tick = () => {
        if (window.cv && typeof window.cv.imread === 'function') {
          _cv = window.cv
          resolve(window.cv)
        } else {
          setTimeout(tick, 40)
        }
      }
      tick()
    }

    if (window.cv && typeof window.cv.imread === 'function') {
      _cv = window.cv
      return resolve(window.cv)
    }

    const s = document.createElement('script')
    s.src = '/opencv.js'
    s.async = true
    s.onload = waitReady
    s.onerror = () =>
      reject(new Error('无法加载 /opencv.js，请确认 public/opencv.js 已就位'))
    document.head.appendChild(s)
  })
  return _loading
}

// ImageData(RGBA) -> cv.Mat(BGR)
export function imageDataToMat(cv, imgData) {
  const rgba = new cv.Mat(imgData.height, imgData.width, cv.CV_8UC4)
  rgba.data.set(imgData.data)
  const bgr = new cv.Mat()
  cv.cvtColor(rgba, bgr, cv.COLOR_RGBA2BGR)
  rgba.delete()
  return bgr
}

// cv.Mat(BGR) -> ImageData(RGBA)
export function matToImageData(cv, mat) {
  const rgba = new cv.Mat()
  cv.cvtColor(mat, rgba, cv.COLOR_BGR2RGBA)
  const imgData = new ImageData(
    new Uint8ClampedArray(rgba.data.buffer.slice(0)),
    rgba.cols,
    rgba.rows
  )
  rgba.delete()
  return imgData
}

// ImageData -> PNG dataURL
export function imageDataToDataURL(imgData) {
  const c = document.createElement('canvas')
  c.width = imgData.width
  c.height = imgData.height
  const ctx = c.getContext('2d')
  ctx.putImageData(imgData, 0, 0)
  return c.toDataURL('image/png')
}

// dataURL -> ImageData
export function dataURLToImageData(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(ctx.getImageData(0, 0, img.width, img.height))
    }
    img.onerror = (e) => reject(e)
    img.src = dataUrl
  })
}

// ImageData -> Blob(PNG)
export function imageDataToBlob(imgData) {
  const c = document.createElement('canvas')
  c.width = imgData.width
  c.height = imgData.height
  const ctx = c.getContext('2d')
  ctx.putImageData(imgData, 0, 0)
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'))
}
