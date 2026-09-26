// PDF 导出（前端 pdf-lib，多页）
import { PDFDocument } from 'pdf-lib'
import { imageDataToBlob } from './opencv.js'

// pages: [{ imageData }] -> PDF Blob
export async function buildPdf(pages) {
  const pdf = await PDFDocument.create()
  for (const pg of pages) {
    const blob = await imageDataToBlob(pg.imageData)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const img = await pdf.embedPng(bytes)
    const page = pdf.addPage([img.width, img.height])
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
  }
  const out = await pdf.save()
  return new Blob([out], { type: 'application/pdf' })
}

// 桌面：系统保存对话框
export async function savePdf(blob, defaultName = 'clearscan.pdf') {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (!path) return false
  const bytes = new Uint8Array(await blob.arrayBuffer())
  await writeFile(path, bytes)
  return true
}
