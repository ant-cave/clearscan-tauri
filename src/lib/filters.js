// 5 种滤镜（OpenCV.js 实现）+ 可调参数
// 参数：threshold(黑白阈值) / sharpen(锐化) / denoise(降噪) / paperLift(纸张提亮) / enhance(增强强度)
import { imageDataToMat, matToImageData } from './opencv.js'

export const FILTERS = [
  { key: 'magic', label: '魔法彩色' },
  { key: 'smartGray', label: '智能灰度' },
  { key: 'bw', label: '黑白' },
  { key: 'ink', label: '墨水' },
  { key: 'white', label: '白纸' },
]

const DEFAULTS = { threshold: 128, sharpen: 0, denoise: 0, paperLift: 30, enhance: 50 }

// 入口：imgData(RGBA) -> ImageData(RGBA)
export function applyFilter(cv, imgData, name, params = {}) {
  const p = { ...DEFAULTS, ...params }
  const src = imageDataToMat(cv, imgData) // BGR
  let m = baseFilter(cv, src, name, p) // 返回新 mat（BGR）
  if (p.denoise > 0) m = applyDenoise(cv, m, p.denoise)
  if (p.sharpen > 0) m = applySharpen(cv, m, p.sharpen)
  if (p.enhance > 0) m = applyEnhance(cv, m, p.enhance)
  if (p.paperLift > 0 && name !== 'white') m = applyPaperLift(cv, m, p.paperLift)
  const out = matToImageData(cv, m)
  m.delete()
  src.delete()
  return out
}

function baseFilter(cv, src, name, p) {
  switch (name) {
    case 'smartGray':
      return smartGray(cv, src)
    case 'bw':
      return bwFilter(cv, src, p.threshold)
    case 'ink':
      return inkFilter(cv, src, p.threshold)
    case 'white':
      return whitePaper(cv, src, p.paperLift)
    case 'magic':
    default:
      return magicColor(cv, src, p)
  }
}

// 智能灰度：灰度 + CLAHE 自适应对比度
function smartGray(cv, src) {
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY)
  const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8))
  const eq = new cv.Mat()
  clahe.apply(gray, eq)
  const out = new cv.Mat()
  cv.cvtColor(eq, out, cv.COLOR_GRAY2BGR)
  clahe.delete()
  gray.delete()
  eq.delete()
  return out
}

// 黑白：灰度 + 二值阈值
function bwFilter(cv, src, threshold) {
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY)
  const bin = new cv.Mat()
  cv.threshold(gray, bin, threshold, 255, cv.THRESH_BINARY)
  const out = new cv.Mat()
  cv.cvtColor(bin, out, cv.COLOR_GRAY2BGR)
  gray.delete()
  bin.delete()
  return out
}

// 墨水：灰度 + 反相二值（笔迹为黑，纸张为白）
function inkFilter(cv, src, threshold) {
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_BGR2GRAY)
  const bin = new cv.Mat()
  cv.threshold(gray, bin, threshold, 255, cv.THRESH_BINARY_INV)
  const out = new cv.Mat()
  cv.cvtColor(bin, out, cv.COLOR_GRAY2BGR)
  gray.delete()
  bin.delete()
  return out
}

// 白纸：整体提亮，使纸张更白
function whitePaper(cv, src, lift) {
  const out = new cv.Mat()
  cv.convertScaleAbs(src, out, 1.0, lift * 1.5)
  return out
}

// 魔法彩色：除法归一化（逐像素背景估计抹平光照不均/黄纸，保留笔迹层次），再自动黑白点拉伸
function magicColor(cv, src, p) {
  const bg = new cv.Mat()
  cv.GaussianBlur(src, bg, new cv.Size(101, 101), 0) // 大核模糊估计背景光照
  const srcF = new cv.Mat()
  const bgF = new cv.Mat()
  src.convertTo(srcF, cv.CV_32F)
  bg.convertTo(bgF, cv.CV_32F)
  const norm = new cv.Mat()
  cv.divide(srcF, bgF, norm, 1, -1) // 每通道 src/bg：背景趋于 1，笔迹保留相对色
  const scaled = new cv.Mat()
  cv.convertScaleAbs(norm, scaled, 255, 0) // 背景->255(白)，彩色笔迹保留
  let out = stretchContrast(cv, scaled)
  srcF.delete()
  bgF.delete()
  norm.delete()
  scaled.delete()
  bg.delete()
  return out
}

// 自动黑白点拉伸（基于 min/max 归一化，抹平残留偏色）
function stretchContrast(cv, m) {
  const out = new cv.Mat()
  cv.normalize(m, out, 0, 255, cv.NORM_MINMAX)
  return out
}

// ---- 统一后处理 ----
function applyDenoise(cv, m, amt) {
  const ksize = amt > 60 ? 5 : 3
  const dst = new cv.Mat()
  cv.medianBlur(m, dst, ksize)
  m.delete()
  return dst
}

function applySharpen(cv, m, amt) {
  const s = amt / 100
  const kernel = cv.matFromArray(3, 3, cv.CV_32F, [
    0, -s, 0,
    -s, 1 + 4 * s, -s,
    0, -s, 0,
  ])
  const dst = new cv.Mat()
  cv.filter2D(m, dst, -1, kernel)
  kernel.delete()
  m.delete()
  return dst
}

function applyEnhance(cv, m, amt) {
  const alpha = 1 + amt / 100
  const dst = new cv.Mat()
  cv.convertScaleAbs(m, dst, alpha, 0)
  m.delete()
  return dst
}

function applyPaperLift(cv, m, lift) {
  const dst = new cv.Mat()
  cv.convertScaleAbs(m, dst, 1.0, lift * 0.8)
  m.delete()
  return dst
}
