// 文件系统存储：页面图片落盘到 AppData/clearscan/docs/<docId>/
import { appDataDir } from '@tauri-apps/api/path'
import { mkdir, writeFile, readFile, remove } from '@tauri-apps/plugin-fs'

let ROOT = null

export async function getRoot() {
  if (ROOT) return ROOT
  ROOT = await appDataDir()
  await mkdir(`${ROOT}/docs`, { recursive: true }).catch(() => {})
  return ROOT
}

// blob(PNG) -> 落盘，返回绝对路径
export async function savePageImage(docId, seq, blob) {
  const root = await getRoot()
  const dir = `${root}/docs/${docId}`
  await mkdir(dir, { recursive: true })
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const path = `${dir}/p${String(seq).padStart(3, '0')}.png`
  await writeFile(path, bytes)
  return path
}

// 读回图片字节
export async function readPageImage(path) {
  const bytes = await readFile(path)
  return new Uint8Array(bytes)
}

export async function deleteDocDir(docId) {
  const root = await getRoot()
  await remove(`${root}/docs/${docId}`, { recursive: true }).catch(() => {})
}
