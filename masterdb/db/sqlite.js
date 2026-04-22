/**
 * sql.js wrapper with OPFS persistence.
 *
 * sql.js is loaded as a global (initSqlJs) from the CDN script tag in index.html.
 * The SQLite database file is persisted to the browser's Origin Private File System.
 *
 * Usage:
 *   import { initDB, query, run, getDB } from './db/sqlite.js'
 *   await initDB()
 *   const rows = query('SELECT * FROM companies WHERE active = 1')
 *   run('INSERT INTO companies (name, province) VALUES (?, ?)', ['Acme', 'AB'])
 */

const OPFS_FILENAME = 'masterdb.sqlite'

let _db   = null
let _SQL  = null
let _saving = false

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export async function initDB() {
  if (_db) return _db

  if (typeof initSqlJs === 'undefined') {
    throw new Error('sql.js not loaded. Check the CDN script tag in index.html.')
  }

  _SQL = await initSqlJs({
    locateFile: f => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${f}`
  })

  const existing = await loadFromOPFS()
  _db = existing ? new _SQL.Database(existing) : new _SQL.Database()

  return _db
}

export function getDB() {
  if (!_db) throw new Error('DB not initialized. Call initDB() first.')
  return _db
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Run a SELECT and return all rows as plain objects.
 */
export function query(sql, params = []) {
  const db   = getDB()
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

/**
 * Run a single-row SELECT. Returns the first row or null.
 */
export function queryOne(sql, params = []) {
  const rows = query(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/**
 * Execute a write statement (INSERT / UPDATE / DELETE).
 * Schedules an async OPFS save after each mutation.
 */
export function run(sql, params = []) {
  getDB().run(sql, params)
  scheduleSave()
}

/**
 * Execute multiple statements in a transaction.
 * @param {function} fn — receives { query, run } and executes statements
 */
export function transaction(fn) {
  const db = getDB()
  db.run('BEGIN')
  try {
    fn({ query, run: (sql, params) => db.run(sql, params) })
    db.run('COMMIT')
    scheduleSave()
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }
}

/**
 * Return the last inserted row ID.
 */
export function lastInsertId() {
  const row = queryOne('SELECT last_insert_rowid() AS id')
  return row?.id ?? null
}

// ---------------------------------------------------------------------------
// OPFS persistence
// ---------------------------------------------------------------------------

function scheduleSave() {
  if (_saving) return
  _saving = true
  // Debounce — save at most once per animation frame batch
  setTimeout(async () => {
    try {
      await saveToOPFS()
    } catch (e) {
      console.error('OPFS save failed:', e)
    } finally {
      _saving = false
    }
  }, 100)
}

export async function saveToOPFS() {
  const data = getDB().export()
  const root = await navigator.storage.getDirectory()
  const fh   = await root.getFileHandle(OPFS_FILENAME, { create: true })
  const w    = await fh.createWritable()
  await w.write(data)
  await w.close()
}

async function loadFromOPFS() {
  try {
    const root = await navigator.storage.getDirectory()
    const fh   = await root.getFileHandle(OPFS_FILENAME)
    const file = await fh.getFile()
    return new Uint8Array(await file.arrayBuffer())
  } catch {
    return null   // file doesn't exist yet — fresh database
  }
}

/**
 * Export the database as a downloadable file (backup).
 */
export function exportDB() {
  const data = getDB().export()
  const blob = new Blob([data], { type: 'application/octet-stream' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `masterdb-backup-${new Date().toISOString().slice(0, 10)}.sqlite`
  a.click()
  URL.revokeObjectURL(url)
}
