import { query, queryOne, run, lastInsertId } from './sqlite.js'

export function getAllCompanies() {
  return query(`
    SELECT c.*,
      (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.company_id AND e.status = 'active') AS employee_count,
      (SELECT MAX(t.test_date) FROM tests t
         JOIN employees e ON e.employee_id = t.employee_id
        WHERE e.company_id = c.company_id) AS last_test_date
    FROM companies c
    WHERE c.active = 1
    ORDER BY c.name ASC
  `)
}

export function getCompany(companyId) {
  return queryOne('SELECT * FROM companies WHERE company_id = ?', [companyId])
}

export function searchCompanies(q) {
  const like = `%${q}%`
  return query(`
    SELECT c.*,
      (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.company_id AND e.status = 'active') AS employee_count
    FROM companies c
    WHERE c.active = 1 AND (c.name LIKE ? OR c.province LIKE ? OR c.contact_name LIKE ?)
    ORDER BY c.name ASC
  `, [like, like, like])
}

export function createCompany(data) {
  run(`INSERT INTO companies
    (name, province, address, contact_name, contact_phone, contact_email, sticky_notes, hpd_inventory)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.province, data.address ?? null, data.contact_name ?? null,
     data.contact_phone ?? null, data.contact_email ?? null, data.sticky_notes ?? null,
     JSON.stringify(data.hpd_inventory ?? [])]
  )
  return lastInsertId()
}

export function updateCompany(companyId, data) {
  run(`UPDATE companies SET
    name = ?, province = ?, address = ?, contact_name = ?, contact_phone = ?,
    contact_email = ?, sticky_notes = ?, hpd_inventory = ?, updated_at = datetime('now')
    WHERE company_id = ?`,
    [data.name, data.province, data.address ?? null, data.contact_name ?? null,
     data.contact_phone ?? null, data.contact_email ?? null, data.sticky_notes ?? null,
     JSON.stringify(data.hpd_inventory ?? []), companyId]
  )
}

export function deactivateCompany(companyId) {
  run(`UPDATE companies SET active = 0, updated_at = datetime('now') WHERE company_id = ?`, [companyId])
}

export function getHPDInventory(companyId) {
  const row = queryOne('SELECT hpd_inventory FROM companies WHERE company_id = ?', [companyId])
  try { return JSON.parse(row?.hpd_inventory ?? '[]') } catch { return [] }
}

export function saveHPDInventory(companyId, inventory) {
  run(`UPDATE companies SET hpd_inventory = ?, updated_at = datetime('now') WHERE company_id = ?`,
    [JSON.stringify(inventory), companyId])
}
