// 透视校正：自动检测文档四边形 + 透视变换
import { imageDataToMat, matToImageData } from './opencv.js'

// 把 [x,y] 点按 左上(和最小)、右上(差最大)、右下(和最大)、左下(差最小) 排序
function orderPoints(pts) {
  const sum = pts.map((p) => p[0] + p[1])
  const diff = pts.map((p) => p[0] - p[1])
  const argmin = (a) => a.indexOf(Math.min(...a))
  const argmax = (a) => a.indexOf(Math.max(...a))
  return [pts[argmin(sum)], pts[argmax(diff)], pts[argmax(sum)], pts[argmin(diff)]]
}

const clamp01 = (v) => Math.max(0, Math.min(1, v))

// 自动检测最大四边形文档边界
// 返回归一化坐标(0..1) 的 4 点，顺序 TL,TR,BR,BL；未检测到返回 null
export function detectQuad(cv, imgData) {
  const src = imageDataToMat(cv, imgData) // BGR
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY)
  const blur = new cv.Mat()
  cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0)
  const edges = new cv.Mat()
  cv.Canny(blur, edges, 75, 200)
  const contours = new cv.MatVector()
  const hier = new cv.Mat()
  cv.findContours(edges, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

  const W = imgData.width
  const H = imgData.height
  const minArea = W * H * 0.04
  let best = null
  let bestArea = 0

  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i)
    const area = cv.contourArea(c)
    if (area < minArea) continue
    const peri = cv.arcLength(c, true)
    const approx = new cv.Mat()
    cv.approxPolyDP(c, approx, 0.02 * peri, true)
    if (approx.rows === 4) {
      const pts = []
      for (let j = 0; j < 4; j++) pts.push([approx.data32S[j * 2], approx.data32S[j * 2 + 1]])
      const ordered = orderPoints(pts)
      if (area > bestArea) {
        best = ordered
        bestArea = area
      }
    }
    approx.delete()
  }

  contours.delete()
  hier.delete()
  edges.delete()
  blur.delete()
  gray.delete()
  src.delete()

  if (!best) return null
  return best.map(([x, y]) => ({ x: clamp01(x / W), y: clamp01(y / H) }))
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
const flatten = (pts) => {
  const o = []
  for (const p of pts) o.push(p[0], p[1])
  return o
}

// 按用户给定的四边形（归一化 4 点 TL,TR,BR,BL）做透视校正
// 返回校正后的 ImageData
export function warpQuad(cv, imgData, quad) {
  const src = imageDataToMat(cv, imgData)
  const W = imgData.width
  const H = imgData.height
  const p = quad.map((q) => [q.x * W, q.y * H])
  const [tl, tr, br, bl] = p

  const w = Math.max(10, Math.round((dist(tl, tr) + dist(bl, br)) / 2))
  const h = Math.max(10, Math.round((dist(tl, bl) + dist(tr, br)) / 2))

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, flatten([tl, tr, br, bl]))
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h])
  const M = cv.getPerspectiveTransform(srcTri, dstTri)
  const dst = new cv.Mat()
  cv.warpPerspective(src, dst, M, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())

  const out = matToImageData(cv, dst)
  srcTri.delete()
  dstTri.delete()
  M.delete()
  dst.delete()
  src.delete()
  return out
}

// 把归一化 quad 转换为画布像素坐标（用于 Canvas 绘制/拖拽）
export function quadToCanvas(quad, cw, ch) {
  return quad.map((q) => ({ x: q.x * cw, y: q.y * ch }))
}

// 把画布像素坐标 quad 转换回归一化（用于 warp）
export function canvasToQuad(pts, cw, ch) {
  return pts.map((p) => ({ x: clamp01(p.x / cw), y: clamp01(p.y / ch) }))
}
