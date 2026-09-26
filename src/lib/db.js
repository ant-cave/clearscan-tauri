// 本地文档库（SQLite via @tauri-apps/plugin-sql）
// 文档元数据存 SQLite，页面图片存文件系统（见 storage.js）
import Database from '@tauri-apps/plugin-sql'

let _db = null

export async function getDb() {
  if (_db) return _db
  _db = await Database.load('sqlite:clearscan.db')
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `)
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      title TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      updated_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `)
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id INTEGER NOT NULL,
      seq INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      filter TEXT,
      params TEXT
    );
  `)
  return _db
}

export async function listFolders(parentId = null) {
  const d = await getDb()
  return d.select('SELECT * FROM folders WHERE parent_id IS ? ORDER BY name', [parentId])
}
export async function createFolder(name, parentId = null) {
  const d = await getDb()
  return d.execute('INSERT INTO folders (name, parent_id) VALUES (?, ?)', [name, parentId])
}
export async function listDocs(folderId = null) {
  const d = await getDb()
  return d.select('SELECT * FROM docs WHERE folder_id IS ? ORDER BY updated_at DESC', [folderId])
}
export async function createDoc(title, folderId = null) {
  const d = await getDb()
  const res = await d.execute('INSERT INTO docs (title, folder_id) VALUES (?, ?)', [title, folderId])
  return res.lastInsertId
}
export async function renameDoc(id, title) {
  const d = await getDb()
  await d.execute("UPDATE docs SET title=?, updated_at=strftime('%s','now') WHERE id=?", [title, id])
}
export async function deleteDoc(id) {
  const d = await getDb()
  await d.execute('DELETE FROM pages WHERE doc_id=?', [id])
  await d.execute('DELETE FROM docs WHERE id=?', [id])
}
export async function addPage(docId, seq, imagePath, filter, params) {
  const d = await getDb()
  await d.execute(
    'INSERT INTO pages (doc_id, seq, image_path, filter, params) VALUES (?, ?, ?, ?, ?)',
    [docId, seq, imagePath, filter, JSON.stringify(params || {})]
  )
  await d.execute("UPDATE docs SET updated_at=strftime('%s','now') WHERE id=?", [docId])
}
export async function listPages(docId) {
  const d = await getDb()
  return d.select('SELECT * FROM pages WHERE doc_id=? ORDER BY seq', [docId])
}
